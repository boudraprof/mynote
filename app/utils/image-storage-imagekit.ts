import crypto from 'node:crypto'
import ImageKit, { toFile } from '@imagekit/nodejs'
import type { ImageSaveResult, SaveImageOptions } from '@/utils/image-storage-utils'
import {
  ImageStorageError,
  THUMBNAIL_SIZES,
  isValidImageMagicBytes,
} from '@/utils/image-storage-utils'
import logger from '@/utils/logger'
import {
  buildImageKitUrl,
  getImageKitClient,
  publicIdFromUrl,
} from '@/utils/imagekit'

/**
 * Upload an image buffer to ImageKit.
 */
export async function saveImage(
  options: SaveImageOptions,
): Promise<ImageSaveResult> {
  const {
    buffer,
    originalName = 'image',
    type = 'notes',
  } = options

  if (!isValidImageMagicBytes(new Uint8Array(buffer))) {
    throw new ImageStorageError(
      'Invalid image file: magic bytes do not match any known image format',
    )
  }

  const client = getImageKitClient()
  if (!client) {
    throw new ImageStorageError(
      'ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.',
    )
  }

  const fileName = `${type}/${crypto.randomUUID()}-${originalName.replace(/\s+/g, '_')}`
  const uploadFile = await toFile(buffer, fileName)

  const result = await client.files.upload({
    file: uploadFile,
    fileName,
    folder: `/${type}`,
    useUniqueFileName: false,
  })

  const filePath = result.filePath ?? `/${type}/${fileName}`
  const cleanFilePath = filePath.replace(/^\/+/, '')

  // Serve images through the authenticated proxy so the ImageKit endpoint
  // and file path are never exposed to the client.
  const url = `/api/v1/images/${cleanFilePath}`

  let thumbnailUrl: string | null = null
  const thumbSize = THUMBNAIL_SIZES[type]
  if (thumbSize) {
    const trParams = buildImageKitUrl(`/${cleanFilePath}`, [
      {
        width: thumbSize.width,
        height: thumbSize.height,
        crop: 'at_max',
        quality: 'auto',
        format: 'auto',
      },
    ])
    const tr = trParams.split('?tr=')[1] ?? null
    thumbnailUrl = `/api/v1/images/${cleanFilePath}${tr ? `?tr=${encodeURIComponent(tr)}` : ''}`
  }

  return {
    url,
    thumbnailUrl,
    originalName,
    size: result.size ?? buffer.length,
    mime: 'image/webp',
    width: result.width ?? 0,
    height: result.height ?? 0,
  }
}

/**
 * Delete an image from ImageKit by URL or file path.
 * Safe to call with null/undefined.
 */
export async function deleteImage(
  imageUrl: string | null | undefined,
): Promise<void> {
  if (!imageUrl) return

  const client = getImageKitClient()
  if (!client) return

  // Support both proxy paths (/api/v1/images/...) stored by new uploads
  // and legacy absolute endpoint URLs.
  const proxyPath = imageUrl.match(/^\/api\/v1\/images\/(.+)$/)?.[1]
  const fileId = (proxyPath || publicIdFromUrl(imageUrl))?.replace(/^\/+/, '')
  if (!fileId) {
    logger.warn(`Could not extract ImageKit file path from URL: ${imageUrl}`)
    return
  }

  try {
    await client.files.delete(fileId)
    logger.info(`Deleted image: ${fileId}`, 'ImageStorage')
  } catch (error) {
    logger.error(`Failed to delete ImageKit file: ${imageUrl}`, error, 'ImageStorage')
  }
}

/**
 * Not implemented for ImageKit — images are served directly from ImageKit.
 * Kept for API compatibility.
 */
export async function readImage(
  _imageUrl: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  return null
}
