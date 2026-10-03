/**
 * Sentry integration for error tracking and performance monitoring
 * Initialize in app entry point
 */

import { trackError } from '@/utils/error-tracking'
import logger from '@/utils/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SentryConfig {
  dsn: string
  environment?: string
  release?: string
  sampleRate?: number
  tracesSampleRate?: number
}

// Minimal Sentry interface matching what we use
interface SentryInstance {
  init: (config: Record<string, unknown>) => void
  captureException: (error: Error, context?: Record<string, unknown>) => void
  captureMessage: (message: string, level?: string) => void
  setTag: (key: string, value: string) => void
  setContext: (key: string, context: Record<string, unknown>) => void
  withScope: (
    callback: (scope: {
      setTag: (k: string, v: string) => void
      setContext: (k: string, c: Record<string, unknown>) => void
    }) => void,
  ) => void
}

/** Singleton — set after initSentry() succeeds */
let Sentry: SentryInstance | null = null

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize Sentry — call this once during app startup (e.g. in __root.tsx).
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export async function initSentry(config: SentryConfig): Promise<void> {
  // Already initialized
  if (Sentry) return

  if (import.meta.env.DEV) {
    logger.info('[sentry] Skipped in development', 'Sentry')
    return
  }

  if (!config.dsn) {
    logger.warn('[sentry] No DSN provided — Sentry disabled', 'Sentry')
    return
  }

  try {
    const sentryModule = await import('@sentry/react')
    Sentry = sentryModule as unknown as SentryInstance

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || import.meta.env.MODE,
      release: config.release,
      sampleRate: config.sampleRate ?? 0.1,
      tracesSampleRate: config.tracesSampleRate ?? 0.2,
    })

    logger.info('[sentry] Initialized', 'Sentry')
  } catch (err) {
    logger.error('[sentry] Failed to load @sentry/react', err, 'Sentry')
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExceptionContext {
  component?: string
  action?: string
  extra?: Record<string, unknown>
}

/**
 * Capture an exception — sends to Sentry (if initialized) AND logs locally.
 */
export function captureException(
  error: Error,
  context?: ExceptionContext,
): void {
  // Always track locally
  trackError(error, {
    component: context?.component,
    action: context?.action,
    metadata: context?.extra,
  })

  // Send to Sentry if available
  if (!Sentry) return

  Sentry.withScope((scope) => {
    if (context?.component) {
      scope.setTag('component', context.component)
    }
    if (context?.action) {
      scope.setTag('action', context.action)
    }
    if (context?.extra) {
      scope.setContext('extra', context.extra)
    }

    Sentry!.captureException(error)
  })
}

/**
 * Capture a message in Sentry.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (Sentry) {
    Sentry.captureMessage(message, level)
  }
}

/**
 * Set user context for Sentry.
 */
export function setSentryUser(user: {
  id: string
  email?: string
  name?: string
}): void {
  if (Sentry) {
    Sentry.setContext('user', {
      id: user.id,
      email: user.email,
      username: user.name,
    })
  }
}

/**
 * Set a custom tag on Sentry.
 */
export function setSentryTag(key: string, value: string): void {
  if (Sentry) {
    Sentry.setTag(key, value)
  }
}
