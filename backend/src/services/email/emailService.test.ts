import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AppError } from "../../utils/appError.js";
import { createEmailService } from "./emailService.js";
import { buildOrganizationInvitationAcceptanceUrl } from "./invitationUrl.js";

const invitation = {
  to: "employee@example.test",
  organizationName: "Northstar Digital Labs",
  invitedRole: "employee" as const,
  invitedByName: "Maya Chen",
  acceptanceUrl: "http://localhost:5173/invitations/accept?token=raw-test-token",
  expiresAt: "2026-08-17T00:00:00.000Z",
  invitationId: "invitation-1",
  organizationId: "organization-1",
};

function withEnvironment(values: Record<string, string | undefined>, action: () => Promise<void> | void) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  return Promise.resolve(action()).finally(() => {
    previous.forEach((value, key) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });
}

test("Resend is selected in development and sends the configured invitation request", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  let request: RequestInit | undefined;
  const entries: string[] = [];
  globalThis.fetch = async (_url, init) => {
    request = init;
    return new Response(null, { status: 202 });
  };
  console.info = (entry: string) => entries.push(entry);

  try {
    await withEnvironment({
      NODE_ENV: "development",
      TRANSACTIONAL_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "test-server-key",
      INVITATION_EMAIL_FROM: "invites@example.test",
    }, async () => {
      await createEmailService().sendOrganizationInvitation(invitation);
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
  }

  assert.ok(request);
  const body = JSON.parse(String(request.body));
  assert.deepEqual(body.to, [invitation.to]);
  assert.equal(body.from, "invites@example.test");
  assert.match(body.html, /http:\/\/localhost:5173\/invitations\/accept\?token=raw-test-token/);
  assert.equal((request.headers as Record<string, string>).Authorization, "Bearer test-server-key");
  assert.doesNotMatch(entries.join("\n"), /raw-test-token|accept\?token=|test-server-key|employee@example\.test/);
});

test("invitation links use the configured frontend URL and require it to be valid", async () => {
  await withEnvironment({ FRONTEND_APP_URL: "http://localhost:5173/" }, () => {
    assert.equal(
      buildOrganizationInvitationAcceptanceUrl("url-token"),
      "http://localhost:5173/invitations/accept?token=url-token"
    );
  });

  await withEnvironment({ FRONTEND_APP_URL: undefined }, () => {
    assert.throws(() => buildOrganizationInvitationAcceptanceUrl("url-token"), AppError);
  });
});

test("console delivery is available only when explicitly selected and does not log the token", async () => {
  const originalInfo = console.info;
  const entries: string[] = [];
  console.info = (entry: string) => entries.push(entry);

  try {
    await withEnvironment({
      NODE_ENV: "development",
      TRANSACTIONAL_EMAIL_PROVIDER: "console",
      RESEND_API_KEY: undefined,
      INVITATION_EMAIL_FROM: undefined,
    }, async () => {
      await createEmailService().sendOrganizationInvitation(invitation);
    });
  } finally {
    console.info = originalInfo;
  }

  assert.equal(entries.length, 1);
  assert.match(entries[0], /"provider":"console"/);
  assert.match(entries[0], /"recipientDomain":"example.test"/);
  assert.doesNotMatch(entries[0], /raw-test-token|accept\?token=|employee@example\.test/);
});

test("missing Resend credentials fail safely instead of falling back to console", async () => {
  await withEnvironment({
    TRANSACTIONAL_EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: undefined,
    INVITATION_EMAIL_FROM: "invites@example.test",
  }, () => {
    assert.throws(() => createEmailService(), (error: unknown) =>
      error instanceof AppError && error.message === "Transactional email is not configured for organization invitations."
    );
  });

  await withEnvironment({
    TRANSACTIONAL_EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "test-server-key",
    INVITATION_EMAIL_FROM: undefined,
  }, () => {
    assert.throws(() => createEmailService(), (error: unknown) =>
      error instanceof AppError && error.message === "Transactional email is not configured for organization invitations."
    );
  });
});

test("a Resend failure produces the safe application error and does not fall back", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  let calls = 0;
  const entries: string[] = [];
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 500 });
  };
  console.info = (entry: string) => entries.push(entry);

  try {
    await withEnvironment({
      TRANSACTIONAL_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "test-server-key",
      INVITATION_EMAIL_FROM: "invites@example.test",
    }, async () => {
      await assert.rejects(
        createEmailService().sendOrganizationInvitation(invitation),
        (error: unknown) => error instanceof AppError && error.message === "Unable to send organization invitation email."
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
  }

  assert.equal(calls, 1);
  assert.equal(entries.some((entry) => entry.includes('"provider":"console"')), false);
});

test("organization invitations do not use Supabase invitation delivery", async () => {
  const organizationServicePath = fileURLToPath(new URL("../organizationService.ts", import.meta.url));
  const source = await readFile(organizationServicePath, "utf8");

  assert.doesNotMatch(source, /inviteUserByEmail|generateLink/);
});
