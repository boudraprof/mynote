import type { ApiNote, ApiResponse, ApiResult } from './types'
import api from '@/lib/api'

export interface NoteInput {
  title?: string | null
  content?: string | null
  image?: string | null
  labels?: string[]
  statusId?: string
  pinned?: boolean
  position?: number
  checklist?: boolean
  checklistItems?: string | null
  palette?: string | null
  reminderAt?: string | null
}

export interface NoteUpdate extends NoteInput {
  id: string
  statusName?: string
}

export interface ReorderItem {
  id: string
  position: number
}

export async function getNotes(params?: {
  field?: string
  limit?: number
  offset?: number
  label?: string
}): Promise<ApiResponse<ApiNote[]>> {
  const { data } = await api.get('/notes', { params })
  return data
}

export async function getNoteById(id: string): Promise<{ data: ApiNote }> {
  const { data } = await api.get('/notes', { params: { id } })
  return data
}

export async function createNote(note: NoteInput): Promise<ApiResult> {
  const { data } = await api.post('/notes', note)
  return data
}

export async function updateNote(note: NoteUpdate): Promise<ApiResult> {
  const { data } = await api.put('/notes', note)
  return data
}

export async function deleteNote(id?: string): Promise<ApiResult> {
  const { data } = await api.delete('/notes', { params: { id } })
  return data
}

export async function copyNote(note: NoteInput): Promise<ApiResult> {
  const { data } = await api.post('/notes', { action: 'copy', data: note })
  return data
}

export async function reorderNotes(items: ReorderItem[]): Promise<ApiResult> {
  const { data } = await api.post('/notes', { action: 'reorder', data: items })
  return data
}
