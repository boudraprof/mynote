import * as imagekitImpl from './image-storage-imagekit'
import * as localImpl from './image-storage-local'
import { isImageKitConfigured } from '@/utils/imagekit'

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
// Choose backend: ImageKit when configured, otherwise local sharp+fs
// ---------------------------------------------------------------------------

const useImageKit = isImageKitConfigured()

if (!useImageKit) {
  console.warn(
    '[image-storage] ImageKit not configured — using local filesystem storage via sharp. ' +
    'Set IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT to enable ImageKit.',
  )
}

const impl = useImageKit ? imagekitImpl : localImpl

export const saveImage = impl.saveImage
export const deleteImage = impl.deleteImage
export const readImage = impl.readImage
