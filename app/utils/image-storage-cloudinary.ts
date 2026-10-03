import crypto from 'node:crypto'
import type {ImageSaveResult, SaveImageOptions} from '@/utils/image-storage-utils';
import { cloudinary, ensureCloudinaryConfigured, publicIdFromUrl } from '@/utils/cloudinary'
import logger from '@/utils/logger'

import {
  
  ImageStorageError,
  
  THUMBNAIL_SIZES,
  isValidImageMagicBytes
} from '@/utils/image-storage-utils'

// Ensure Cloudinary is configured before any operations run.
ensureCloudinaryConfigured()

/**
 * Upload an image buffer to Cloudinary.
 *
 * The raw buffer is uploaded as-is; all transformations (resize, format,
 * quality) are applied on-the-fly via Cloudinary URL parameters when the
 * image is served, so no local processing is needed.
 */
export async function saveImage(
  options: SaveImageOptions,
): Promise<ImageSaveResult> {
  const {
    buffer,
    originalName = 'image',
    type = 'notes',
  } = options

  // 1. Validate magic bytes before uploading
  if (!isValidImageMagicBytes(new Uint8Array(buffer))) {
    throw new ImageStorageError('Invalid image file: magic bytes do not match any known image format')
  }

  // 2. Generate a unique public ID
  const publicId = `${type}/${crypto.randomUUID()}`

  // 3. Upload to Cloudinary
  const result = await new Promise<{
    secure_url: string
    bytes: number
    width: number
    height: number
    format: string
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        folder: '', // already part of public_id
        use_filename: false,
        unique_filename: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(new ImageStorageError(`Cloudinary upload failed: ${error.message}`))
        } else if (!uploadResult) {
          reject(new ImageStorageError('Cloudinary upload returned empty result'))
        } else {
          resolve({
            secure_url: uploadResult.secure_url,
            bytes: uploadResult.bytes,
            width: uploadResult.width ?? 0,
            height: uploadResult.height ?? 0,
            format: uploadResult.format ?? 'webp',
          })
        }
      },
    )

    uploadStream.end(buffer)
  })

  // 4. Build the thumbnail URL using Cloudinary URL transformations
  let thumbnailUrl: string | null = null
  const thumbSize = THUMBNAIL_SIZES[type]
  if (thumbSize) {
    thumbnailUrl = cloudinary.url(publicId, {
      transformation: [
        {
          width: thumbSize.width,
          height: thumbSize.height,
          crop: 'fill',
          gravity: 'center',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
      ],
      secure: true,
    })
  }

  return {
    url: result.secure_url,
    thumbnailUrl,
    originalName,
    size: result.bytes,
    mime: `image/${result.format}`,
    width: result.width,
    height: result.height,
  }
}

/**
 * Delete an image from Cloudinary by its URL.
 * Safe to call with null/undefined.
 */
export async function deleteImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return

  const publicId = publicIdFromUrl(imageUrl)
  if (!publicId) {
    logger.warn(`Could not extract Cloudinary public ID from URL: ${imageUrl}`, 'ImageStorage')
    return
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    if (result.result === 'ok') {
      logger.info(`Deleted image: ${publicId}`, 'ImageStorage')
    } else if (result.result === 'not found') {
      logger.warn(`Image not found on Cloudinary: ${publicId}`, 'ImageStorage')
    } else {
      logger.warn(`Cloudinary delete returned "${result.result}" for: ${publicId}`, 'ImageStorage')
    }
  } catch (error) {
    logger.error(`Failed to delete image: ${publicId}`, error, 'ImageStorage')
  }
}

/**
 * Not implemented for Cloudinary — images are served directly from Cloudinary.
 * Kept for API compatibility.
 */
export async function readImage(
  _imageUrl: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  return null
}
