import { allowedOrigins } from '@/utils/env'

export const corsHeaders = (origin: string | null): Record<string, string> => {
  const o =
    origin && allowedOrigins.includes(origin)
      ? origin
      : (allowedOrigins[0] ?? '')
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export const withCors = (response: Response, request: Request): Response => {
  const origin = request.headers.get('origin')
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(key, value)
  }
  return response
}

export const corsJson = (
  request: Request,
  data: unknown,
  init?: ResponseInit,
): Response => {
  const origin = request.headers.get('origin')
  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value)
  }
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { ...init, headers })
}
