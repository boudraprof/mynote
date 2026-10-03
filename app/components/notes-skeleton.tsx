import { Skeleton } from '@/components/ui/skeleton'

const NOTE_COUNT = 6

export function NotesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {Array.from({ length: NOTE_COUNT }).map((_, i) => (
        <div key={i} className="rounded-xl border p-6 shadow-sm space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
