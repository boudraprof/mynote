import { useQuery } from '@tanstack/react-query'
import type { SearchParams } from '@/api/search'
import { searchNotes } from '@/api/search'

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => searchNotes(params),
    enabled: params.q.length > 0,
  })
}
