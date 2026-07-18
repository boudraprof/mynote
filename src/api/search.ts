import type { ApiNote, ApiResponse } from './types'
import api from '@/lib/api'

export interface SearchParams {
  q: string
  limit?: number
  offset?: number
}

export async function searchNotes(
  params: SearchParams,
): Promise<ApiResponse<Array<ApiNote>>> {
  const { data } = await api.get('/search', { params })
  return data
}
