import type { ApiResult } from './types'
import api from '@/lib/api'

export interface Label {
  id: string
  name: string
}

export async function getLabels(): Promise<{ data: Label[] }> {
  const { data } = await api.get('/labels')
  return data
}

export async function createLabel(
  name: string,
): Promise<ApiResult & { data?: Label }> {
  const { data } = await api.post('/labels', { name })
  return data
}

export async function updateLabel(
  id: string,
  name: string,
): Promise<ApiResult & { data?: Label }> {
  const { data } = await api.put('/labels', { id, name })
  return data
}

export async function deleteLabel(id: string): Promise<ApiResult> {
  const { data } = await api.delete('/labels', { params: { id } })
  return data
}
