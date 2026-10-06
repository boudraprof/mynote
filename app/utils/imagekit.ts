import ImageKit from '@imagekit/nodejs'

let imagekitClient: ImageKit | null = null

/**
 * Configure ImageKit only when all required env vars are present.
 * Called lazily to avoid errors when ImageKit isn't set up.
 */
function ensureImageKitConfigured() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

  if (!privateKey || !urlEndpoint) {
    imagekitClient = null
    return
  }

  imagekitClient = new ImageKit({ privateKey })
}

export { imagekitClient as imagekit, ensureImageKitConfigured }

/**
 * Returns true when the ImageKit credentials are configured.
 */
export function isImageKitConfigured(): boolean {
  return !!(
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT
  )
}

export function getImageKitClient(): ImageKit | null {
  if (!imagekitClient) {
    ensureImageKitConfigured()
  }

  return imagekitClient
}

export function buildImageKitUrl(
  src: string,
  transformation?: Array<Record<string, unknown>>,
): string {
  const client = getImageKitClient()
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

  if (!client || !urlEndpoint) {
    return src
  }

  return client.helper.buildSrc({
    src,
    urlEndpoint,
    transformation,
  })
}

/**
 * Best-effort extraction of the ImageKit file path from a URL.
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.replace(/^\/+/, '')
    return pathname || null
  } catch {
    return null
  }
}
