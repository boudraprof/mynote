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
        } catch (err) {
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

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queueLength > 0 && !isSyncing) {
      void syncNow()
    }
  }, [isOnline])

  return {
    isOnline,
    queueLength,
    isSyncing,
    pendingOperations,
    syncNow,
    refreshQueue,
  }
}
