import { v2 as cloudinary } from 'cloudinary'

/**
 * Configure Cloudinary only when all required env vars are present.
 * Called lazily to avoid errors when Cloudinary isn't set up.
 */
function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME 
  const apiKey = process.env.CLOUDINARY_API_KEY 
  const apiSecret = process.env.CLOUDINARY_API_SECRET 

  // if (!cloudName || !apiKey || !apiSecret) {
  //   throw new Error(
  //     'Cloudinary env vars missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
  //   )
  // }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })
}

export { cloudinary, ensureCloudinaryConfigured }

/**
 * Returns true when all three Cloudinary env vars are set.
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

/**
 * Derive a Cloudinary public ID from an upload URL.
 * Example URL: https://res.cloudinary.com/demo/image/upload/v123/notes/uuid
 * Public ID:   notes/uuid
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // Cloudinary URLs have the public ID after /upload/v{version}/
    // e.g. /image/upload/v1234/notes/uuid → notes/uuid
    const segments = u.pathname.split('/')
    const uploadIndex = segments.findIndex((s) => s === 'upload')
    if (uploadIndex === -1 || uploadIndex + 2 >= segments.length) return null
    return segments.slice(uploadIndex + 2).join('/')
  } catch {
    return null
  }
}
