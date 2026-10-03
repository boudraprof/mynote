import { describe, expect, it } from 'vitest'
import { cn } from '@/utils'
import { sanitizeNoteHtml, stripNoteHtml } from '@/utils/sanitize'

// parseOrigins is defined in @/utils/env, not @/lib/utils
import { parseOrigins } from '@/utils/env'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    const showHidden = false
    const result = cn('base', showHidden && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toBe('base extra')
  })
})

describe('parseOrigins', () => {
  it('parses comma-separated origins', () => {
    const result = parseOrigins('http://localhost:3000,http://localhost:8080')
    expect(result).toEqual(['http://localhost:3000', 'http://localhost:8080'])
  })

  it('trims whitespace', () => {
    const result = parseOrigins('  http://a.com , http://b.com  ')
    expect(result).toEqual(['http://a.com', 'http://b.com'])
  })

  it('filters empty strings', () => {
    const result = parseOrigins('http://a.com,,http://b.com,')
    expect(result).toEqual(['http://a.com', 'http://b.com'])
  })

  it('returns empty array for empty input', () => {
    const result = parseOrigins('')
    expect(result).toEqual([])
  })
})

describe('sanitizeNoteHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    const result = sanitizeNoteHtml(input)
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>')
  })

  it('strips script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>'
    const result = sanitizeNoteHtml(input)
    expect(result).not.toContain('<script>')
    // DOMPurify strips the script content entirely, so alert won't be in output
    expect(result).not.toContain('alert')
    expect(result).toContain('<p>Hello</p>')
  })

  it('strips event handlers', () => {
    const input = '<p onclick="alert(1)">Click me</p>'
    const result = sanitizeNoteHtml(input)
    expect(result).not.toContain('onclick')
  })

  it('allows links with href', () => {
    const input = '<a href="https://example.com">Link</a>'
    const result = sanitizeNoteHtml(input)
    expect(result).toContain('href=')
  })

  it('returns empty string for null/undefined', () => {
    expect(sanitizeNoteHtml(null)).toBe('')
    expect(sanitizeNoteHtml(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(sanitizeNoteHtml('')).toBe('')
  })
})

describe('stripNoteHtml', () => {
  it('removes all HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    const result = stripNoteHtml(input)
    expect(result).toBe('Hello world')
  })

  it('handles nested tags', () => {
    const input = '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>'
    const result = stripNoteHtml(input)
    expect(result).toBe('Item 1Item 2')
  })
})
