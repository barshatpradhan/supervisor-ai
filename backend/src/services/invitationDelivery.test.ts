import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import {
  createOrganizationForAuthenticatedUser,
  createOrganizationInvitation,
  issueInvitationAcceptanceLink,
  resendOrganizationInvitation,
} from "./organizationService.js";

// Integration tests against the configured Supabase project, like taskService.test.ts.
// Brevo is simulated with a mocked fetch, so no email is ever sent.

const BREVO_ENV = {
  TRANSACTIONAL_EMAIL_PROVIDER: "brevo",
  BREVO_API_KEY: "test-brevo-key",
  INVITATION_EMAIL_FROM: "invites@example.test",
  FRONTEND_APP_URL: process.env.FRONTEND_APP_URL ?? "http://localhost:5173",
};

interface TestUser {
  appUserId: string;
  authUserId: string;
}

async function createTestUser(email: string): Promise<TestUser> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: `Invite-test-${crypto.randomUUID()}`,
    email_confirm: true,
  });
  assert.equal(error, null, error?.message);
  assert.ok(data.user);

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({ auth_user_id: data.user.id, email, role: "supervisor" })
    .select("id")
    .single<{ id: string }>();
  assert.equal(userError, null, userError?.message);
  assert.ok(user);

  return { appUserId: user.id, authUserId: data.user.id };
}

async function withMockedBrevo<T>(status: number, body: string, action: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  const previous = Object.fromEntries(Object.keys(BREVO_ENV).map((key) => [key, process.env[key]]));
  Object.assign(process.env, BREVO_ENV);
  // Intercept only Brevo; Supabase uses the same global fetch and must keep working.
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://api.brevo.com/")) return new Response(body || null, { status });
    return originalFetch(input, init);
  };

  try {
    return await action();
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function readStoredMetadata(invitationId: string) {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, profile")
    .eq("id", invitationId)
    .maybeSingle<{ id: string; profile: Record<string, Record<string, unknown>> }>();
  assert.equal(error, null, error?.message);
  return data;
}

test("invitation email delivery failures", async (t) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const users: TestUser[] = [];
  let organizationId: string | null = null;

  t.after(async () => {
    if (organizationId) await supabase.from("organizations").delete().eq("id", organizationId);
    for (const user of users) {
      await supabase.from("users").delete().eq("id", user.appUserId);
      await supabase.auth.admin.deleteUser(user.authUserId);
    }
  });

  const admin = await createTestUser(`invite-admin-${suffix}@example.test`);
  users.push(admin);
  const supervisor = await createTestUser(`invite-supervisor-${suffix}@example.test`);
  users.push(supervisor);

  const created = await createOrganizationForAuthenticatedUser(admin.authUserId, {
    name: `Invitation delivery test ${suffix}`,
    slug: `invitation-delivery-test-${suffix}`,
  });
  organizationId = created.organization.id;

  const { error: membershipError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: supervisor.appUserId,
    role: "supervisor",
    status: "active",
    invited_by_user_id: admin.appUserId,
    invited_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
  });
  assert.equal(membershipError, null, membershipError?.message);

  const inviteeEmail = `invitee-${suffix}@example.test`;
  let invitationId = "";

  await t.test("a failed send keeps the invitation and records why", async () => {
    const result = await withMockedBrevo(
      400,
      JSON.stringify({ code: "unauthorized", message: `Sender not valid for ${inviteeEmail}` }),
      () =>
        createOrganizationInvitation(admin.authUserId, organizationId as string, {
          email: inviteeEmail,
          role: "employee",
          profile: { full_name: "Delivery Test" },
        } as Parameters<typeof createOrganizationInvitation>[2])
    );

    invitationId = result.invitation.id;
    assert.equal(result.deliveryStatus, "failed");
    assert.equal(result.invitation.delivery_status, "failed");
    assert.equal(result.debug, undefined);

    const stored = await readStoredMetadata(invitationId);
    assert.ok(stored, "the invitation row must survive a failed send");
    const meta = stored.profile.__invitation_meta;
    assert.equal(meta.delivery_status, "failed");
    assert.match(String(meta.delivery_error), /Brevo responded 400/);
    assert.match(String(meta.delivery_error), /unauthorized/);
    assert.doesNotMatch(String(meta.delivery_error), new RegExp(`${inviteeEmail}|test-brevo-key`));
  });

  await t.test("resend after a failure delivers and rotates the token", async () => {
    const before = await readStoredMetadata(invitationId);
    assert.ok(before);
    const previousHash = before.profile.__invitation_meta.token_hash;

    // Step past the 60-second resend cooldown.
    const backdated = {
      ...before.profile,
      __invitation_meta: {
        ...before.profile.__invitation_meta,
        last_sent_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
    };
    await supabase.from("organization_invitations").update({ profile: backdated }).eq("id", invitationId);

    const result = await withMockedBrevo(201, JSON.stringify({ messageId: "<test@relay>" }), () =>
      resendOrganizationInvitation(admin.authUserId, organizationId as string, invitationId)
    );

    assert.equal(result.deliveryStatus, "sent");
    assert.equal(result.invitation.delivery_status, "sent");
    assert.equal(result.invitation.delivery_error, null);

    const after = await readStoredMetadata(invitationId);
    assert.ok(after);
    assert.notEqual(after.profile.__invitation_meta.token_hash, previousHash);
  });

  await t.test("the resend cooldown still applies", async () => {
    await assert.rejects(
      withMockedBrevo(201, "", () =>
        resendOrganizationInvitation(admin.authUserId, organizationId as string, invitationId)
      ),
      (error: unknown) => error instanceof AppError && error.statusCode === 429
    );
  });

  await t.test("only organization admins can get an invite link", async () => {
    await assert.rejects(
      issueInvitationAcceptanceLink(supervisor.authUserId, organizationId as string, invitationId),
      (error: unknown) => error instanceof AppError && error.statusCode === 403
    );

    const before = await readStoredMetadata(invitationId);
    const link = await withMockedBrevo(201, "", () =>
      issueInvitationAcceptanceLink(admin.authUserId, organizationId as string, invitationId)
    );
    assert.match(link.acceptanceUrl, /\/invitations\/accept\?token=/);

    const after = await readStoredMetadata(invitationId);
    assert.notEqual(after?.profile.__invitation_meta.token_hash, before?.profile.__invitation_meta.token_hash);
    // The raw token is never stored, only its hash.
    const rawToken = new URL(link.acceptanceUrl).searchParams.get("token");
    assert.ok(rawToken);
    assert.doesNotMatch(JSON.stringify(after?.profile), new RegExp(rawToken));
  });
});
