import { describe, expect, it } from 'vitest'

import { htmlToPlainText, isHtmlContent } from '@/lib/html'

describe('htmlToPlainText', () => {
  it('strips tags', () => {
    expect(htmlToPlainText('<p>Hello <strong>world</strong></p>')).toBe(
      'Hello world',
    )
  })

  it('turns block elements into newlines', () => {
    expect(htmlToPlainText('<p>One</p><p>Two</p>')).toBe('One\nTwo')
    expect(htmlToPlainText('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb')
    expect(htmlToPlainText('Line 1<br>Line 2')).toBe('Line 1\nLine 2')
  })

  it('decodes common entities', () => {
    expect(htmlToPlainText('A &amp; B &nbsp; C')).toBe('A & B C')
    expect(htmlToPlainText('&#39;quoted&#39; &quot;x&quot;')).toBe(
      "'quoted' \"x\"",
    )
    expect(htmlToPlainText('&#65;&#x42;')).toBe('AB')
  })

  it('passes plain text through', () => {
    expect(htmlToPlainText('Just text')).toBe('Just text')
    expect(htmlToPlainText('5 < 6 and 6 > 5')).toBe('5 < 6 and 6 > 5')
  })

  it('handles null and empty input', () => {
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText(undefined)).toBe('')
    expect(htmlToPlainText('')).toBe('')
  })

  it('collapses whitespace and trims', () => {
    expect(htmlToPlainText('  a    b  ')).toBe('a b')
    expect(htmlToPlainText('<p>a</p>\n\n\n<p>b</p>')).toBe('a\nb')
  })
})

describe('isHtmlContent', () => {
  it('detects rich-text HTML', () => {
    expect(isHtmlContent('<p>hi</p>')).toBe(true)
    expect(isHtmlContent('plain')).toBe(false)
    expect(isHtmlContent(null)).toBe(false)
    expect(isHtmlContent('')).toBe(false)
  })
})
