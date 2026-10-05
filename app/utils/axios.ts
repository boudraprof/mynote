import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: `${(process.env.APP_URL || process.env.NEXT_PUBLIC_API_URL) ?? 'http://localhost:3000'}/api/v1` ,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  proxy: false,
  withCredentials: true, // important for better-auth cookies
})

const setAuthToken = async (config: InternalAxiosRequestConfig) => {
  // Server only
  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers')
    const { auth } = await import('./auth')
    
    // Convert Next cookies to Headers for better-auth
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()
    
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }) as HeadersInit,
    })

    if (session?.session.token) {
      config.headers.set('Authorization', `Bearer ${session.session.token}`)
    }
  }
  // Client: do nothing - cookie is sent automatically (withCredentials)
  return config
}

api.interceptors.request.use(async (config) => {
  await setAuthToken(config)
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof document !== 'undefined') {
        const { authClient } = await import('@/utils/auth-client')
        await authClient.signOut()
        window.location.href = '/auth/signin'
      }
    }
    return Promise.reject(error)
  }
)

export default api
