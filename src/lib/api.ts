import axios from 'axios'
import { config } from './env'
import type { AxiosInstance } from 'axios'
import { authClient } from '@/lib/auth'

// eslint-disable-next-line import/no-named-as-default-member -- axios's types only expose a default export
const api: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (req) => {
  const cookie = await authClient.getCookie()
  if (cookie) {
    req.headers.set('Cookie', cookie)
  }
  return req
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authClient.signOut()
    }
    return Promise.reject(error)
  },
)

export default api
