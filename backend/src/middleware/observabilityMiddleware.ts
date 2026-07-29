import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

const metrics = new Map<string, number>();
const startedAt = process.uptime();

export function incrementMetric(name: string, labels: Record<string, string> = {}, value = 1) {
  const key = `${name}{${Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}="${v}"`).join(",")}}`;
  metrics.set(key, (metrics.get(key) ?? 0) + value);
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.header("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  const started = performance.now();
  res.setHeader("X-Request-Id", req.requestId);
  res.on("finish", () => {
    const durationMs = Math.round(performance.now() - started);
    incrementMetric("http_requests_total", { method: req.method, status: String(res.statusCode) });
    if (res.statusCode >= 500) incrementMetric("http_errors_total", { status: String(res.statusCode) });
    logger.info("http_request_completed", { requestId: req.requestId, organizationId: req.organization?.id, userId: req.user?.id, endpoint: req.originalUrl.split("?")[0], method: req.method, statusCode: res.statusCode, durationMs });
  });
  next();
}

export function metricsText() {
  const lines = ["# HELP process_uptime_seconds Process uptime in seconds.", "# TYPE process_uptime_seconds gauge", `process_uptime_seconds ${Math.round(process.uptime() - startedAt)}`];
  for (const [key, value] of metrics) lines.push(`${key} ${value}`);
  return `${lines.join("\n")}\n`;
}
