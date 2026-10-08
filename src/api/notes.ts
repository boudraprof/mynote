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

/**
 * Server-side page size cap (`notesQuerySchema.limit` max is 100), so a full
 * export/merge has to walk `offset` instead of asking for a huge limit.
 */
export const NOTES_PAGE_SIZE = 100

const MAX_NOTE_PAGES = 200

export async function getNotes(params?: {
  field?: string
  limit?: number
  offset?: number
  label?: string
}): Promise<ApiResponse<ApiNote[]>> {
  const { data } = await api.get('/notes', { params })
  return data
}

/**
 * Fetch every note by paging through `/notes` with the capped limit.
 */
export async function getAllNotes(params?: {
  field?: string
  label?: string
}): Promise<ApiNote[]> {
  const all: ApiNote[] = []

  for (let page = 0; page < MAX_NOTE_PAGES; page++) {
    const result = await getNotes({
      ...params,
      limit: NOTES_PAGE_SIZE,
      offset: all.length,
    })
    const batch = result.data ?? []
    all.push(...batch)

    if (batch.length < NOTES_PAGE_SIZE || all.length >= result.total) break
  }

  return all
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
  const { data } = await api.post('/notes/copy', note)
  return data
}

export async function reorderNotes(items: ReorderItem[]): Promise<ApiResult> {
  const { data } = await api.post('/notes/reorder', items)
  return data
}
