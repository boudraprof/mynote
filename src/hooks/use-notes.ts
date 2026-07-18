import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NoteInput, NoteUpdate, ReorderItem } from '@/api/notes'
import {
  copyNote,
  createNote,
  deleteNote,
  getNoteById,
  getNotes,
  reorderNotes,
  updateNote,
} from '@/api/notes'
import { useNetwork } from '@/hooks/use-network'
import {
  createLocalNote,
  getLocalNoteById,
  getLocalNotes,
  mergeServerNotes,
  updateLocalNote,
  deleteLocalNote as deleteLocalNoteDb,
} from '@/lib/offline-notes'
import type { ApiNote } from '@/api/types'

const NOTES_KEY = 'notes'

export function useNotes(params?: {
  field?: string
  limit?: number
  offset?: number
  label?: string
}) {
  const isOnline = useNetwork()

  return useQuery({
    queryKey: [NOTES_KEY, params, { offline: !isOnline }],
    queryFn: async () => {
      if (!isOnline) {
        const data = await getLocalNotes(params)
        return { data, total: data.length, limit: 50, offset: 0 }
      }
      try {
        const result = await getNotes(params)
        await mergeServerNotes(result.data)
        return result
      } catch {
        const data = await getLocalNotes(params)
        return { data, total: data.length, limit: 50, offset: 0 }
      }
    },
  })
}

export function useNote(id?: string) {
  const isOnline = useNetwork()

  return useQuery({
    queryKey: [NOTES_KEY, id, { offline: !isOnline }],
    queryFn: async () => {
      if (!isOnline) {
        return await getLocalNoteById(id!)
      }
      try {
        return await getNoteById(id!).then((r) => r.data)
      } catch {
        return await getLocalNoteById(id!)
      }
    },
    enabled: !!id,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const isOnline = useNetwork()

  return useMutation({
    mutationFn: async (note: NoteInput) => {
      if (isOnline) {
        try {
          return await createNote(note)
        } catch {
          await createLocalNote(note)
          return { error: false, message: 'Saved offline' }
        }
      }
      await createLocalNote(note)
      return { error: false, message: 'Saved offline' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const isOnline = useNetwork()

  return useMutation({
    mutationFn: async (note: NoteUpdate) => {
      if (isOnline) {
        try {
          return await updateNote(note)
        } catch {
          await updateLocalNote(note)
          return { error: false, message: 'Saved offline' }
        }
      }
      await updateLocalNote(note)
      return { error: false, message: 'Saved offline' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const isOnline = useNetwork()

  return useMutation({
    mutationFn: async (id?: string) => {
      if (!id) return { error: true, message: 'No id' }
      if (isOnline) {
        try {
          return await deleteNote(id)
        } catch {
          await deleteLocalNoteDb(id)
          return { error: false, message: 'Deleted offline' }
        }
      }
      await deleteLocalNoteDb(id)
      return { error: false, message: 'Deleted offline' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })
}

export function useCopyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: NoteInput) => copyNote(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })
}

export function useReorderNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<ReorderItem>) => reorderNotes(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
  })
}
