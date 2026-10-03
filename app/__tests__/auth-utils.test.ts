import { describe, expect, it } from 'vitest'

// Test the email template generation (extracted from auth.ts for testing)
function emailShell(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px"><h2>${title}</h2>${body}<p style="color:#888;font-size:12px">My Notes</p></body></html>`
}

function verificationEmail(url: string) {
  return emailShell(
    'Verify your email',
    `<p>Thanks for signing up. Please confirm your email address:</p><p><a href="${url}">Verify email address</a></p>`,
  )
}

function resetPasswordEmail(url: string) {
  return emailShell(
    'Reset your password',
    `<p>We received a request to reset your password. This link expires in 1 hour.</p><p><a href="${url}">Choose a new password</a></p>`,
  )
}

describe('Email Templates', () => {
  describe('emailShell', () => {
    it('creates valid HTML structure', () => {
      const result = emailShell('Test Title', '<p>Test body</p>')
      expect(result).toContain('<!doctype html>')
      expect(result).toContain('<html>')
      expect(result).toContain('<body')
      expect(result).toContain('<h2>Test Title</h2>')
      expect(result).toContain('<p>Test body</p>')
      expect(result).toContain('</body></html>')
    })

    it('includes app branding', () => {
      const result = emailShell('Title', 'Body')
      expect(result).toContain('My Notes')
    })
  })

  describe('verificationEmail', () => {
    it('contains verification link', () => {
      const url = 'https://example.com/verify?token=abc123'
      const result = verificationEmail(url)
      expect(result).toContain(url)
      expect(result).toContain('Verify email address')
    })

    it('has correct subject context', () => {
      const result = verificationEmail('https://example.com')
      expect(result).toContain('Verify your email')
    })
  })

  describe('resetPasswordEmail', () => {
    it('contains reset link', () => {
      const url = 'https://example.com/reset?token=xyz789'
      const result = resetPasswordEmail(url)
      expect(result).toContain(url)
      expect(result).toContain('Choose a new password')
    })

    it('mentions expiration', () => {
      const result = resetPasswordEmail('https://example.com')
      expect(result).toContain('expires in 1 hour')
    })
  })
})

describe('URL Validation', () => {
  const validUrls = [
    'https://example.com',
    'http://localhost:3000',
    'https://my-app.example.com/path?query=value',
    'data:image/png;base64,iVBOR...',
    'blob:http://localhost:3000/abc-123',
  ]

  const invalidUrls = [
    'javascript:alert(1)',
    'file:///etc/passwd',
    'ftp://example.com',
    '',
  ]

  const urlPattern = /^https?:\/\/|^data:|^blob:/

  validUrls.forEach((url) => {
    it(`should accept: ${url.substring(0, 40)}...`, () => {
      expect(urlPattern.test(url)).toBe(true)
    })
  })

  invalidUrls.forEach((url) => {
    it(`should reject: ${url || '(empty)'}`, () => {
      expect(urlPattern.test(url)).toBe(false)
    })
  })
})
