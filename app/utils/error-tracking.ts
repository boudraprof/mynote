/**
 * Error tracking utility
 * Provides a centralized way to track errors in production
 */

import logger from '@/utils/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, unknown>
}

interface TrackedError {
  message: string
  stack?: string
  context: ErrorContext
  timestamp: number
  url: string
  userAgent: string
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

const errorQueue: Array<TrackedError> = []
const MAX_QUEUE_SIZE = 50
const FLUSH_INTERVAL = 30_000 // 30 seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserId(): string | undefined {
  try {
    const sessionData = localStorage.getItem('session')
    if (sessionData) {
      const session = JSON.parse(sessionData)
      return session?.user?.id
    }
  } catch {
    // ignore
  }
  return undefined
}

function formatError(error: Error, context: ErrorContext): TrackedError {
  return {
    message: error.message,
    stack: error.stack,
    context: {
      ...context,
      userId: context.userId || getUserId(),
    },
    timestamp: Date.now(),
    url:
      typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  }
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/**
 * Send errors to the tracking service.
 *
 * In production: forwards to Sentry (if available).
 * In development: logs to the console.
 */
async function sendToService(errors: Array<TrackedError>): Promise<void> {
  if (import.meta.env.DEV) {
    console.group('[ErrorTracking] Errors captured:')
    for (const err of errors) {
      console.error(
        `${err.context.component || 'Unknown'}: ${err.message}`,
        { stack: err.stack, context: err.context, url: err.url },
      )
    }
    console.groupEnd()
    return
  }

  // Production: forward to Sentry (dynamically imported to avoid circular deps)
  try {
    const { captureException } = await import('@/utils/sentry')
    for (const err of errors) {
      captureException(new Error(err.message), {
        component: err.context.component,
        action: err.context.action,
        extra: { ...err.context },
      })
    }
  } catch {
    // Sentry not available — fall back to local logging
    for (const err of errors) {
      logger.error(err.message, err, 'ErrorTracking')
    }
  }
}

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

async function flushQueue(): Promise<void> {
  if (errorQueue.length === 0) return

  const errorsToSend = [...errorQueue]

  try {
    await sendToService(errorsToSend)
    // Only clear the queue after successful delivery
    errorQueue.length = 0
  } catch {
    // Keep errors in the queue for retry on next flush
    logger.warn(
      `Failed to send ${errorsToSend.length} error(s), will retry`,
      'ErrorTracking',
    )
  }
}

// Auto-flush on interval
if (typeof window !== 'undefined') {
  setInterval(flushQueue, FLUSH_INTERVAL)

  // Flush on page unload — use sendBeacon for reliability
  window.addEventListener('beforeunload', () => {
    if (errorQueue.length > 0) {
      const data = JSON.stringify({ errors: errorQueue })
      navigator.sendBeacon('/api/errors', data)
      errorQueue.length = 0
    }
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track an error — queues it for batch delivery.
 */
export function trackError(
  error: Error | unknown,
  context: ErrorContext = {},
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  const tracked = formatError(errorObj, context)

  errorQueue.push(tracked)

  // Flush immediately if queue is full
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    void flushQueue()
  }
}

/**
 * Track and log to console in development.
 */
export function trackAndLogError(
  error: Error | unknown,
  context: ErrorContext = {},
): void {
  trackError(error, context)

  if (import.meta.env.DEV) {
    console.error('[Error]', error, context)
  }
}

/**
 * Create an error boundary callback for React components.
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    trackError(error, {
      component: componentName,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })
  }
}

/**
 * Wrap an async function with error tracking.
 */
export function withErrorTracking<
  T extends (...args: Array<unknown>) => Promise<unknown>,
>(fn: T, context: ErrorContext): T {
  return ((...args: Array<unknown>) =>
    fn(...args).catch((error: unknown) => {
      trackError(error, context)
      throw error
    })) as T
}

/**
 * Get queued errors (for debugging).
 */
export function getQueuedErrors(): Array<TrackedError> {
  return [...errorQueue]
}

/**
 * Clear error queue.
 */
export function clearErrorQueue(): void {
  errorQueue.length = 0
}
