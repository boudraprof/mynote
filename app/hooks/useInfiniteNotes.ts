import { useInfiniteQuery } from '@tanstack/react-query'

import type { Notes } from '@/types'
import api from '@/utils/axios'
import { notesKeys } from '@/utils/query-keys'

type UseInfiniteNotesParams = {
  field?: string
  label?: string
}

/**
 * Infinite-scroll notes list backed by React Query.
 *
 * The route loader seeds the first page (`initialNotes`), so the SSR data is
 * used immediately; later pages are fetched with `useInfiniteQuery`. Because
 * every notes view shares the `['notes', …]` key prefix, the optimistic
 * mutations in `useOptimisticNotes` update all cached views at once and
 * `invalidateQueries({ queryKey: ['notes'] })` refetches the active view.
 */
export function useInfiniteNotes(
  initialNotes: Notes,
  params: UseInfiniteNotesParams,
) {
  const limit = initialNotes.limit || 20

  const query = useInfiniteQuery({
    queryKey: notesKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams()
      if (params.field) sp.set('field', params.field)
      if (params.label) sp.set('label', params.label)
      sp.set('limit', String(limit))
      sp.set('offset', String(pageParam))

      const { data } = await api.get<Notes>(`/notes?${sp}`)
      return data
    },
    initialPageParam: initialNotes.offset,
    initialData: {
      pages: [initialNotes],
      pageParams: [initialNotes.offset],
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
  })

  const firstPage = query.data.pages[0]
  return {
    data: query.data.pages.flatMap((page) => page.data),
    total: firstPage ? firstPage.total : initialNotes.total,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    error: query.error ? query.error.message : null,
    loadMore: () => {
      void query.fetchNextPage()
    },
  }
}
