/**
 * Convert rich-text HTML (as produced by the web app's editor) into plain
 * text suitable for the mobile editor and note cards. Mobile only writes
 * plain text, so web-created notes are normalized to readable text here.
 */

const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&bull;': '•',
}

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''

  const hadHtml = isHtmlContent(html)

  // Block-level closing tags and line breaks become newlines so paragraphs
  // don't run together. Tag names must start with a letter or `/` so plain
  // text containing `<` or `>` (e.g. "5 < 6") is left alone.
  let text = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<[a-zA-Z/][^>]*>/g, '')

  // Decode named entities (only known ones, so typos are left alone).
  text = text.replace(/&[a-zA-Z]+;/g, (match) => NAMED_ENTITIES[match] ?? match)

  // Decode numeric entities (decimal and hex).
  text = text.replace(/&#(\d+);/g, (_, n: string) => {
    const code = Number(n)
    return Number.isSafeInteger(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : ''
  })
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => {
    const code = parseInt(h, 16)
    return Number.isSafeInteger(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : ''
  })

  // Collapse runs of spaces/tabs, but keep paragraph breaks.
  text = text.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n')

  // Newlines between HTML block elements are just source formatting, so
  // collapse them. Plain-text notes keep their intentional blank lines.
  if (hadHtml) {
    text = text.replace(/\n{2,}/g, '\n')
  }

  return text.trim()
}

/** True when the content looks like rich-text HTML (e.g. from the web app). */
export function isHtmlContent(content: string | null | undefined): boolean {
  return !!content && /<[a-z][^>]*>/i.test(content)
}
