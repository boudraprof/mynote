/**
 * Sync utilities for React Native
 * Handles syncing local changes to server
 */

import api from './api'
import logger from './logger'

/**
 * Sync a single operation to server
 */
export async function syncToServer(
  operation: string,
  noteId: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    switch (operation) {
      case 'create':
        await api.post('/notes', data)
        break

      case 'update':
        await api.put('/notes', { id: noteId, ...data })
        break

      case 'delete':
        await api.delete(`/notes?id=${noteId}`)
        break

      default:
        logger.warn(`Unknown sync operation: ${operation}`, 'Sync')
    }
  } catch (error) {
    logger.error(`Failed to sync ${operation} for note ${noteId}`, error, 'Sync')
    throw error
  }
}

/**
 * Sync all pending operations
 */
export async function syncAllPending(
  operations: Array<{
    id: string
    noteId: string
    operation: string
    data?: string
  }>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const op of operations) {
    try {
      const data = op.data ? JSON.parse(op.data) : undefined
      await syncToServer(op.operation, op.noteId, data)
      success++
    } catch {
      failed++
    }

    onProgress?.(success + failed, operations.length)
  }

  return { success, failed }
}

/**
 * Fetch server notes and merge with local
 */
export async function fetchAndMergeServerNotes(): Promise<void> {
  try {
    const { data } = await api.get('/notes', { params: { limit: 10000 } })
    
    // Import and merge
    const { mergeServerNotes } = await import('./offline-notes')
    await mergeServerNotes(data.data || [])
    
    logger.info('Merged server notes', 'Sync')
  } catch (error) {
    logger.error('Failed to fetch server notes', error, 'Sync')
  }
}
