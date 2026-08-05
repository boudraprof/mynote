import { Platform } from 'react-native'

/**
 * Error tracking utility for React Native
 * Provides a centralized way to track errors
 */

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
  platform: string
}

// Queue for batching errors
const errorQueue: TrackedError[] = []
const MAX_QUEUE_SIZE = 50

/**
 * Get platform info
 */
function getPlatform(): string {
  return `${Platform.OS}-${Platform.Version}`
}

/**
 * Format error for tracking
 */
function formatError(error: Error, context: ErrorContext): TrackedError {
  return {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    platform: getPlatform(),
  }
}

/**
 * Send errors to tracking service
 */
async function sendToService(errors: TrackedError[]): Promise<void> {
  if (__DEV__) {
    console.group('[ErrorTracking] Errors captured:')
    errors.forEach((err) => {
      console.error(`${err.context.component || 'Unknown'}: ${err.message}`, {
        stack: err.stack,
        context: err.context,
        platform: err.platform,
      })
    })
    console.groupEnd()
    return
  }

  // In production, send to your error tracking service
  // The Sentry integration will handle this
}

/**
 * Flush error queue to service
 */
async function flushQueue(): Promise<void> {
  if (errorQueue.length === 0) return

  const errorsToSend = [...errorQueue]
  errorQueue.length = 0

  try {
    await sendToService(errorsToSend)
  } catch {
    // Don't let tracking errors break the app
  }
}

/**
 * Track an error
 */
export function trackError(error: Error | unknown, context: ErrorContext = {}): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  const tracked = formatError(errorObj, context)

  errorQueue.push(tracked)

  // Flush if queue is full
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    void flushQueue()
  }
}

/**
 * Track an error and log it in development
 */
export function trackAndLogError(
  error: Error | unknown,
  context: ErrorContext = {}
): void {
  trackError(error, context)

  if (__DEV__) {
    console.error('[Error]', error, context)
  }
}

/**
 * Get queued errors (for debugging)
 */
export function getQueuedErrors(): TrackedError[] {
  return [...errorQueue]
}

/**
 * Clear error queue
 */
export function clearErrorQueue(): void {
  errorQueue.length = 0
}

/**
 * Flush errors immediately (call on app background/exit)
 */
export function flushErrors(): void {
  void flushQueue()
}
