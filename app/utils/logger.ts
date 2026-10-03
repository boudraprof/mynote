import pino, { type DestinationStream } from "pino";

type LogLevel = "debug" | "info" | "warn" | "error";

type AppLogger = {
  debug(message: string, context?: string): void;
  info(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, error?: unknown, context?: string): void;
};

const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function isLogLevel(value: string | undefined): value is LogLevel {
  return value !== undefined && LOG_LEVELS.has(value);
}

export function createLogger(
  options: { level?: string; destination?: DestinationStream } = {},
): AppLogger {
  const configuredLevel =
    options.level ??
    (typeof process === "undefined" ? undefined : process.env.LOG_LEVEL);
  const level: LogLevel = isLogLevel(configuredLevel)
    ? configuredLevel
    : "info";

  if (configuredLevel && !isLogLevel(configuredLevel)) {
    console.warn(
      `[logger] Invalid LOG_LEVEL "${configuredLevel}", defaulting to "info".`,
    );
  }

  const backend = pino(
    {
      level,
      browser: { asObject: true },
    },
    options.destination,
  );

  return {
    debug(message, context) {
      backend.debug(context ? { context } : {}, message);
    },
    info(message, context) {
      backend.info(context ? { context } : {}, message);
    },
    warn(message, context) {
      backend.warn(context ? { context } : {}, message);
    },
    error(message, error, context) {
      const fields = {
        ...(context ? { context } : {}),
        ...(error !== undefined ? { err: error } : {}),
      };
      backend.error(fields, message);
    },
  };
}

const logger = createLogger();

export { logger };
export default logger;
