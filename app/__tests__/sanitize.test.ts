import { describe, expect, it } from 'vitest'
import { sanitizeNoteHtml, stripNoteHtml } from '@/utils/sanitize'

describe('XSS Prevention', () => {
  const xssVectors = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
    '<details open ontoggle=alert(1)>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  ]

  xssVectors.forEach((vector) => {
    it(`should sanitize: ${vector.substring(0, 30)}...`, () => {
      const result = sanitizeNoteHtml(vector)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('onerror')
      expect(result).not.toContain('onload')
      expect(result).not.toContain('onfocus')
      expect(result).not.toContain('ontoggle')
      expect(result).not.toContain('javascript:')
    })
  })
})

describe('Allowed formatting', () => {
  it('preserves bold tags', () => {
    const result = sanitizeNoteHtml('<b>bold</b>')
    expect(result).toContain('<b>')
  })

  it('preserves italic tags', () => {
    const result = sanitizeNoteHtml('<i>italic</i>')
    expect(result).toContain('<i>')
  })

  it('preserves headings', () => {
    const result = sanitizeNoteHtml('<h1>Title</h1><h2>Subtitle</h2>')
    expect(result).toContain('<h1>')
    expect(result).toContain('<h2>')
  })

  it('preserves lists', () => {
    const result = sanitizeNoteHtml('<ul><li>Item</li></ul>')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>')
  })

  it('preserves links', () => {
    const result = sanitizeNoteHtml('<a href="https://example.com">Link</a>')
    expect(result).toContain('href=')
  })
})

describe('stripNoteHtml', () => {
  it('converts HTML to plain text', () => {
    const result = stripNoteHtml('<p>Hello <b>World</b></p>')
    expect(result).toBe('Hello World')
  })

  it('handles complex nested HTML', () => {
    const result = stripNoteHtml(`
      <h1>Title</h1>
      <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    `)
    expect(result).toContain('Title')
    expect(result).toContain('Paragraph with')
    expect(result).toContain('bold')
    expect(result).toContain('Item 1')
  })
})
