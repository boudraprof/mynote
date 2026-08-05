/**
 * Hook for managing note history
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getNoteVersions,
  saveNoteVersion,
  restoreNoteVersion,
  deleteNoteVersions,
  type NoteVersion,
} from '@/lib/note-history'
import logger from '@/lib/logger'

interface UseNoteHistoryResult {
  versions: NoteVersion[]
  isLoading: boolean
  error: Error | null
  saveVersion: (noteId: string, data: Record<string, unknown>, changeType?: NoteVersion['changeType']) => Promise<void>
  restoreVersion: (versionId: string) => Promise<Record<string, unknown> | null>
  deleteHistory: (noteId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useNoteHistory(noteId: string | null): UseNoteHistoryResult {
  const [versions, setVersions] = useState<NoteVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchVersions = useCallback(async () => {
    if (!noteId) {
      setVersions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await getNoteVersions(noteId)
      setVersions(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch versions'))
      logger.error('Failed to fetch note versions', err, 'History')
    } finally {
      setIsLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    // Load version history on mount / when the note changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount
    void fetchVersions()
  }, [fetchVersions])

  const saveVersion = useCallback(
    async (
      noteId: string,
      data: Record<string, unknown>,
      changeType: NoteVersion['changeType'] = 'update'
    ) => {
      try {
        await saveNoteVersion(noteId, data as any, changeType)
        await fetchVersions()
      } catch (err) {
        logger.error('Failed to save version', err, 'History')
      }
    },
    [fetchVersions]
  )

  const restoreVersion = useCallback(
    async (versionId: string) => {
      try {
        const data = await restoreNoteVersion(versionId)
        return data
      } catch (err) {
        logger.error('Failed to restore version', err, 'History')
        return null
      }
    },
    []
  )

  const deleteHistory = useCallback(
    async (noteId: string) => {
      try {
        await deleteNoteVersions(noteId)
        await fetchVersions()
      } catch (err) {
        logger.error('Failed to delete history', err, 'History')
      }
    },
    [fetchVersions]
  )

  return {
    versions,
    isLoading,
    error,
    saveVersion,
    restoreVersion,
    deleteHistory,
    refresh: fetchVersions,
  }
}
