type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, context: string, message: string, data?: Record<string, unknown>): string {
  const ts = formatTimestamp();
  const base = `[${ts}] ${level.toUpperCase()} [${context}] ${message}`;
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

function write(level: LogLevel, context: string, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, context, message, data);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Creates a scoped logger bound to a specific context (e.g. module name).
 * Zero dependencies. Outputs structured text to console.
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      write("debug", context, message, data),
    info: (message: string, data?: Record<string, unknown>) =>
      write("info", context, message, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      write("warn", context, message, data),
    error: (message: string, data?: Record<string, unknown>) =>
      write("error", context, message, data),
  };
}

export type Logger = ReturnType<typeof createLogger>;
