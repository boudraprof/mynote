/**
 * Structured logger for React Native
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = __DEV__ ? 'debug' : 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString()
  const prefix = context ? `[${context}]` : ''
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`
}

const logger = {
  debug(message: string, context?: string): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context))
    }
  },

  info(message: string, context?: string): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context))
    }
  },

  warn(message: string, context?: string): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context))
    }
  },

  error(message: string, error?: unknown, context?: string): void {
    if (shouldLog('error')) {
      const errorDetails = error instanceof Error 
        ? `\n${error.stack}` 
        : error 
          ? `\n${JSON.stringify(error)}` 
          : ''
      console.error(formatMessage('error', message + errorDetails, context))
    }
  },
}

export default logger
