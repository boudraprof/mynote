/**
 * Sentry integration for React Native
 * Initialize in app entry point
 */

import logger from './logger'

interface SentryConfig {
  dsn: string
  environment?: string
  release?: string
  sampleRate?: number
  tracesSampleRate?: number
}

// Lazy-loaded Sentry instance
let Sentry: {
  init: (config: Record<string, unknown>) => void
  captureException: (error: Error, context?: Record<string, unknown>) => void
  captureMessage: (message: string, level?: string) => void
  setTag: (key: string, value: string) => void
  setContext: (key: string, context: Record<string, unknown>) => void
} | null = null

/**
 * Initialize Sentry - call this early in app startup
 */
export async function initSentry(config: SentryConfig): Promise<void> {
  if (__DEV__) {
    logger.info('Sentry skipped in development', 'Sentry')
    return
  }

  try {
    // Dynamic import to avoid bundling Sentry in dev
    const sentryModule = await import('@sentry/react-native' as any)
    Sentry = sentryModule

    Sentry!.init({
      dsn: config.dsn,
      environment: config.environment || 'production',
      release: config.release,
      sampleRate: config.sampleRate ?? 1.0,
      tracesSampleRate: config.tracesSampleRate ?? 0.2,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMs: 30000,
      attachStacktrace: true,
    })

    logger.info('Sentry initialized', 'Sentry')
  } catch {
    logger.warn('Sentry not available - install @sentry/react-native', 'Sentry')
  }
}

/**
 * Capture an exception in Sentry
 */
export function captureException(
  error: Error,
  context?: {
    component?: string
    action?: string
    extra?: Record<string, unknown>
  }
): void {
  // Send to Sentry if available
  if (Sentry) {
    if (context?.component) {
      Sentry.setTag('component', context.component)
    }
    if (context?.action) {
      Sentry.setTag('action', context.action)
    }
    if (context?.extra) {
      Sentry.setContext('extra', context.extra)
    }

    Sentry.captureException(error)
  }
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  if (Sentry) {
    Sentry.captureMessage(message, level)
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; name?: string }): void {
  if (Sentry) {
    Sentry.setContext('user', {
      id: user.id,
      email: user.email,
      username: user.name,
    })
  }
}

/**
 * Set tags for Sentry
 */
export function setSentryTag(key: string, value: string): void {
  if (Sentry) {
    Sentry.setTag(key, value)
  }
}
