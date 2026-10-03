/**
 * Note versioning and history tracking — server-backed.
 * Snapshots are stored in the `note_history` table via the
 * /v1/api/notes/history endpoints, so history follows the note across
 * devices (web + mobile).
 */

import api from '@/utils/axios'
import logger from '@/utils/logger'

export interface NoteVersion {
  id: string
  noteId: string
  title: string | null
  content: string | null
  checklistItems: string | null
  labels: Array<string>
  snapshot: Record<string, unknown>
  timestamp: string
  changeType: 'create' | 'update' | 'delete'
}

/** Minimal note shape the history API stores. */
export type NoteSnapshot = {
  id: string
  title?: string | null
  content?: string | null
  checklistItems?: string | null
  labels?: Array<string>
  pinned?: boolean
  checklist?: boolean
  palette?: string | null
  image?: string | null
  reminderAt?: Date | string | null
}

/**
 * Save a note version/snapshot. Never throws — history tracking must not
 * break the note-saving flow.
 */
export async function saveNoteVersion(
  note: NoteSnapshot,
  changeType: NoteVersion['changeType'] = 'update',
): Promise<void> {
  try {
    await api.post('/notes/history', {
      noteId: note.id,
      data: note,
      changeType,
    })
  } catch (error) {
    // Don't let history tracking break the app
    logger.warn('Failed to save note version', 'History')
  }
}

/**
 * Get all versions for a note (newest first, server-limited to 50).
 */
export async function getNoteVersions(noteId: string): Promise<Array<NoteVersion>> {
  try {
    const { data } = await api.get('/notes/history', { params: { noteId } })
    return data.data ?? []
  } catch (error) {
    logger.warn('Failed to fetch note versions', 'History')
    return []
  }
}

/**
 * Get a specific version by ID.
 */
export async function getNoteVersion(
  versionId: string,
): Promise<NoteVersion | null> {
  try {
    const { data } = await api.get('/notes/history', {
      params: { id: versionId },
    })
    return data.data ?? null
  } catch (error) {
    logger.warn('Failed to fetch note version', 'History')
    return null
  }
}

/**
 * Delete all versions for a note.
 */
export async function deleteNoteVersions(noteId: string): Promise<void> {
  try {
    await api.delete('/notes/history', { params: { noteId } })
  } catch (error) {
    logger.warn('Failed to clear note history', 'History')
  }
}

/**
 * Limit versions per note. The server already caps history at 50 per note,
 * so this is a no-op retained for API compatibility.
 */
export async function limitNoteVersions(
  _noteId: string,
  _maxVersions: number = 50,
): Promise<void> {
  /* server-side cap applies */
}

/**
 * Compare two versions and show diff
 */
export function compareVersions(
  older: NoteVersion,
  newer: NoteVersion,
): {
  titleChanged: boolean
  contentChanged: boolean
  labelsChanged: boolean
  changes: Array<string>
} {
  const changes: Array<string> = []

  const titleChanged = older.title !== newer.title
  const contentChanged = older.content !== newer.content
  const labelsChanged =
    JSON.stringify(older.labels) !== JSON.stringify(newer.labels)

  if (titleChanged) {
    changes.push('Title changed')
  }
  if (contentChanged) {
    changes.push('Content changed')
  }
  if (labelsChanged) {
    changes.push('Labels changed')
  }

  return {
    titleChanged,
    contentChanged,
    labelsChanged,
    changes,
  }
}

/**
 * Restore a note to a previous version
 */
export async function restoreNoteVersion(
  versionId: string,
): Promise<Record<string, unknown> | null> {
  const version = await getNoteVersion(versionId)
  if (!version) return null

  return version.snapshot
}
