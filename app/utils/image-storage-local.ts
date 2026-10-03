import {
  readFile as fsReadFile,
  mkdir,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import type {
  ImageSaveResult,
  SaveImageOptions,
  UploadType,
} from '@/utils/image-storage-utils'
import logger from '@/utils/logger'

import {
  ImageStorageError,
  isValidImageMagicBytes,
} from '@/utils/image-storage-utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads')

/** Max size for WebP output (2 MB) */
const MAX_OUTPUT_SIZE = 2 * 1024 * 1024

/** Thumbnail sizes per upload type */
const THUMBNAIL_SIZES_LOCAL: Record<
  UploadType,
  { width: number; height: number } | null
> = {
  notes: { width: 400, height: 300 },
  avatars: { width: 96, height: 96 },
  drawings: null,
}

const DEFAULT_MAX_WIDTH: Record<UploadType, number> = {
  notes: 1920,
  avatars: 256,
  drawings: 1920,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeDir(type: UploadType): string {
  return path.join(UPLOAD_BASE_DIR, type)
}

function getThumbDir(type: UploadType): string {
  return path.join(UPLOAD_BASE_DIR, type, '.thumbnails')
}

function generateFilename(): string {
  return `${crypto.randomUUID()}.webp`
}

// ---------------------------------------------------------------------------
// saveImage — local sharp-based implementation
// ---------------------------------------------------------------------------

export async function saveImage(
  options: SaveImageOptions,
): Promise<ImageSaveResult> {
  const {
    buffer,
    originalName = 'image',
    type = 'notes',
    quality = 80,
  } = options

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH[type]

  // 1. Validate magic bytes
  if (!isValidImageMagicBytes(new Uint8Array(buffer))) {
    throw new ImageStorageError(
      'Invalid image file: magic bytes do not match any known image format',
    )
  }

  // 2. Ensure directories exist
  const typeDir = getTypeDir(type)
  if (!existsSync(typeDir)) {
    await mkdir(typeDir, { recursive: true })
  }

  const thumbDir = getThumbDir(type)
  if (THUMBNAIL_SIZES_LOCAL[type] && !existsSync(thumbDir)) {
    await mkdir(thumbDir, { recursive: true })
  }

  // 3. Optimize image: resize, convert to WebP
  const filename = generateFilename()
  const filepath = path.join(typeDir, filename)

  let pipeline = sharp(buffer)
    .rotate() // auto-rotate based on EXIF orientation
    .webp({ quality })

  // Resize if image is wider than maxWidth (preserve aspect ratio)
  const metadata = await sharp(buffer).metadata()
  if (metadata.width && metadata.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true })
  }

  const outputBuffer = await pipeline.toBuffer()

  // Size check: limit output file size
  if (outputBuffer.length > MAX_OUTPUT_SIZE) {
    // Re-encode with lower quality
    const smallerBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: Math.min(maxWidth, 1200), withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer()

    if (smallerBuffer.length > MAX_OUTPUT_SIZE) {
      throw new ImageStorageError(
        `Image too large after compression (${(smallerBuffer.length / 1024 / 1024).toFixed(1)} MB). Please upload a smaller image.`,
      )
    }

    await writeFile(filepath, smallerBuffer)
  } else {
    await writeFile(filepath, outputBuffer)
  }

  // 4. Generate thumbnail (if configured for this type)
  let thumbnailUrl: string | null = null
  const thumbSize = THUMBNAIL_SIZES_LOCAL[type]
  if (thumbSize) {
    const thumbFilename = filename
    const thumbPath = path.join(thumbDir, thumbFilename)

    await sharp(buffer)
      .rotate()
      .resize({
        width: thumbSize.width,
        height: thumbSize.height,
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 70 })
      .toFile(thumbPath)

    thumbnailUrl = `/uploads/${type}/.thumbnails/${thumbFilename}`
  }

  // 5. Get final dimensions
  const finalMetadata = await sharp(filepath).metadata()

  return {
    url: `/uploads/${type}/${filename}`,
    thumbnailUrl,
    originalName,
    size: outputBuffer.length,
    mime: 'image/webp',
    width: finalMetadata.width ?? 0,
    height: finalMetadata.height ?? 0,
  }
}

// ---------------------------------------------------------------------------
// deleteImage — local fs-based implementation
// ---------------------------------------------------------------------------

export async function deleteImage(
  imageUrl: string | null | undefined,
): Promise<void> {
  if (!imageUrl) return

  try {
    const relativePath = imageUrl.replace(/^\/uploads\//, '')
    const filepath = path.join(UPLOAD_BASE_DIR, relativePath)

    // Delete main file
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    // Delete thumbnail if it exists
    const parts = relativePath.split('/')
    if (parts.length >= 2) {
      const type = parts[0]!
      const filename = parts[parts.length - 1]!
      const thumbPath = path.join(
        UPLOAD_BASE_DIR,
        type,
        '.thumbnails',
        filename,
      )
      if (existsSync(thumbPath)) {
        await unlink(thumbPath)
      }
    }
  } catch (error) {
    logger.error(
      `Failed to delete image file: ${imageUrl}`,
      error,
      'ImageStorage',
    )
  }
}

// ---------------------------------------------------------------------------
// readImage — local fs-based implementation
// ---------------------------------------------------------------------------

export async function readImage(
  imageUrl: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const relativePath = imageUrl.replace(/^\/uploads\//, '')
  const filepath = path.join(UPLOAD_BASE_DIR, relativePath)

  if (!existsSync(filepath)) return null

  const buffer = await fsReadFile(filepath)
  const ext = path.extname(filepath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  }

  return { buffer, mime: mimeMap[ext] ?? 'application/octet-stream' }
}
