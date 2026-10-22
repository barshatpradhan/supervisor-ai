import { env } from "../../config/environment.js";
import { incrementMetric } from "../../middleware/observabilityMiddleware.js";
import { MemoryRateLimitStore } from "../../middleware/rateLimitStore.js";
import { logger } from "../../utils/logger.js";

/**
 * Daily caps on organization invitation emails: per inviting user and for the whole app. The app
 * total leaves EMAIL_DAILY_QUOTA minus the password-reset reserve, so invitations can never use up
 * the emails password resets need. Days are UTC. A platform admin can grant one user extra emails
 * for the rest of the day. In memory, like the other limiters: counts reset on restart.
 */

const perUser = new MemoryRateLimitStore({ maxKeys: env.rateLimitMaxKeys });
const total = new MemoryRateLimitStore({ maxKeys: 1 });
const extraAllowances = new Map<string, { extra: number; until: number }>();
const TOTAL_KEY = "all";

export type InvitationEmailBlock = "user_daily_limit" | "app_daily_limit";

export const INVITATION_EMAIL_LIMIT_MESSAGES: Record<InvitationEmailBlock, string> = {
  user_daily_limit:
    "You have reached today's invitation email limit. Copy the invitation link instead, or ask a platform admin to raise your limit.",
  app_daily_limit:
    "Today's invitation email limit for the app has been reached. Copy the invitation link instead, or resend after 00:00 UTC.",
};

function nextUtcMidnight(now: number) {
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime();
}

function dailyLimitFor(userId: string, now: number) {
  const allowance = extraAllowances.get(userId);
  if (allowance && allowance.until <= now) extraAllowances.delete(userId);
  const extra = allowance && allowance.until > now ? allowance.extra : 0;
  return env.invitationEmailLimits.perUserDailyMax + extra;
}

/**
 * Reserves one invitation email for `userId`. Returns null when it may be sent, or why not.
 * Call releaseInvitationEmail() if the send then fails, so a failed send costs nothing.
 */
export function reserveInvitationEmail(userId: string, now = Date.now()): InvitationEmailBlock | null {
  const window = nextUtcMidnight(now) - now;
  if ((perUser.peek(userId, now)?.count ?? 0) >= dailyLimitFor(userId, now)) return blocked("user_daily_limit");
  if ((total.peek(TOTAL_KEY, now)?.count ?? 0) >= env.invitationEmailLimits.dailyTotalMax) return blocked("app_daily_limit");
  perUser.hit(userId, window, now);
  total.hit(TOTAL_KEY, window, now);
  return null;
}

export function releaseInvitationEmail(userId: string, now = Date.now()) {
  perUser.refund(userId, now);
  total.refund(TOTAL_KEY, now);
}

function blocked(reason: InvitationEmailBlock) {
  logger.warn("invitation_email_capped", { reason });
  incrementMetric("invitation_email_capped_total", { reason });
  return reason;
}

/** Platform admin: let `userId` send `additionalEmails` more invitation emails today (UTC). */
export function grantInvitationEmailAllowance(userId: string, additionalEmails: number, now = Date.now()) {
  const until = nextUtcMidnight(now);
  const current = extraAllowances.get(userId);
  const extra = (current && current.until > now ? current.extra : 0) + additionalEmails;
  extraAllowances.set(userId, { extra, until });
  return invitationEmailUsage(userId, now);
}

export function invitationEmailUsage(userId: string, now = Date.now()) {
  const dailyLimit = dailyLimitFor(userId, now);
  const sentToday = perUser.peek(userId, now)?.count ?? 0;
  return {
    userId,
    dailyLimit,
    sentToday,
    remainingToday: Math.max(0, dailyLimit - sentToday),
    resetsAt: new Date(nextUtcMidnight(now)).toISOString(),
  };
}

/** Clears all counts and allowances (tests). Restarting the process has the same effect. */
export function resetInvitationEmailQuota() {
  perUser.reset();
  total.reset();
  extraAllowances.clear();
}
