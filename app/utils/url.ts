// import { env } from '@/utils/env'

const BASE_URL = process.env.BETTER_AUTH_BASE_URL as string

export function parseRequestSearchParams(request: Request): URLSearchParams {
  const url = request.url || ''
  const qs = url.includes('?') ? url.split('?')[1] : ''
  return new URLSearchParams(qs)
}

export function ensureAbsoluteUrl(url: string): string {
  if (!url) return BASE_URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export function requestUrl(request: Request): Request {
  try {
    const absoluteUrl = ensureAbsoluteUrl(request.url)
    return new Request(absoluteUrl, request)
  } catch {
    return request
  }
}
