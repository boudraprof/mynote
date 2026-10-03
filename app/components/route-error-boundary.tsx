import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'
import { createErrorBoundaryHandler } from '@/utils/error-tracking'

interface RouteErrorBoundaryProps {
  children: ReactNode
  routeName: string
}

/**
 * Error boundary wrapper for route components
 * Captures errors and sends them to error tracking
 */
export function RouteErrorBoundary({ children, routeName }: RouteErrorBoundaryProps) {
  const handleError = createErrorBoundaryHandler(`route:${routeName}`)

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}

export default RouteErrorBoundary
