import { describe, expect, it } from 'vitest'
import { RETRY_BASE_MS, RETRY_MAX_MS, retryDelayMs } from './sync-retry'

describe('retryDelayMs', () => {
  it('starts at the base delay after the first failure', () => {
    expect(retryDelayMs(1)).toBe(RETRY_BASE_MS)
  })

  it('doubles on each consecutive failure', () => {
    expect(retryDelayMs(2)).toBe(RETRY_BASE_MS * 2)
    expect(retryDelayMs(3)).toBe(RETRY_BASE_MS * 4)
    expect(retryDelayMs(4)).toBe(RETRY_BASE_MS * 8)
  })

  it('caps at the max delay', () => {
    expect(retryDelayMs(100)).toBe(RETRY_MAX_MS)
    expect(retryDelayMs(10)).toBe(RETRY_MAX_MS)
  })

  it('treats invalid attempts as the base delay', () => {
    expect(retryDelayMs(0)).toBe(RETRY_BASE_MS)
    expect(retryDelayMs(-3)).toBe(RETRY_BASE_MS)
    expect(retryDelayMs(Number.NaN)).toBe(RETRY_BASE_MS)
  })
})
