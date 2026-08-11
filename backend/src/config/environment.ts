import dotenv from "dotenv";

dotenv.config();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_APP_URL ?? "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const frontendAppUrl = process.env.FRONTEND_APP_URL?.trim() || corsOrigins[0];

if (isProduction && corsOrigins.some((origin) => origin === "*" || origin.startsWith("http://localhost"))) {
  throw new Error("CORS_ORIGINS must contain explicit production origins.");
}
if (isProduction) required("GEMINI_API_KEY");

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  port: integer("PORT", 5000),
  apiVersion: process.env.APP_VERSION?.trim() || "0.0.0",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  corsOrigins,
  frontendAppUrl,
  jsonLimit: process.env.JSON_BODY_LIMIT?.trim() || "1mb",
  rateLimitWindowMs: integer("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: integer("RATE_LIMIT_MAX", 120),
});
