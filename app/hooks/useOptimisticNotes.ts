import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import type { InfiniteData } from '@tanstack/react-query'

import type { NoteFormData, Notes, NotesInsert } from '@/types'
import { NOTE_STATUS } from '@/utils/status'
import api from '@/utils/axios'
import {
  moveToArchive as archiveNote,
  setStatus,
  moveToTrash as trashNote,
} from '@/utils/notes.apis'
import { notesKeys } from '@/utils/query-keys'

interface UseOptimisticNotesOptions {
  onMutate?: (variables: unknown) => Promise<unknown> | unknown
  onError?: (error: unknown, variables: unknown, context: unknown) => void
  onSuccess?: (data: unknown, variables: unknown, context: unknown) => void
}

interface OptimisticMutationConfig<TVariables> {
  mutationFn: (variables: TVariables) => Promise<unknown>
  /** How to apply the optimistic change to every cached notes list. */
  update: (
    notes: Array<NoteFormData>,
    variables: TVariables,
  ) => Array<NoteFormData>
  errorMessage: string
}

/**
 * Build a single optimistic mutation with the shared snapshot → apply →
 * rollback → invalidate scaffolding. All mutations in this hook follow exactly
 * this shape; only `mutationFn`, the cache updater, and the error message
 * vary.
 *
 * Notes lists are infinite queries (`InfiniteData<Notes>`), and every view
 * shares the `['notes', …]` key prefix, so the updater is applied to every
 * cached view through `setQueriesData`, and invalidating `['notes']` refetches
 * whichever view is currently mounted.
 */
function useOptimisticMutation<TVariables>(
  { mutationFn, update, errorMessage }: OptimisticMutationConfig<TVariables>,
  options?: UseOptimisticNotesOptions,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      void queryClient.cancelQueries({ queryKey: notesKeys.all })

      // Snapshot every cached notes view for rollback
      const previousNotes = queryClient.getQueriesData<
        InfiniteData<Notes, number>
      >({ queryKey: notesKeys.all })

      // Apply the optimistic change across all pages of every view
      queryClient.setQueriesData<InfiniteData<Notes, number>>(
        { queryKey: notesKeys.all },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              // The merge produces a superset of the note row; the server
              // response reconciles the exact shape on refetch.
              data: update(page.data, variables) as Array<NotesInsert>,
            })),
          }
        },
      )

      // Call custom onMutate if provided
      const customResult = options?.onMutate
        ? await options.onMutate(variables)
        : {}
      return {
        previousNotes,
        ...(typeof customResult === 'object' && customResult !== null
          ? customResult
          : {}),
      }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        for (const [key, data] of context.previousNotes) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(errorMessage)
      options?.onError?.(err, variables, context)
    },
    onSettled: () => {
      // Always refetch after error or success
      void queryClient.invalidateQueries({ queryKey: notesKeys.all })
      options?.onSuccess?.(undefined, undefined, undefined)
    },
  })
}

/**
 * Hook for optimistic note mutations with automatic cache updates.
 */
export function useOptimisticNotes(options?: UseOptimisticNotesOptions) {
  // Update note fields (title, content, labels, checklist, palette, reminder…)
  const updateNote = useOptimisticMutation<
    Partial<NoteFormData> & { id: string; statusName?: string }
  >(
    {
      mutationFn: async (data) => {
        const response = await api.put('/notes', data)
        return response.data
      },
      update: (notes, variables) =>
        notes.map((note) =>
          note.id === variables.id ? { ...note, ...variables } : note,
        ),
      errorMessage: 'Failed to update note',
    },
    options,
  )

  // Delete note (permanent)
  const deleteNote = useOptimisticMutation<string>(
    {
      mutationFn: async (noteId) => {
        const response = await api.delete(`/notes?id=${noteId}`)
        return response.data
      },
      update: (notes, noteId) => notes.filter((note) => note.id !== noteId),
      errorMessage: 'Failed to delete note',
    },
    options,
  )

  // Toggle pin
  const togglePin = useOptimisticMutation<{ id: string; pinned: boolean }>(
    {
      mutationFn: async ({ id, pinned }) => {
        const response = await api.put('/notes', { id, pinned })
        return response.data
      },
      update: (notes, { id, pinned }) =>
        notes.map((note) => (note.id === id ? { ...note, pinned } : note)),
      errorMessage: 'Failed to update pin status',
    },
    options,
  )

  // Move to trash (removes from every cached view optimistically)
  const moveToTrash = useOptimisticMutation<NotesInsert>(
    {
      mutationFn: (note) => trashNote(note),
      update: (notes, note) => notes.filter((n) => n.id !== note.id),
      errorMessage: 'Failed to move note to trash',
    },
    options,
  )

  // Move to archive (removes from every cached view optimistically)
  const moveToArchive = useOptimisticMutation<NotesInsert>(
    {
      mutationFn: (note) => archiveNote(note),
      update: (notes, note) => notes.filter((n) => n.id !== note.id),
      errorMessage: 'Failed to archive note',
    },
    options,
  )

  // Restore a note to active (from archive or trash)
  const restoreNote = useOptimisticMutation<NotesInsert>(
    {
      mutationFn: (note) => setStatus(note, NOTE_STATUS.ACTIVE),
      update: (notes, note) => notes.filter((n) => n.id !== note.id),
      errorMessage: 'Failed to restore note',
    },
    options,
  )

  // Duplicate a note
  const copyNote = useOptimisticMutation<NotesInsert>(
    {
      mutationFn: async (note) => {
        const response = await api.post('/notes/copy', {
          data: { ...note, pinned: false },
        })
        return response.data
      },
      // No optimistic list change; the refetch on settle reveals the copy.
      update: (notes) => notes,
      errorMessage: 'Failed to copy note',
    },
    options,
  )

  return {
    updateNote,
    deleteNote,
    togglePin,
    moveToTrash,
    moveToArchive,
    restoreNote,
    copyNote,
  }
}
