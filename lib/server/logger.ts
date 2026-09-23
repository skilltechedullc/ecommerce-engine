type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    }
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, current]) => [key, serializeValue(current)])
    )
  }

  return value
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const serializedContext = serializeValue(context) as LogContext
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...serializedContext,
  }

  const line = JSON.stringify(payload)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.log(line)
}

export const logger = {
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
}
