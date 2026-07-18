import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLabel, deleteLabel, getLabels, updateLabel } from '@/api/labels'

const LABELS_KEY = 'labels'

export function useLabels() {
  return useQuery({
    queryKey: [LABELS_KEY],
    queryFn: () => getLabels(),
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createLabel(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LABELS_KEY] })
    },
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateLabel(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LABELS_KEY] })
    },
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LABELS_KEY] })
    },
  })
}
