/**
 * Note versioning and history tracking for React Native
 * Stores note snapshots in SQLite via Drizzle
 */

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { noteHistory } from '@/db/schema'
import logger from './logger'

export interface NoteVersion {
  id: string
  noteId: string
  title: string | null
  content: string | null
  checklistItems: string | null
  labels: string[]
  snapshot: string // JSON string of full note state
  timestamp: string
  changeType: 'create' | 'update' | 'delete'
}

/**
 * Save a note version/snapshot
 */
export async function saveNoteVersion(
  noteId: string,
  data: {
    title: string | null
    content: string | null
    checklistItems: string | null
    labels?: string[]
    [key: string]: unknown
  },
  changeType: NoteVersion['changeType'] = 'update'
): Promise<void> {
  try {
    const db = await getDb()
    const id = `version-${noteId}-${Date.now()}`
    const timestamp = new Date().toISOString()

    await db.insert(noteHistory).values({
      id,
      noteId,
      title: data.title,
      content: data.content,
      checklistItems: data.checklistItems,
      labels: data.labels ? JSON.stringify(data.labels) : null,
      snapshot: JSON.stringify(data),
      timestamp,
      changeType,
    })

    // Limit versions per note (keep last 50)
    await limitNoteVersions(noteId, 50)
  } catch (error) {
    // Don't let history tracking break the app
    logger.warn('Failed to save note version', 'History')
  }
}

/**
 * Get all versions for a note
 */
export async function getNoteVersions(noteId: string): Promise<NoteVersion[]> {
  const db = await getDb()
  
  const rows = await db
    .select()
    .from(noteHistory)
    .where(eq(noteHistory.noteId, noteId))
    .orderBy(noteHistory.timestamp)

  // Sort by timestamp, newest first
  return rows
    .map((row) => ({
      ...row,
      labels: row.labels ? JSON.parse(row.labels) : [],
      changeType: row.changeType as NoteVersion['changeType'],
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Get a specific version by ID
 */
export async function getNoteVersion(versionId: string): Promise<NoteVersion | null> {
  const db = await getDb()
  const [row] = await db
    .select()
    .from(noteHistory)
    .where(eq(noteHistory.id, versionId))

  if (!row) return null

  return {
    ...row,
    labels: row.labels ? JSON.parse(row.labels) : [],
    changeType: row.changeType as NoteVersion['changeType'],
  }
}

/**
 * Delete all versions for a note
 */
export async function deleteNoteVersions(noteId: string): Promise<void> {
  const db = await getDb()
  await db.delete(noteHistory).where(eq(noteHistory.noteId, noteId))
}

/**
 * Limit versions per note (keep most recent N)
 */
export async function limitNoteVersions(
  noteId: string,
  maxVersions: number = 50
): Promise<void> {
  const versions = await getNoteVersions(noteId)

  if (versions.length > maxVersions) {
    const toDelete = versions.slice(maxVersions)
    const db = await getDb()

    for (const version of toDelete) {
      await db.delete(noteHistory).where(eq(noteHistory.id, version.id))
    }
  }
}

/**
 * Compare two versions and show diff
 */
export function compareVersions(
  older: NoteVersion,
  newer: NoteVersion
): {
  titleChanged: boolean
  contentChanged: boolean
  labelsChanged: boolean
  changes: string[]
} {
  const changes: string[] = []

  const titleChanged = older.title !== newer.title
  const contentChanged = older.content !== newer.content
  const labelsChanged = JSON.stringify(older.labels) !== JSON.stringify(newer.labels)

  if (titleChanged) changes.push('Title changed')
  if (contentChanged) changes.push('Content changed')
  if (labelsChanged) changes.push('Labels changed')

  return { titleChanged, contentChanged, labelsChanged, changes }
}

/**
 * Restore a note to a previous version
 */
export async function restoreNoteVersion(
  versionId: string
): Promise<Record<string, unknown> | null> {
  const version = await getNoteVersion(versionId)
  if (!version) return null

  try {
    return JSON.parse(version.snapshot)
  } catch {
    return null
  }
}
