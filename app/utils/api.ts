import { getServerSession } from '@/utils/session'
import { unauthorized } from '@/utils/server-only'
import { checkRateLimit } from '@/utils/rate-limit'


const API_RATE_MAX = 100
const API_RATE_WINDOW_MS = 60_000
const apiBucket = (request: Request) =>
  `api:${new URL(request.url).pathname}:${request.method}`

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>
>


export type RequireApiAuthResult =
  | { session: AuthSession; response: null }
  | { session: null; response: Response }

export async function requireApiAuth(
  request: Request,
): Promise<RequireApiAuthResult> {
  // Rate-limit before auth so unauthenticated abuse is also throttled.
  const limited = await checkRateLimit(
    request,
    apiBucket(request),
    API_RATE_MAX,
    API_RATE_WINDOW_MS,
  )
  if (limited) return { session: null, response: limited }

  const session = await getServerSession(request.headers)

  if (!session) {
    return { session: null, response: unauthorized(request) }
  }

  return { session, response: null }
}
