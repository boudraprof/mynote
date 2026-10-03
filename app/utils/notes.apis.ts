import api from './axios'
import type { NotesInsert } from '../types'
import type { NoteStatusType } from '@/types'
import { NOTE_STATUS } from '@/utils/bgs-colors'

/**
 * Move a note between statuses (active / archived / trash) via a single PUT.
 * The server derives the status id from `statusName`.
 *
 * The pin flag travels with the status change so a restore brings back exactly
 * what the note looked like before it was trashed or archived. Moving to trash
 * drops the pin server-side regardless of what is sent here.
 */
export const setStatus = async (
  note: Pick<NotesInsert, 'id'> & Partial<Pick<NotesInsert, 'pinned'>>,
  statusName: NoteStatusType,
) => {
  const { data } = await api.put('/notes', {
    id: note.id,
    statusName,
    ...(note.pinned !== undefined && { pinned: note.pinned }),
  })
  return data
}

export const moveToTrash = (note: Pick<NotesInsert, 'id'>) =>
  setStatus(note, NOTE_STATUS.TRASH)
export const moveToArchive = (note: Pick<NotesInsert, 'id'>) =>
  setStatus(note, NOTE_STATUS.ARCHIVED)
export const restoreArchive = (note: Pick<NotesInsert, 'id'>) =>
  setStatus(note, NOTE_STATUS.ACTIVE)
export const restoreTrash = (note: Pick<NotesInsert, 'id'>) =>
  setStatus(note, NOTE_STATUS.ACTIVE)
