import { describe, expect, it } from 'vitest'

import { toAbsoluteImageSrc, toProxiedImageSrc } from './image-url'

const HOST = 'https://mynote-demo.vercel.app'

describe('toProxiedImageSrc', () => {
  it('leaves proxy paths untouched', () => {
    expect(toProxiedImageSrc('/api/v1/images/notes/a.webp')).toBe(
      '/api/v1/images/notes/a.webp',
    )
  })

  it('leaves local uploads untouched', () => {
    expect(toProxiedImageSrc('/uploads/notes/a.webp')).toBe(
      '/uploads/notes/a.webp',
    )
  })

  it('rewrites legacy ImageKit URLs through the proxy, dropping the account id', () => {
    expect(
      toProxiedImageSrc('https://ik.imagekit.io/o3cdqjent/notes/a.webp'),
    ).toBe('/api/v1/images/notes/a.webp')
  })

  it('keeps image transform params', () => {
    expect(
      toProxiedImageSrc('https://ik.imagekit.io/o3cdqjent/notes/a.webp?tr=w-400'),
    ).toBe('/api/v1/images/notes/a.webp?tr=w-400')
  })

  it('passes data, blob and empty sources through unchanged', () => {
    expect(toProxiedImageSrc('data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA',
    )
    expect(toProxiedImageSrc('blob:http://localhost/x')).toBe(
      'blob:http://localhost/x',
    )
    expect(toProxiedImageSrc(null)).toBe('')
    expect(toProxiedImageSrc(undefined)).toBe('')
    expect(toProxiedImageSrc('')).toBe('')
  })
})

describe('toAbsoluteImageSrc', () => {
  it('absolutises root-relative paths for React Native', () => {
    expect(toAbsoluteImageSrc('/uploads/notes/a.webp')).toBe(
      `${HOST}/uploads/notes/a.webp`,
    )
    expect(toAbsoluteImageSrc('/api/v1/images/notes/a.webp')).toBe(
      `${HOST}/api/v1/images/notes/a.webp`,
    )
  })

  it('routes absolute http(s) sources through the proxy before prefixing', () => {
    // Mirrors the web helper: the account id is dropped, everything else
    // becomes an auth-gated proxy path.
    expect(toAbsoluteImageSrc('https://example.com/a.png')).toBe(
      `${HOST}/api/v1/images/a.png`,
    )
  })

  it('keeps absolute sources with no pathable file unchanged', () => {
    expect(toAbsoluteImageSrc('https://example.com')).toBe(
      'https://example.com',
    )
  })

  it('leaves local file sources untouched', () => {
    expect(toAbsoluteImageSrc('file:///data/user/0/cache/x.jpg')).toBe(
      'file:///data/user/0/cache/x.jpg',
    )
  })

  it('returns an empty string when there is no image', () => {
    expect(toAbsoluteImageSrc(null)).toBe('')
  })
})
