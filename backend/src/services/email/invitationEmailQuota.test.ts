import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

process.env.SUPABASE_URL ??= "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-only-not-a-key";
Object.assign(process.env, {
  EMAIL_DAILY_QUOTA: "10",
  AUTH_RL_RESET_DAILY_TOTAL_MAX: "4",
  INVITATION_EMAIL_DAILY_PER_USER_MAX: "3",
});
delete process.env.INVITATION_EMAIL_DAILY_TOTAL_MAX; // defaults to quota minus the reset reserve: 6

const quota = await import("./invitationEmailQuota.js");
const { env } = await import("../../config/environment.js");

beforeEach(() => {
  quota.resetInvitationEmailQuota();
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 22, 18, 0, 0) });
  mock.method(console, "warn", () => {});
});
afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

describe("invitation email quota", () => {
  test("the app total defaults to the daily quota minus the password-reset reserve", () => {
    assert.equal(env.invitationEmailLimits.dailyTotalMax, 6);
  });

  test("each inviter gets a daily cap", () => {
    for (let index = 0; index < 3; index += 1) assert.equal(quota.reserveInvitationEmail("admin-a"), null);
    assert.equal(quota.reserveInvitationEmail("admin-a"), "user_daily_limit");
    assert.equal(quota.reserveInvitationEmail("admin-b"), null, "other inviters unaffected");
  });

  test("the app-wide total stops everyone once reached", () => {
    for (const user of ["a", "a", "a", "b", "b", "b"]) assert.equal(quota.reserveInvitationEmail(user), null);
    assert.equal(quota.reserveInvitationEmail("c"), "app_daily_limit");
  });

  test("a failed send is given back", () => {
    for (let index = 0; index < 3; index += 1) quota.reserveInvitationEmail("admin-a");
    quota.releaseInvitationEmail("admin-a");
    assert.equal(quota.reserveInvitationEmail("admin-a"), null);
    assert.equal(quota.reserveInvitationEmail("admin-a"), "user_daily_limit");
  });

  test("a platform admin can raise one user's limit for the rest of the UTC day only", () => {
    for (let index = 0; index < 3; index += 1) quota.reserveInvitationEmail("admin-a");
    assert.equal(quota.reserveInvitationEmail("admin-a"), "user_daily_limit");

    const usage = quota.grantInvitationEmailAllowance("admin-a", 2);
    assert.deepEqual(usage, { userId: "admin-a", dailyLimit: 5, sentToday: 3, remainingToday: 2, resetsAt: "2026-10-23T00:00:00.000Z" });
    assert.equal(quota.reserveInvitationEmail("admin-a"), null);
    assert.equal(quota.reserveInvitationEmail("admin-a"), null);
    assert.equal(quota.reserveInvitationEmail("admin-a"), "user_daily_limit");

    mock.timers.tick(6 * 3600_000); // next UTC day: counts and the extra allowance are gone
    assert.equal(quota.invitationEmailUsage("admin-a").dailyLimit, 3);
    assert.equal(quota.invitationEmailUsage("admin-a").sentToday, 0);
  });

  test("raised limits still respect the app total, which protects the password-reset reserve", () => {
    quota.grantInvitationEmailAllowance("admin-a", 100);
    for (let index = 0; index < 6; index += 1) assert.equal(quota.reserveInvitationEmail("admin-a"), null);
    assert.equal(quota.reserveInvitationEmail("admin-a"), "app_daily_limit");
  });
});
