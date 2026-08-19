import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { accountExistsByEmail, type AccountExistenceLookups } from "./accountExistenceRule.js";

function lookups(applicationUserExists: boolean, authUserExists: boolean) {
  const calls: { app: string[]; auth: string[] } = { app: [], auth: [] };
  const value: AccountExistenceLookups = {
    findApplicationUserByEmail: async (email) => {
      calls.app.push(email);
      return applicationUserExists;
    },
    findAuthUserByEmail: async (email) => {
      calls.auth.push(email);
      return authUserExists;
    },
  };

  return { calls, value };
}

test("an invitation email without an Auth or application user does not have an account", async () => {
  const fixture = lookups(false, false);

  assert.equal(await accountExistsByEmail(" Invitee@Example.com ", fixture.value), false);
  assert.deepEqual(fixture.calls, { app: ["invitee@example.com"], auth: ["invitee@example.com"] });
});

test("an application user is an existing account without requiring an Auth lookup", async () => {
  const fixture = lookups(true, false);

  assert.equal(await accountExistsByEmail("invitee@example.com", fixture.value), true);
  assert.deepEqual(fixture.calls, { app: ["invitee@example.com"], auth: [] });
});

test("an Auth-only orphan is consistently treated as an existing account", async () => {
  const fixture = lookups(false, true);

  assert.equal(await accountExistsByEmail("invitee@example.com", fixture.value), true);
  assert.deepEqual(fixture.calls, { app: ["invitee@example.com"], auth: ["invitee@example.com"] });
});

test("an application-user-only orphan is consistently treated as an existing account", async () => {
  const fixture = lookups(true, false);

  assert.equal(await accountExistsByEmail("invitee@example.com", fixture.value), true);
});

test("invitation inspection and registration use the shared email-only account rule", async () => {
  const organizationServicePath = fileURLToPath(new URL("./organizationService.ts", import.meta.url));
  const source = await readFile(organizationServicePath, "utf8");
  const inspection = source.slice(source.indexOf("export async function inspectInvitationByToken"), source.indexOf("export async function acceptInvitationByToken"));
  const registration = source.slice(source.indexOf("export async function registerInvitationAccount"), source.indexOf("export async function resendOrganizationInvitation"));

  assert.match(inspection, /accountExistsByEmail\(invitation\.email\)/);
  assert.match(registration, /accountExistsByEmail\(invitation\.email\)/);
  assert.doesNotMatch(inspection, /membership_id/);
  assert.doesNotMatch(registration.slice(0, registration.indexOf("createUser")), /membership_id/);
});
