import { useCallback, useEffect, useState } from 'react'
import { History, RefreshCw } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import type { NoteVersion } from '@/utils/note-history'
import {
  getNoteVersions,
  restoreNoteVersion,
} from '@/utils/note-history'
import logger from '@/utils/logger'
import { cn } from '@/utils'

const changeTypeLabel = (type: NoteVersion['changeType']): string => {
  if (type === 'create') return 'Created'
  if (type === 'delete') return 'Deleted'
  return 'Edited'
}

const changeTypeClass = (type: NoteVersion['changeType']): string => {
  if (type === 'create') return 'bg-emerald-500/10 text-emerald-700'
  if (type === 'delete') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
}

/**
 * Version browser for the note creator — lists server-backed snapshots for
 * the note being edited and lets the user restore any of them.
 *
 * Mirrors the mobile app's history sheet (mobile-app/src/app/note/[id].tsx):
 * rows show timestamp + change type + title, and restoring applies the
 * snapshot fields back to the editor form.
 */
export function HistoryDialog({
  noteId,
  open,
  onOpenChange,
  onRestore,
}: {
  noteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (snapshot: Record<string, unknown>) => void
}) {
  const [versions, setVersions] = useState<Array<NoteVersion>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!noteId) return
    setIsLoading(true)
    try {
      const data = await getNoteVersions(noteId)
      setVersions(data)
    } catch (error) {
      logger.warn('Failed to fetch note versions', 'History')
    } finally {
      setIsLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    if (open && noteId) void load()
  }, [open, noteId, load])

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId)
    try {
      const snapshot = await restoreNoteVersion(versionId)
      if (!snapshot) {
        logger.warn('Failed to restore note version', 'History')
        return
      }
      onRestore(snapshot)
      onOpenChange(false)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={16} />
            Version history
          </DialogTitle>
          <DialogDescription>
            Snapshots are saved on every change and follow the note across
            devices. Restoring replaces the current note content.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8 text-sm text-muted-foreground">
            Loading versions…
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No versions saved yet
          </div>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {new Date(v.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        changeTypeClass(v.changeType),
                      )}
                    >
                      {changeTypeLabel(v.changeType)}
                    </span>
                    {v.title && (
                      <span className="truncate text-xs text-muted-foreground">
                        {v.title}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoringId !== null}
                  onClick={() => void handleRestore(v.id)}
                >
                  <RefreshCw
                    size={14}
                    className={cn(
                      restoringId === v.id && 'animate-spin',
                    )}
                  />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
