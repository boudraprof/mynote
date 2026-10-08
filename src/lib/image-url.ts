import { config } from './env'

/**
 * Convert any stored image reference into an auth-gated proxy path.
 *
 * Mirrors the web app's `app/utils/image-url.ts` — keep both in sync.
 *
 * Stored values can be:
 * - `/api/v1/images/<path>` — auth-gated image proxy (new uploads)
 * - `/uploads/...` — local storage uploads (auth-gated `/uploads` route)
 * - Legacy absolute endpoints like `https://ik.imagekit.io/<id>/<folder>/<file>`
 * - `blob:` / `data:` / app-local paths (passed through unchanged)
 */
export function toProxiedImageSrc(src: string | null | undefined): string {
  if (!src) return ''
  if (
    src.startsWith('/api/v1/images/') ||
    src.startsWith('/uploads/') ||
    src.startsWith('/assets/')
  ) {
    return src
  }

  if (/^https?:\/\//.test(src)) {
    try {
      const parsed = new URL(src)
      const segments = parsed.pathname.split('/').filter(Boolean)
      // For ImageKit default endpoints the first path segment is the account
      // id (e.g. `o3cdqjent`) which is not part of the file path.
      if (segments.length > 1) segments.shift()
      const id = segments.join('/')
      if (id) {
        const tr = parsed.searchParams.get('tr')
        return `/api/v1/images/${id}${tr ? `?tr=${encodeURIComponent(tr)}` : ''}`
      }
    } catch {
      // fall through to return the source unchanged
    }
  }

  return src
}

/**
 * Absolute URL for React Native's image loader, which cannot resolve
 * root-relative paths. Non-relative sources (`data:`, `blob:`, `file://`,
 * already-absolute `http(s)://`) are returned untouched.
 */
export function toAbsoluteImageSrc(src: string | null | undefined): string {
  const proxied = toProxiedImageSrc(src)
  if (!proxied.startsWith('/')) return proxied
  return `${config.apiUrl}${proxied}`
}
