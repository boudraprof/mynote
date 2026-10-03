import * as cloudinaryImpl from './image-storage-cloudinary'
import * as localImpl from './image-storage-local'
import { isCloudinaryConfigured } from '@/utils/cloudinary'

// ---------------------------------------------------------------------------
// Re-export shared types & constants (safe for client code)
// ---------------------------------------------------------------------------

export {
  MAX_RAW_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  UPLOAD_TYPES,
  THUMBNAIL_SIZES,
  detectImageMime,
  isValidImageMagicBytes,
  ImageStorageError,
  type UploadType,
  type ImageSaveResult,
  type SaveImageOptions,
} from '@/utils/image-storage-utils'

// ---------------------------------------------------------------------------
// Choose backend: Cloudinary when configured, otherwise local sharp+fs
// ---------------------------------------------------------------------------

const useCloudinary = isCloudinaryConfigured()

if (!useCloudinary) {
  console.warn(
    '[image-storage] Cloudinary not configured — using local filesystem storage via sharp. ' +
    'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable Cloudinary.',
  )
}

const impl = useCloudinary ? cloudinaryImpl : localImpl

export const saveImage = impl.saveImage
export const deleteImage = impl.deleteImage
export const readImage = impl.readImage
