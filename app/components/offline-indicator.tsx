"use client"
import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { getQueueCount, processOfflineQueue } from '@/utils/offline-queue'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {useOffline} from 'next/offline'
/**
 * Hook to manage offline queue with IndexedDB persistence
 */
export function useOfflineQueue() {
  const isOffline = useOnlineStatus()
  const [queueLength, setQueueLength] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Check queue count on mount
  useEffect(() => {
    getQueueCount().then(setQueueLength).catch(() => {})
  }, [])

  const syncQueue = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    try {
      const result = await processOfflineQueue()
      if (result.success > 0) {
        toast.success(`Synced ${result.success} offline changes`)
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} changes failed to sync`)
      }
    } catch {
      // Will retry on next online event
    } finally {
      setIsSyncing(false)
      const count = await getQueueCount()
      setQueueLength(count)
    }
  }, [isSyncing])

  // Auto-sync when coming online and dismiss any offline-related toasts
  useEffect(() => {
    if (!isOffline) {
      // Dismiss any existing offline-related toasts when coming back online
      toast.dismiss()
      if (queueLength > 0 && !isSyncing) {
        void syncQueue()
      }
    }
  }, [isOffline])

  return {
    isOffline,
    queueLength,
    isSyncing,
    syncQueue,
  }
}

export function OfflineIndicator() {
  // const { isOnline, queueLength, isSyncing, syncQueue } = useOfflineQueue()
  const { queueLength, isSyncing, syncQueue } = useOfflineQueue()
  const isOffline = useOffline()
   
  if (!isOffline) {
    return null
  }
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted border rounded-lg shadow-lg">
        <WifiOff className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">You're offline</p>
          <p className="text-xs text-muted-foreground">
            {queueLength > 0
              ? `${queueLength} change${queueLength === 1 ? '' : 's'} pending sync`
              : 'Changes will sync when you reconnect'}
          </p>
        </div>
        {queueLength > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => void syncQueue()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
