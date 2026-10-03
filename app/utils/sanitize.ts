import DOMPurify from 'dompurify'

/**
 * Strict allowlist: only formatting tags + links used by the RichTextEditor.
 * Strips scripts, event handlers, iframes, etc.
 *
 * Notes content is user-authored HTML, so anything we render back to the DOM
 * via `dangerouslySetInnerHTML` must be sanitized to prevent stored XSS
 * (e.g. an admin viewing another user's note, the mobile app, or any future
 * sharing feature).
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'strike',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
}

/**
 * Sanitize untrusted HTML for safe insertion into the DOM via
 * `dangerouslySetInnerHTML`.
 *
 * During SSR, `DOMPurify.sanitize` falls back to its no-DOM implementation
 * which still strips dangerous tags/attributes (it only needs a DOM for
 * complex cases). The output is safe-to-paste HTML.
 *
 * If sanitization ever throws, we fall back to
 * HTML-escaping the input so the worst case is degraded formatting, never an
 * XSS.
 */
export function sanitizeNoteHtml(
  html: string | null | undefined,
): string {
  if (!html) return ''
  try {
    return String(DOMPurify.sanitize(html, SANITIZE_CONFIG))
  } catch {
    return String(html)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;')
  }
}

/**
 * Preview sanitizer: returns safe plain text with tags removed. Used in lists/
 * cards where we don't need formatting but do need to avoid XSS in preview.
 */
export function stripNoteHtml(html: string | null | undefined): string {
  if (!html) return ''
  return sanitizeNoteHtml(html).replace(/<[^>]+>/g, '')
}
