import { env } from "../config/environment.js";

type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const payload = { timestamp: new Date().toISOString(), level, event, ...fields };
  console[level](JSON.stringify(payload));
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
  errorDetails: (error: unknown) => env.isProduction ? undefined : error instanceof Error ? error.stack : String(error),
};
