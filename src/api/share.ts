import api from '@/lib/api'
import type { ApiResult } from './types'

export interface NoteShare {
  id: string
  email: string
  name: string | null
}

export interface ShareListResult {
  data: NoteShare[]
  error?: boolean
  message?: string
}

/**
 * List everyone a note is shared with (owner only).
 */
export async function getShares(noteId: string): Promise<ShareListResult> {
  const { data } = await api.get('/notes/share', { params: { noteId } })
  return data
}

/**
 * Share a note with another user by email. Creates the share and emails them.
 */
export async function shareNote(
  noteId: string,
  email: string,
): Promise<ApiResult & { data?: never }> {
  const { data } = await api.post('/notes/share', {
    noteId,
    email,
  })
  return data
}

/**
 * Remove a share (owner only). Unshares the email on this note.
 */
export async function removeShare(
  noteId: string,
  email: string,
): Promise<ApiResult> {
  const { data } = await api.delete('/notes/share', {
    data: { noteId, email },
  })
  return data
}
