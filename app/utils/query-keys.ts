/**
 * Centralized React Query keys.
 *
 * All notes lists (active, labels, archive, trash, reminders) share the
 * `['notes', …]` prefix so optimistic mutations in `useOptimisticNotes` can
 * update every cached view at once with `setQueriesData` / `invalidateQueries`.
 */
export const notesKeys = {
  /** Matches every notes list view. */
  all: ['notes'] as const,
  list: (params: { field?: string; label?: string }) =>
    ['notes', params] as const,
}

export const labelsKeys = {
  all: ['labels'] as const,
}

export const sharesKeys = {
  detail: (noteId: string) => ['shares', noteId] as const,
}

export const searchKeys = {
  query: (q: string) => ['search', q] as const,
}
