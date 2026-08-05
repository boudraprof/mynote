/**
 * Note versioning and history tracking for React Native.
 * Server-backed via /v1/api/notes/history so history follows the note
 * across devices, with a local SQLite fallback for offline use.
 */

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { noteHistory } from '@/db/schema'
import api from '@/lib/api'
import logger from './logger'

export interface NoteVersion {
  id: string
  noteId: string
  title: string | null
  content: string | null
  checklistItems: string | null
  labels: string[]
  snapshot: Record<string, unknown>
  timestamp: string
  changeType: 'create' | 'update' | 'delete'
}

function parseLabels(value: string | null): string[] {
  try {
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

function parseSnapshot(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function rowToVersion(row: typeof noteHistory.$inferSelect): NoteVersion {
  return {
    id: row.id,
    noteId: row.noteId,
    title: row.title,
    content: row.content,
    checklistItems: row.checklistItems,
    labels: parseLabels(row.labels),
    snapshot: parseSnapshot(row.snapshot),
    timestamp: row.timestamp,
    changeType: row.changeType as NoteVersion['changeType'],
  }
}

// ---------------------------------------------------------------------------
// Local SQLite fallback (offline)
// ---------------------------------------------------------------------------

async function saveLocalVersion(
  noteId: string,
  data: Record<string, unknown>,
  changeType: NoteVersion['changeType'],
): Promise<void> {
  const db = await getDb()
  const id = `version-${noteId}-${Date.now()}`
  const timestamp = new Date().toISOString()

  await db.insert(noteHistory).values({
    id,
    noteId,
    title: typeof data.title === 'string' ? data.title : null,
    content: typeof data.content === 'string' ? data.content : null,
    checklistItems:
      typeof data.checklistItems === 'string' ? data.checklistItems : null,
    labels: Array.isArray(data.labels) ? JSON.stringify(data.labels) : null,
    snapshot: JSON.stringify(data),
    timestamp,
    changeType,
  })

  // Limit versions per note (keep last 50)
  await limitLocalVersions(noteId, 50)
}

async function getLocalVersions(noteId: string): Promise<NoteVersion[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(noteHistory)
    .where(eq(noteHistory.noteId, noteId))
    .orderBy(noteHistory.timestamp)

  return rows
    .map(rowToVersion)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
}

async function getLocalVersion(versionId: string): Promise<NoteVersion | null> {
  const db = await getDb()
  const [row] = await db
    .select()
    .from(noteHistory)
    .where(eq(noteHistory.id, versionId))

  return row ? rowToVersion(row) : null
}

async function clearLocalVersions(noteId: string): Promise<void> {
  const db = await getDb()
  await db.delete(noteHistory).where(eq(noteHistory.noteId, noteId))
}

async function limitLocalVersions(
  noteId: string,
  maxVersions: number,
): Promise<void> {
  const versions = await getLocalVersions(noteId)
  if (versions.length <= maxVersions) return

  const db = await getDb()
  const toDelete = versions.slice(maxVersions)
  for (const version of toDelete) {
    await db.delete(noteHistory).where(eq(noteHistory.id, version.id))
  }
}

// ---------------------------------------------------------------------------
// Public API (server-first, local fallback)
// ---------------------------------------------------------------------------

/**
 * Save a note version/snapshot. Never throws — history tracking must not
 * break the note-saving flow.
 */
export async function saveNoteVersion(
  noteId: string,
  data: Record<string, unknown>,
  changeType: NoteVersion['changeType'] = 'update',
): Promise<void> {
  try {
    await api.post('/notes/history', { noteId, data, changeType })
  } catch {
    logger.warn('Saving version locally (offline)', 'History')
    try {
      await saveLocalVersion(noteId, data, changeType)
    } catch {
      logger.warn('Failed to save note version', 'History')
    }
  }
}

/**
 * Get all versions for a note (newest first).
 */
export async function getNoteVersions(noteId: string): Promise<NoteVersion[]> {
  try {
    const { data } = await api.get('/notes/history', { params: { noteId } })
    return (data.data ?? []) as NoteVersion[]
  } catch {
    return getLocalVersions(noteId)
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
    return (data.data ?? null) as NoteVersion | null
  } catch {
    return getLocalVersion(versionId)
  }
}

/**
 * Delete all versions for a note.
 */
export async function deleteNoteVersions(noteId: string): Promise<void> {
  try {
    await api.delete('/notes/history', { params: { noteId } })
  } catch {
    try {
      await clearLocalVersions(noteId)
    } catch {
      /* ignore */
    }
  }
}

/**
 * Limit versions per note (keep most recent N).
 * The server caps at 50; the local fallback trims to keep parity.
 */
export async function limitNoteVersions(
  noteId: string,
  maxVersions: number = 50,
): Promise<void> {
  try {
    await limitLocalVersions(noteId, maxVersions)
  } catch {
    /* ignore */
  }
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
  changes: string[]
} {
  const changes: string[] = []

  const titleChanged = older.title !== newer.title
  const contentChanged = older.content !== newer.content
  const labelsChanged =
    JSON.stringify(older.labels) !== JSON.stringify(newer.labels)

  if (titleChanged) changes.push('Title changed')
  if (contentChanged) changes.push('Content changed')
  if (labelsChanged) changes.push('Labels changed')

  return { titleChanged, contentChanged, labelsChanged, changes }
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
