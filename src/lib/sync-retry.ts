/**
 * Exponential backoff for failed sync passes.
 *
 * Pure module (no react-native / expo imports) so it can be unit-tested.
 */

export const RETRY_BASE_MS = 2_000
export const RETRY_MAX_MS = 5 * 60 * 1_000

/**
 * Delay before the next retry after `attempt` consecutive failed sync
 * passes. Grows 2s → 4s → 8s … capped at `RETRY_MAX_MS`.
 */
export function retryDelayMs(attempt: number): number {
  if (!Number.isFinite(attempt) || attempt <= 0) return RETRY_BASE_MS
  return Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS)
}
