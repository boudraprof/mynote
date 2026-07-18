import axios from 'axios'
import { config } from './env'
import type { AxiosInstance } from 'axios'
import { authClient } from '@/lib/auth'

const api: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (req) => {
  const cookie = authClient.getCookie()
  const headers = {
    Cookie: cookie,
  }
  req.headers.set(headers)
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
