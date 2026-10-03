"use client"

import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { useOptimisticNotes, useInfiniteNotes } from '@/hooks'
import { Notes, NotesInsert } from '@/types'
import api from '@/utils/axios'
import { notesKeys } from '@/utils/query-keys'
import { TRASH_RETENTION_NOTICE } from '@/utils/trash'
import DeleteDialog from '../delete-dialog'
import Render from '@/components/main-render'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function TrashPage({initialNotes}: {initialNotes: Notes}) {
      const queryClient = useQueryClient()
      const { restoreNote, deleteNote } = useOptimisticNotes()

      // Permanent deletion is irreversible, so the note is only deleted once the
      // user confirms in the dialog below. `null` means the dialog is closed.
      const [noteToDelete, setNoteToDelete] = useState<NotesInsert | null>(null)
    
      const { data: paginatedData, total, hasMore, isLoadingMore, loadMore } = useInfiniteNotes(
        initialNotes,
        { field: 'trash' },
      )
    
      const emptyTrash = useMutation({
        mutationFn: async () => {
          const { data } = await api.delete<{ error?: boolean; message?: string }>(
            '/notes',
          )
          return data
        },
        onSuccess: (data) => {
          if (data.error) toast(data.message)
        },
        onError: () => toast('Failed to empty trash'),
        onSettled: () => queryClient.invalidateQueries({ queryKey: notesKeys.all }),
      })
    
      const EmptyTrash = () => emptyTrash.mutate()

      const confirmDeleteForever = () => {
        if (!noteToDelete) return
        deleteNote.mutate(noteToDelete.id, {
          onSuccess: () =>
            toast.success('Note deleted permanently!', {
              toastId: 'trash-delete-permanent',
              autoClose: 3000,
            }),
        })
      }

  return (
    <>
     <p className="my-5 text-center text-sm text-muted-foreground">
       {TRASH_RETENTION_NOTICE}
     </p>
     {paginatedData.length > 0 && (
        <div className="flex my-5 justify-center items-center">
          <DeleteDialog
            title="Do you want to delete all notes in trash?"
            deleteButtonLabel="Empty trash"
            onClick={EmptyTrash}
          />
        </div>
      )}
      <Render
        notes={{ ...initialNotes, data: paginatedData, total }}
        icons={[
          {
            title: 'restore note from trash',
            icon: 'rotate-ccw',
            onClick: (note) => {
              restoreNote.mutate(note, {
                onSuccess: () =>
                  toast.success('Note restored from trash!', {
                    toastId: 'trash-restore',
                    autoClose: 3000,
                  }),
              })
            },
          },
          {
            title: 'delete note permanently',
            icon: 'trash',
            onClick: (note) => setNoteToDelete(note),
          },
        ]}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />
      <AlertDialog
        open={noteToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setNoteToDelete(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-sm z-9999">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Do you want to delete this note permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {noteToDelete?.title
                ? `"${noteToDelete.title}" will be deleted for good and cannot be restored.`
                : 'This note will be deleted for good and cannot be restored.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              name="delete"
              variant="destructive"
              className="hover:bg-destructive/80!"
              onClick={confirmDeleteForever}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
