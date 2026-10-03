import { Skeleton } from '@/components/ui/skeleton'

export function UserFormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i}>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  )
}
