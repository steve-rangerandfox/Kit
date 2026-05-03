// src/utils/logger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  return entry.data ? `${base} ${JSON.stringify(entry.data)}` : base;
}

export const logger = {
  info(message: string, data?: unknown): void {
    const entry: LogEntry = { level: 'info', message, data, timestamp: new Date().toISOString() };
    console.log(formatEntry(entry));
  },

  warn(message: string, data?: unknown): void {
    const entry: LogEntry = { level: 'warn', message, data, timestamp: new Date().toISOString() };
    console.warn(formatEntry(entry));
  },

  error(message: string, data?: unknown): void {
    const entry: LogEntry = { level: 'error', message, data, timestamp: new Date().toISOString() };
    console.error(formatEntry(entry));
  },

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      const entry: LogEntry = { level: 'debug', message, data, timestamp: new Date().toISOString() };
      console.debug(formatEntry(entry));
    }
  },

  serviceResult(service: string, success: boolean, urlOrError?: string): void {
    if (success) {
      logger.info(`✅ ${service} provisioned successfully`, { url: urlOrError });
    } else {
      logger.error(`❌ ${service} provisioning failed`, { error: urlOrError });
    }
  },
};
