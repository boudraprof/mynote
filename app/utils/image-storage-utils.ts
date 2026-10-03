// ---------------------------------------------------------------------------
// Constants & types shared by client and server
// ---------------------------------------------------------------------------

/** Max raw file size before processing (10 MB) */
export const MAX_RAW_FILE_SIZE = 10 * 1024 * 1024

/** Allowed MIME types for upload */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const

/** Supported image sub-directories (Cloudinary folders) */
export const UPLOAD_TYPES = ['notes', 'avatars', 'drawings'] as const
export type UploadType = (typeof UPLOAD_TYPES)[number]

/** Thumbnail sizes per upload type */
export const THUMBNAIL_SIZES: Record<UploadType, { width: number; height: number } | null> = {
  notes: { width: 400, height: 300 },
  avatars: { width: 96, height: 96 },
  drawings: null, // no thumbnail for drawings
}

// ---------------------------------------------------------------------------
// Magic bytes validation
// ---------------------------------------------------------------------------

/**
 * Detects the MIME type of an image buffer from its magic bytes.
 * Returns `null` when the bytes don't match a known image format.
 *
 * Used to validate uploads regardless of what the client reports — the MIME
 * type sent by React Native's `FormData` is unreliable, and base64 uploads
 * carry no MIME metadata at all.
 */
export function detectImageMime(buffer: Uint8Array): string | null {
  if (buffer.length < 4) return null

  // JPEG: starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG: starts with 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  // GIF: starts with "GIF87a" or "GIF89a"
  if (buffer.length >= 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    if (buffer[3] === 0x38 && buffer[4] === 0x37 && buffer[5] === 0x61) return 'image/gif'
    if (buffer[3] === 0x38 && buffer[4] === 0x39 && buffer[5] === 0x61) return 'image/gif'
  }

  // WebP: starts with "RIFF" + 4 bytes size + "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // 'R'
    buffer[1] === 0x49 && // 'I'
    buffer[2] === 0x46 && // 'F'
    buffer[3] === 0x46 && // 'F'
    buffer[8] === 0x57 && // 'W'
    buffer[9] === 0x45 && // 'E'
    buffer[10] === 0x42 && // 'B'
    buffer[11] === 0x50 // 'P'
  ) {
    return 'image/webp'
  }

  // AVIF: ISO-BMFF container starting with an ftyp box branded "avif"
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 && // 'f'
    buffer[5] === 0x74 && // 't'
    buffer[6] === 0x79 && // 'y'
    buffer[7] === 0x70 && // 'p'
    buffer[8] === 0x61 && // 'a'
    buffer[9] === 0x76 && // 'v'
    buffer[10] === 0x69 && // 'i'
    buffer[11] === 0x66 // 'f'
  ) {
    return 'image/avif'
  }

  return null
}

/**
 * Validates a file by checking its magic bytes (first 4–12 bytes).
 * Returns `true` if the buffer looks like a known image type.
 */
export function isValidImageMagicBytes(buffer: Uint8Array): boolean {
  return detectImageMime(buffer) !== null
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ImageSaveResult {
  /** Full-size image URL (e.g. Cloudinary secure URL) */
  url: string
  /** Thumbnail URL (null if type has no thumbnail, e.g. drawings) */
  thumbnailUrl: string | null
  /** Original filename provided by the user */
  originalName: string
  /** File size in bytes of the uploaded image */
  size: number
  /** MIME type of the stored file */
  mime: string
  /** Width of the image in pixels */
  width: number
  /** Height of the image in pixels */
  height: number
}

export interface SaveImageOptions {
  /** Buffer of the raw uploaded file */
  buffer: Buffer
  /** Original filename from the upload */
  originalName?: string
  /** Type of upload (determines Cloudinary folder and thumbnail size) */
  type?: UploadType
  /** Ignored with Cloudinary — transformations are applied via URL params */
  maxWidth?: number
  /** Ignored with Cloudinary — format & quality are handled via URL params */
  quality?: number
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class ImageStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageStorageError'
  }
}
