const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.122.1:3000'
const API_BASE_PATH = process.env.EXPO_PUBLIC_API_BASE_PATH ?? 'v1/api'

export const config = {
  apiUrl: API_URL,
  apiBasePath: API_BASE_PATH,
  apiBaseUrl: `${API_URL}/${API_BASE_PATH}`,
} as const
