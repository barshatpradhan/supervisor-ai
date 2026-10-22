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

function nonNegativeInteger(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_APP_URL ?? "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const frontendAppUrl = process.env.FRONTEND_APP_URL?.trim() || corsOrigins[0];

if (isProduction && corsOrigins.some((origin) => origin === "*" || origin.startsWith("http://localhost"))) {
  throw new Error("CORS_ORIGINS must contain explicit production origins.");
}
if (isProduction) required("GEMINI_API_KEY");

// Daily email budget shared by password-reset and organization invitation emails (the SMTP
// provider's free plan allows 300 a day). Invitations get what the reset reserve leaves.
const emailDailyQuota = integer("EMAIL_DAILY_QUOTA", 300);
const resetDailyTotalMax = integer("AUTH_RL_RESET_DAILY_TOTAL_MAX", 100);
const invitationEmailDailyTotalMax = integer(
  "INVITATION_EMAIL_DAILY_TOTAL_MAX",
  Math.max(1, emailDailyQuota - resetDailyTotalMax)
);
if (invitationEmailDailyTotalMax + resetDailyTotalMax > emailDailyQuota) {
  throw new Error(
    "INVITATION_EMAIL_DAILY_TOTAL_MAX plus AUTH_RL_RESET_DAILY_TOTAL_MAX must not exceed EMAIL_DAILY_QUOTA."
  );
}

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
  /** Hard cap on keys each in-memory rate-limit store tracks before evicting the oldest. */
  rateLimitMaxKeys: integer("RATE_LIMIT_MAX_KEYS", 50_000),
  /**
   * Proxies in front of the app whose X-Forwarded-For entry is trusted when deriving the client IP.
   * 0 (default) trusts none, so req.ip is the socket address. On Render use 1. Never "true": a hop
   * count stops clients from spoofing their IP with extra X-Forwarded-For entries.
   */
  trustProxyHops: nonNegativeInteger("TRUST_PROXY_HOPS", 0),
  /** Limits for abusable auth endpoints, on top of the global limiter. Counts are per window. */
  authRateLimits: Object.freeze({
    loginWindowMs: integer("AUTH_RL_LOGIN_WINDOW_MS", 15 * MINUTE),
    loginIpMax: integer("AUTH_RL_LOGIN_IP_MAX", 30),
    loginEmailMax: integer("AUTH_RL_LOGIN_EMAIL_MAX", 20),
    loginPairWindowMs: integer("AUTH_RL_LOGIN_PAIR_WINDOW_MS", 10 * MINUTE),
    loginPairMax: integer("AUTH_RL_LOGIN_PAIR_MAX", 5),
    registerWindowMs: integer("AUTH_RL_REGISTER_WINDOW_MS", HOUR),
    registerIpMax: integer("AUTH_RL_REGISTER_IP_MAX", 5),
    registerEmailMax: integer("AUTH_RL_REGISTER_EMAIL_MAX", 3),
    resetIpWindowMs: integer("AUTH_RL_RESET_IP_WINDOW_MS", 15 * MINUTE),
    resetIpMax: integer("AUTH_RL_RESET_IP_MAX", 5),
    resetEmailWindowMs: integer("AUTH_RL_RESET_EMAIL_WINDOW_MS", HOUR),
    resetEmailMax: integer("AUTH_RL_RESET_EMAIL_MAX", 3),
    resetEmailDailyMax: integer("AUTH_RL_RESET_EMAIL_DAILY_MAX", 5),
    resetDailyTotalMax,
    resetConfirmIpMax: integer("AUTH_RL_RESET_CONFIRM_IP_MAX", 10),
    invitationWindowMs: integer("AUTH_RL_INVITATION_WINDOW_MS", 15 * MINUTE),
    invitationInspectIpMax: integer("AUTH_RL_INVITATION_INSPECT_IP_MAX", 30),
    invitationRegisterIpMax: integer("AUTH_RL_INVITATION_REGISTER_IP_MAX", 10),
    invitationAcceptIpMax: integer("AUTH_RL_INVITATION_ACCEPT_IP_MAX", 20),
    adminCreateUserWindowMs: integer("AUTH_RL_ADMIN_CREATE_USER_WINDOW_MS", HOUR),
    adminCreateUserMax: integer("AUTH_RL_ADMIN_CREATE_USER_MAX", 20),
    /** Retry-After sent when Supabase Auth itself rate-limits a sign-in. */
    upstreamRetryAfterSeconds: integer("AUTH_RL_UPSTREAM_RETRY_AFTER_SECONDS", 60),
    avatarUpdateWindowMs: integer("AUTH_RL_AVATAR_UPDATE_WINDOW_MS", 15 * MINUTE),
    avatarUpdateMax: integer("AUTH_RL_AVATAR_UPDATE_MAX", 20),
  }),
  /** Organization invitation emails per UTC day (sent through the transactional email provider). */
  invitationEmailLimits: Object.freeze({
    emailDailyQuota,
    perUserDailyMax: integer("INVITATION_EMAIL_DAILY_PER_USER_MAX", 25),
    dailyTotalMax: invitationEmailDailyTotalMax,
  }),
});
