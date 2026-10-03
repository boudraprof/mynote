import { describe, expect, it } from 'vitest'
import z from 'zod'
import {
  ALLOWED_MIME_TYPES,
  MAX_RAW_FILE_SIZE,
  detectImageMime,
  isValidImageMagicBytes,
} from '@/utils/image-storage'

// Real 1x1 transparent PNG
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// Same validation the upload route runs on the parsed File
const fileSchema = z
  .file()
  .max(MAX_RAW_FILE_SIZE, 'File must be < 10 MB')
  .mime(ALLOWED_MIME_TYPES as unknown as [string, ...Array<string>])

/**
 * Mirrors `parseUploadRequest` in `src/routes/v1.api.upload-image.ts` for the
 * base64 JSON body that the React Native app sends (RN FormData is not
 * compatible with the web implementation).
 */
function decodeMobileUpload(base64: string): File {
  const dataUrl = /^data:[^;,]+;base64,(.+)$/s.exec(base64)
  const rawBase64 = (dataUrl?.[1] ?? base64).replace(/\s+/g, '')

  const buffer = Buffer.from(rawBase64, 'base64')
  return new File([new Uint8Array(buffer)], 'mobile-upload', {
    type:
      detectImageMime(new Uint8Array(buffer)) ??
      'application/octet-stream',
  })
}

describe('detectImageMime', () => {
  it('detects PNG from magic bytes', () => {
    const bytes = new Uint8Array(Buffer.from(PNG_1X1_BASE64, 'base64'))
    expect(detectImageMime(bytes)).toBe('image/png')
  })

  it('detects JPEG from magic bytes', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(detectImageMime(bytes)).toBe('image/jpeg')
  })

  it('detects GIF87a and GIF89a', () => {
    expect(detectImageMime(new TextEncoder().encode('GIF87a'))).toBe('image/gif')
    expect(detectImageMime(new TextEncoder().encode('GIF89a'))).toBe('image/gif')
  })

  it('detects WebP', () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ])
    expect(detectImageMime(webp)).toBe('image/webp')
  })

  it('returns null for unknown bytes', () => {
    expect(detectImageMime(new Uint8Array([1, 2, 3, 4]))).toBeNull()
    expect(detectImageMime(new Uint8Array())).toBeNull()
  })
})

describe('mobile base64 upload path', () => {
  it('accepts a valid base64 image', () => {
    const file = decodeMobileUpload(PNG_1X1_BASE64)
    expect(file.type).toBe('image/png')
    const parsed = fileSchema.parse(file)
    expect(parsed.size).toBe(Buffer.from(PNG_1X1_BASE64, 'base64').length)
  })

  it('accepts a data URL payload', () => {
    const file = decodeMobileUpload(`data:image/png;base64,${PNG_1X1_BASE64}`)
    expect(file.type).toBe('image/png')
    expect(fileSchema.safeParse(file).success).toBe(true)
  })

  it('rejects garbage base64 (falls back to octet-stream, fails MIME check)', () => {
    const file = decodeMobileUpload('bm90IGFuIGltYWdl')
    expect(file.type).toBe('application/octet-stream')
    expect(fileSchema.safeParse(file).success).toBe(false)
  })

  it('rejects a fake MIME claim when bytes are not an image', () => {
    const buffer = Buffer.from('bm90IGFuIGltYWdl', 'base64') // "not an image"

    // Bytes don't lie: no MIME is detected, so the route falls back to the
    // client's claimed MIME type…
    expect(detectImageMime(new Uint8Array(buffer))).toBeNull()
    const file = new File([new Uint8Array(buffer)], 'mobile-upload', {
      type: 'image/png',
    })

    // …which passes zod's MIME check…
    expect(fileSchema.safeParse(file).success).toBe(true)

    // …but is stopped by the storage layer's magic-byte validation.
    expect(isValidImageMagicBytes(new Uint8Array(buffer))).toBe(false)
  })
})
