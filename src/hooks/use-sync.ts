import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/hooks/use-network'
import {
  getPendingSyncOperations,
  mergeServerNotes,
  removeSyncOperation,
  markNoteSynced,
} from '@/lib/offline-notes'
import { retryDelayMs } from '@/lib/sync-retry'
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

// ── Sync activity store (module-level, shared across screens) ─────────────
interface SyncActivity {
  syncing: boolean
  retryInMs: number
}

let activity: SyncActivity = { syncing: false, retryInMs: 0 }
const activityListeners = new Set<() => void>()

function setActivity(patch: Partial<SyncActivity>) {
  activity = { ...activity, ...patch }
  activityListeners.forEach((listener) => listener())
}

function subscribeSyncActivity(listener: () => void): () => void {
  activityListeners.add(listener)
  return () => {
    activityListeners.delete(listener)
  }
}

function getSyncActivity(): SyncActivity {
  return activity
}

// ── Sync lock + exponential-backoff retry ─────────────────────────────────
let syncLock = false
let failedPasses = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

/** Stop any scheduled retry (e.g. the app went offline or reconnected). */
export function cancelPendingRetry(): void {
  clearRetryTimer()
  failedPasses = 0
  setActivity({ retryInMs: 0 })
}

function scheduleRetry() {
  failedPasses += 1
  const delay = retryDelayMs(failedPasses)
  clearRetryTimer()
  retryTimer = setTimeout(() => {
    retryTimer = null
    void syncPendingNotes()
  }, delay)
  setActivity({ retryInMs: delay })
}

/**
 * Push locally-queued operations to the server, then pull latest notes.
 *
 * Serialized by a module-level lock so concurrent callers (autosave, the
 * reconnect hook, the retry timer) never run two passes at once. Failed ops
 * stay queued and trigger an automatic retry with exponential backoff.
 */
export async function syncPendingNotes() {
  if (syncLock) return
  syncLock = true
  setActivity({ syncing: true, retryInMs: 0 })
  try {
    // Loop: ops queued while we were syncing (e.g. an autosave) are picked
    // up in the same pass instead of waiting for the next trigger.
    while (true) {
      const operations = await getPendingSyncOperations()
      if (operations.length === 0) {
        failedPasses = 0
        clearRetryTimer()
        break
      }

      let failures = 0
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
          failures += 1
          console.warn(`Sync failed for ${op.operation} ${op.noteId}:`, e)
        }
      }

      await pullServerNotes()

      if (failures > 0) {
        scheduleRetry()
        break
      }
      // All ops succeeded; loop to catch anything queued during the pass.
    }
  } finally {
    syncLock = false
    setActivity({ syncing: false })
  }
}

/** Reactive sync status: pending op count plus in-flight / retry state. */
export function useSyncStatus() {
  const isOnline = useNetwork()
  const [pending, setPending] = useState(0)
  const activitySnapshot = useSyncExternalStore(
    subscribeSyncActivity,
    getSyncActivity,
  )

  useEffect(() => {
    const refreshPending = async () => {
      const ops = await getPendingSyncOperations()
      setPending(ops.length)
    }
    const initial = setTimeout(() => {
      void refreshPending()
    }, 0)
    const poll = setInterval(() => {
      void refreshPending()
    }, 10_000)
    const unsubscribe = subscribeSyncActivity(() => {
      void refreshPending()
    })
    return () => {
      clearTimeout(initial)
      clearInterval(poll)
      unsubscribe()
    }
  }, [])

  return { isOnline, pending, ...activitySnapshot }
}

export function useSyncPendingNotes() {
  const isOnline = useNetwork()
  const queryClient = useQueryClient()
  const syncing = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      // Stop futile retries while offline.
      cancelPendingRetry()
      return
    }
    if (syncing.current) return

    syncing.current = true
    ;(async () => {
      try {
        // A reconnect sync supersedes any scheduled retry.
        cancelPendingRetry()
        await syncPendingNotes()
        queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
      } finally {
        syncing.current = false
      }
    })()
  }, [isOnline, queryClient])
}
