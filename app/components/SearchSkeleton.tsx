export function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
      </div>

      {/* Search results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-lg p-4 space-y-3"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
            </div>

            {/* Card content */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            </div>

            {/* Card footer */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
