import assert from "node:assert/strict";
import test from "node:test";
import { shouldReturnInvitationDebugUrl } from "./invitationDebug.js";

test("invitation acceptance URLs can never be returned in production debug responses", () => {
  assert.equal(
    shouldReturnInvitationDebugUrl({ NODE_ENV: "production", INVITATION_DEBUG_RETURN_URL: "true" }),
    false
  );
  assert.equal(
    shouldReturnInvitationDebugUrl({ NODE_ENV: "development", INVITATION_DEBUG_RETURN_URL: "true" }),
    true
  );
  assert.equal(shouldReturnInvitationDebugUrl({ NODE_ENV: "development" }), false);
});
