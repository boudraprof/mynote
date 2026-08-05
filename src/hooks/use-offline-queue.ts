/**
 * Hook for managing offline queue with sync status
 */

import { useState, useEffect, useCallback } from 'react'
import { useNetwork } from './use-network'
import { getPendingSyncOperations, removeSyncOperation, markNoteSynced } from '@/lib/offline-notes'
import { syncToServer } from '@/lib/sync'
import logger from '@/lib/logger'

interface SyncOperation {
  id: string
  noteId: string
  operation: string
  data?: string | null
  createdAt?: string | null
}

interface UseOfflineQueueResult {
  isOnline: boolean
  queueLength: number
  isSyncing: boolean
  pendingOperations: SyncOperation[]
  syncNow: () => Promise<void>
  refreshQueue: () => Promise<void>
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const isOnline = useNetwork()
  const [queueLength, setQueueLength] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingOperations, setPendingOperations] = useState<SyncOperation[]>([])

  const refreshQueue = useCallback(async () => {
    try {
      const operations = await getPendingSyncOperations()
      setPendingOperations(operations)
      setQueueLength(operations.length)
    } catch (err) {
      logger.error('Failed to refresh sync queue', err, 'Sync')
    }
  }, [])

  useEffect(() => {
    // Load the sync queue on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount
    void refreshQueue()
  }, [refreshQueue])

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)
    try {
      const operations = await getPendingSyncOperations()

      for (const op of operations) {
        try {
          const data = op.data ? JSON.parse(op.data) : undefined
          await syncToServer(op.operation, op.noteId, data)
          await removeSyncOperation(op.id)
          await markNoteSynced(op.noteId)
        } catch {
          logger.warn(`Failed to sync operation ${op.id}`, 'Sync')
        }
      }

      await refreshQueue()
    } catch (err) {
      logger.error('Sync failed', err, 'Sync')
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, refreshQueue])

  // Auto-sync when coming online. The guard reads the latest values inside
  // syncNow, so this intentionally only re-runs on connectivity changes.
  useEffect(() => {
    if (isOnline && queueLength > 0 && !isSyncing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-sync trigger
      void syncNow()
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps -- retry is gated by syncNow's own guards

  return {
    isOnline,
    queueLength,
    isSyncing,
    pendingOperations,
    syncNow,
    refreshQueue,
  }
}
