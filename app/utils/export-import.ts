/**
 * Export and Import notes functionality
 */

import type { NotesInsert } from '@/types'
import api from '@/utils/axios'
import logger from '@/utils/logger'

/** A note as returned by the API — includes joined labels. */
export type ExportableNote = NotesInsert & { labels?: Array<string> }

interface ExportOptions {
  format: 'json' | 'markdown' | 'csv'
  includeArchived?: boolean
  includeTrashed?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ note: Partial<NotesInsert>; error: string }>
}

/**
 * Export notes to various formats
 */
export async function exportNotes(options: ExportOptions): Promise<string | Blob> {
  const { format, includeArchived = false, includeTrashed = false } = options

  try {
    // Fetch all notes
    const { data } = await api.get('/notes', {
      params: {
        includeArchived,
        includeTrashed,
        limit: 10000,
      },
    })

    const notes: Array<ExportableNote> = data.data || []

    // Filter by date range if specified
    let filteredNotes = notes
    if (options.dateRange) {
      filteredNotes = notes.filter((note) => {
        const createdAt = new Date(note.createdAt)
        return (
          createdAt >= options.dateRange!.start &&
          createdAt <= options.dateRange!.end
        )
      })
    }

    switch (format) {
      case 'json':
        return exportAsJson(filteredNotes)
      case 'markdown':
        return exportAsMarkdown(filteredNotes)
      case 'csv':
        return exportAsCsv(filteredNotes)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  } catch (error) {
    logger.error('Failed to export notes', error, 'Export')
    throw error
  }
}

/**
 * Export notes as JSON
 */
function exportAsJson(notes: Array<ExportableNote>): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    noteCount: notes.length,
    notes: notes.map((note) => ({
      title: note.title,
      content: note.content,
      labels: note.labels || [],
      pinned: note.pinned,
      checklist: note.checklist,
      checklistItems: note.checklistItems,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Export notes as Markdown
 */
function exportAsMarkdown(notes: Array<ExportableNote>): string {
  const lines: Array<string> = [
    '# My Notes Export',
    '',
    `Exported on: ${new Date().toLocaleString()}`,
    `Total notes: ${notes.length}`,
    '',
    '---',
    '',
  ]

  // Group by labels
  const notesByLabel = new Map<string, Array<ExportableNote>>()
  const unlabeled: Array<ExportableNote> = []

  for (const note of notes) {
    if (note.labels && note.labels.length > 0) {
      for (const label of note.labels) {
        const existing = notesByLabel.get(label) || []
        existing.push(note)
        notesByLabel.set(label, existing)
      }
    } else {
      unlabeled.push(note)
    }
  }

  // Add labeled notes
  for (const [label, labelNotes] of notesByLabel) {
    lines.push(`## ${label}`, '')
    for (const note of labelNotes) {
      lines.push(`### ${note.title || 'Untitled'}`, '')
      if (note.content) {
        lines.push(note.content, '')
      }
      lines.push(`*Created: ${new Date(note.createdAt).toLocaleString()}*`, '')
      lines.push('---', '')
    }
  }

  // Add unlabeled notes
  if (unlabeled.length > 0) {
    lines.push('## Unlabeled', '')
    for (const note of unlabeled) {
      lines.push(`### ${note.title || 'Untitled'}`, '')
      if (note.content) {
        lines.push(note.content, '')
      }
      lines.push(`*Created: ${new Date(note.createdAt).toLocaleString()}*`, '')
      lines.push('---', '')
    }
  }

  return lines.join('\n')
}

/**
 * Export notes as CSV
 */
function exportAsCsv(notes: Array<ExportableNote>): string {
  const headers = ['Title', 'Content', 'Labels', 'Pinned', 'Created', 'Updated']
  const rows = notes.map((note) => [
    escapeCsvField(note.title || ''),
    escapeCsvField(note.content || ''),
    escapeCsvField((note.labels || []).join('; ')),
    note.pinned ? 'Yes' : 'No',
    new Date(note.createdAt).toISOString(),
    new Date(note.updatedAt).toISOString(),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * Import notes from JSON
 */
export async function importNotes(data: string | File): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  try {
    let jsonData: string

    if (data instanceof File) {
      jsonData = await data.text()
    } else {
      jsonData = data
    }

    const parsed = JSON.parse(jsonData)
    const notes = parsed.notes || parsed

    if (!Array.isArray(notes)) {
      throw new Error('Invalid format: expected an array of notes')
    }

    for (const note of notes) {
      try {
        // Validate required fields
        if (!note.title && !note.content) {
          throw new Error('Note must have a title or content')
        }

        // Create the note
        await api.post('/notes', {
          title: note.title || '',
          content: note.content || '',
          labels: note.labels || [],
          pinned: note.pinned || false,
          checklist: note.checklist || false,
          checklistItems: note.checklistItems || null,
        })

        result.success++
      } catch (error) {
        result.failed++
        result.errors.push({
          note,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        logger.warn(`Failed to import note: ${note.title}`, 'Import')
      }
    }

    logger.info(`Import complete: ${result.success} success, ${result.failed} failed`, 'Import')
    return result
  } catch (error) {
    logger.error('Failed to parse import data', error, 'Import')
    throw error
  }
}

/**
 * Download a string as a file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType?: string
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType || 'text/plain' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate export filename
 */
export function getExportFilename(format: 'json' | 'markdown' | 'csv'): string {
  const date = new Date().toISOString().split('T')[0]
  const extensions = { json: 'json', markdown: 'md', csv: 'csv' }
  return `my-notes-export-${date}.${extensions[format]}`
}
