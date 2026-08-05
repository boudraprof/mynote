/**
 * Export and Import notes functionality for React Native
 * 
 * Required packages (install if not present):
 * - expo-file-system
 * - expo-sharing
 * 
 * Run: npx expo install expo-file-system expo-sharing
 */

import { Paths, File } from 'expo-file-system'
import logger from './logger'

// Lazy-loaded sharing module
let Sharing: {
  isAvailableAsync: () => Promise<boolean>
  shareAsync: (url: string, options?: Record<string, unknown>) => Promise<void>
} | null = null

async function loadSharing() {
  if (!Sharing) {
    try {
      const mod = await import('expo-sharing' as any)
      Sharing = mod.default || mod
    } catch {
      logger.warn('expo-sharing not available', 'Export')
    }
  }
  return Sharing
}

interface NoteData {
  title: string | null
  content: string | null
  labels: string[]
  pinned: boolean
  checklist: boolean
  checklistItems: string | null
  palette: string | null
  createdAt: string
  updatedAt: string
}

interface ImportResult {
  success: number
  failed: number
  errors: { note: Partial<NoteData>; error: string }[]
}

type ExportFormat = 'json' | 'markdown'

/**
 * Export notes to file and share
 */
export async function exportNotes(format: ExportFormat = 'json'): Promise<boolean> {
  try {
    const { getDb } = await import('@/db')
    const { localNotes } = await import('@/db/schema')
    
    const db = await getDb()
    const rows = await db.select().from(localNotes)

    const notes: NoteData[] = rows.map((row) => ({
      title: row.title,
      content: row.content,
      labels: row.labels ? JSON.parse(row.labels) : [],
      pinned: row.pinned ?? false,
      checklist: row.checklist ?? false,
      checklistItems: row.checklistItems,
      palette: row.palette,
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    }))

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        noteCount: notes.length,
        notes,
      }
      content = JSON.stringify(exportData, null, 2)
      filename = `my-notes-export-${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    } else {
      content = exportAsMarkdown(notes)
      filename = `my-notes-export-${new Date().toISOString().split('T')[0]}.md`
      mimeType = 'text/markdown'
    }

    // Write to cache directory
    const cacheDir = Paths.cache
    const file = new File(cacheDir, filename)
    await file.write(content)

    // Try to share the file
    const sharing = await loadSharing()
    if (sharing) {
      const canShare = await sharing.isAvailableAsync()
      if (canShare) {
        await sharing.shareAsync(file.uri, {
          mimeType,
          dialogTitle: 'Export Notes',
        })
        return true
      }
    }

    logger.warn('Sharing not available on this device', 'Export')
    return false
  } catch (error) {
    logger.error('Failed to export notes', error, 'Export')
    throw error
  }
}

/**
 * Export notes as Markdown
 */
function exportAsMarkdown(notes: NoteData[]): string {
  const lines: string[] = [
    '# My Notes Export',
    '',
    `Exported on: ${new Date().toLocaleString()}`,
    `Total notes: ${notes.length}`,
    '',
    '---',
    '',
  ]

  for (const note of notes) {
    lines.push(`## ${note.title || 'Untitled'}`, '')
    if (note.content) {
      lines.push(note.content, '')
    }
    if (note.labels.length > 0) {
      lines.push(`**Labels:** ${note.labels.join(', ')}`, '')
    }
    lines.push(`*Created: ${new Date(note.createdAt).toLocaleString()}*`, '')
    lines.push('---', '')
  }

  return lines.join('\n')
}

/**
 * Import notes from JSON file
 */
export async function importNotesFromFile(): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  try {
    logger.info('Import from file - use expo-document-picker in production', 'Import')
    return result
  } catch (error) {
    logger.error('Failed to import notes', error, 'Import')
    throw error
  }
}

/**
 * Import notes from JSON string
 */
export async function importNotesFromJson(jsonString: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  try {
    const parsed = JSON.parse(jsonString)
    const notes = parsed.notes || parsed

    if (!Array.isArray(notes)) {
      throw new Error('Invalid format: expected an array of notes')
    }

    const { getDb } = await import('@/db')
    const { localNotes } = await import('@/db/schema')
    const db = await getDb()

    for (const note of notes) {
      try {
        if (!note.title && !note.content) {
          throw new Error('Note must have a title or content')
        }

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const timestamp = new Date().toISOString()

        await db.insert(localNotes).values({
          id,
          userId: 'local',
          statusId: 'active',
          title: note.title || null,
          content: note.content || null,
          image: note.image || null,
          labels: note.labels ? JSON.stringify(note.labels) : null,
          pinned: note.pinned ?? false,
          position: 0,
          checklist: note.checklist ?? false,
          checklistItems: note.checklistItems || null,
          palette: note.palette || null,
          statusName: 'active',
          createdAt: note.createdAt || timestamp,
          updatedAt: timestamp,
          synced: false,
        })

        result.success++
      } catch (error) {
        result.failed++
        result.errors.push({
          note,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    logger.info(`Import complete: ${result.success} success, ${result.failed} failed`, 'Import')
    return result
  } catch (error) {
    logger.error('Failed to parse import data', error, 'Import')
    throw error
  }
}
