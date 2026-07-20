import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/hooks/use-network'
import {
  getPendingSyncOperations,
  mergeServerNotes,
  removeSyncOperation,
  markNoteSynced,
} from '@/lib/offline-notes'
import { createNote, updateNote, deleteNote, getNotes } from '@/api/notes'

const NOTES_KEY = 'notes'

export async function pullServerNotes() {
  try {
    const serverData = await getNotes()
    const serverNotes = serverData.data
    if (serverNotes && serverNotes.length > 0) {
      await mergeServerNotes(serverNotes)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.warn('Failed to pull server notes:', message)
  }
}

let isSyncing = false

/** Push locally-queued operations to the server, then pull latest notes. */
export async function syncPendingNotes() {
  if (isSyncing) return
  isSyncing = true
  try {
    const operations = await getPendingSyncOperations()

    for (const op of operations) {
      try {
        const data = op.data ? JSON.parse(op.data) : {}

        if (op.operation === 'create') {
          await createNote(data)
        } else if (op.operation === 'update') {
          await updateNote(data)
        } else if (op.operation === 'delete') {
          await deleteNote(op.noteId)
        }

        await removeSyncOperation(op.id)
        await markNoteSynced(op.noteId)
      } catch (e) {
        console.warn(`Sync failed for ${op.operation} ${op.noteId}:`, e)
      }
    }

    await pullServerNotes()
  } finally {
    isSyncing = false
  }
}

export function useSyncPendingNotes() {
  const isOnline = useNetwork()
  const queryClient = useQueryClient()
  const syncing = useRef(false)

  useEffect(() => {
    if (!isOnline || syncing.current) return

    syncing.current = true

    ;(async () => {
      try {
        await syncPendingNotes()
        queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
      } finally {
        syncing.current = false
      }
    })()
  }, [isOnline, queryClient])
}
