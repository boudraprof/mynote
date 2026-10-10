import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { getNetworkStateAsync } from 'expo-network'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/hooks/use-network'
import { useAuth } from '@/providers/auth-provider'
import {
  getPendingSyncOperations,
  getLocalNoteById,
  mergeServerNotes,
  removeSyncOperation,
  markNoteSynced,
  rekeyLocalNote,
} from '@/lib/offline-notes'
import { syncReminderNotification } from '@/lib/notifications'
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

/** Extract the HTTP status from a failed request, if there is one. */
function statusOf(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'response' in e) {
    return (e as { response?: { status?: number } }).response?.status
  }
  return undefined
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
          let syncedNoteId = op.noteId

          if (op.operation === 'create') {
            const res = await createNote(data)
            // The server assigns its own id (gen_random_uuid) and ignores the
            // client-generated one. Rekey the local note so subsequent
            // update/delete ops target the real server id instead of 404ing.
            if (res.id && res.id !== op.noteId) {
              await rekeyLocalNote(op.noteId, res.id)
              syncedNoteId = res.id
              // A reminder may have been scheduled against the local id; move
              // it to the server id so tapping the notification still opens
              // the note.
              const rekeyed = await getLocalNoteById(res.id)
              if (rekeyed?.reminderAt) {
                await syncReminderNotification(
                  res.id,
                  rekeyed.title,
                  rekeyed.reminderAt,
                )
              }
            }
          } else if (op.operation === 'update') {
            await updateNote(data)
          } else if (op.operation === 'delete') {
            await deleteNote(op.noteId)
          }

          await removeSyncOperation(op.id)
          await markNoteSynced(syncedNoteId)
        } catch (e) {
          if (statusOf(e) === 404) {
            // The note doesn't exist on the server (deleted elsewhere, or a
            // legacy id from before create-rekey). Drop the op and keep the
            // local copy as the source of truth.
            await removeSyncOperation(op.id)
            if (op.operation !== 'delete') {
              await markNoteSynced(op.noteId)
            }
            continue
          }
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
  const { user } = useAuth()
  const syncing = useRef(false)

  useEffect(() => {
    let cancelled = false

    // Run one sync pass unless one is already in flight. Any scheduled retry
    // is superseded by this fresh attempt.
    const syncIfReady = () => {
      if (syncing.current) return
      syncing.current = true
      ;(async () => {
        try {
          cancelPendingRetry()
          await syncPendingNotes()
          if (!cancelled) {
            queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
          }
        } finally {
          syncing.current = false
        }
      })()
    }

    if (!isOnline) {
      // Stop futile retries while offline; the connectivity listener or a
      // foreground transition re-triggers the sync once we're back online.
      cancelPendingRetry()
      return
    }
    if (!user) {
      // Never sync while logged out — the server rejects us with 401 and the
      // retry loop would spin forever. The effect re-runs once auth resolves.
      cancelPendingRetry()
      return
    }
    syncIfReady()

    // Connectivity events are only observed while the app is running. When
    // the app returns to the foreground, actively re-check the network and
    // sync — the connection may have changed while it was backgrounded.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void getNetworkStateAsync().then((networkState) => {
          if (!cancelled && networkState.isConnected && user) {
            syncIfReady()
          }
        })
      }
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [isOnline, queryClient, user])
}
