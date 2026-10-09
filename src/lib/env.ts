const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://mynote-demo.vercel.app'
const API_BASE_PATH = process.env.EXPO_PUBLIC_API_BASE_PATH ?? 'api/v1'

export const config = {
  apiUrl: API_URL,
  apiBasePath: API_BASE_PATH,
  apiBaseUrl: `${API_URL}/${API_BASE_PATH}`,
} as const
