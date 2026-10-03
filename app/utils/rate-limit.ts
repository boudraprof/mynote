import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { rateLimit as rateLimitTable } from '@/db/schema'
import { db } from '@/utils/config'
import { corsJson } from '@/utils/cors'

/**
 * DB-backed rate limiter for our custom /v1/api routes.
 *
 * Better Auth's own limiter only covers the auth endpoints served by the
 * `/v1/api/$` splat, so the notes/labels/search/share/upload endpoints are
 * rate-limited here instead.
 *
 * Intentionally FAIL-OPEN: any DB error returns `null` (allow) so a
 * misconfigured limiter can never take the API offline.
 */
export async function checkRateLimit(
  request: Request,
  bucket: string,
  max: number,
  windowMs: number,
): Promise<Response | null> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    const rows = await db
      .select({
        count: rateLimitTable.count,
        lastRequest: rateLimitTable.lastRequest,
      })
      .from(rateLimitTable)
      .where(eq(rateLimitTable.key, key))
      .limit(1)
    // Cast to allow `undefined` — without `noUncheckedIndexedAccess` TS infers
    // the row as always-present, but at runtime a missing row is expected.
    const row = rows[0]

    if (!row || Number(row.lastRequest) < windowStart) {
      await db
        .insert(rateLimitTable)
        .values({ id: randomUUID(), key, count: 1, lastRequest: now })
        .onConflictDoUpdate({
          target: rateLimitTable.key,
          set: { count: 1, lastRequest: now },
        })
      return null
    }

    if (row.count >= max) {
      const retryAfter = Math.max(
        Math.ceil((Number(row.lastRequest) + windowMs - now) / 1000),
        1,
      )
      return corsJson(
        request,
        { error: true, message: 'Too many requests, please slow down.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    await db
      .update(rateLimitTable)
      .set({ count: row.count + 1, lastRequest: now })
      .where(eq(rateLimitTable.key, key))
    return null
  } catch {
    // Fail open — never block the API due to a rate-limit store error.
    return null
  }
}
