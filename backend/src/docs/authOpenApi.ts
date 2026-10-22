/** OpenAPI fragments for the rate-limited auth, invitation and account-creation endpoints. */

const json = (schema: Record<string, unknown>) => ({ "application/json": { schema } });
const tooMany = { $ref: "#/components/responses/TooManyRequests" };
const success = { description: "Success", content: json({ $ref: "#/components/schemas/Success" }) };
const validation = { description: "Validation error", content: json({ $ref: "#/components/schemas/Error" }) };
const email = { type: "string", format: "email" };
const password = { type: "string", format: "password" };
const token = { name: "token", in: "path", required: true, schema: { type: "string" } };

export const authResponses = {
  TooManyRequests: {
    description:
      "Rate limited. The message is always the same generic text and never says which limit was reached " +
      "or whether an account exists. Wait for Retry-After seconds before trying again.",
    headers: {
      "Retry-After": { description: "Seconds to wait before retrying.", schema: { type: "integer", minimum: 1 } },
    },
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
        example: {
          success: false,
          message: "Too many attempts. Please wait a moment and try again.",
          error: "Too many attempts. Please wait a moment and try again.",
        },
      },
    },
  },
};

export const authPaths = {
  "/auth/login": {
    post: {
      security: [],
      summary: "Sign in",
      description:
        "Limited per client IP, per email and per IP+email pair; only failed attempts count, and a successful " +
        "sign-in clears the pair counter. When Supabase Auth itself throttles sign-ins, the same 429 is returned.",
      requestBody: { required: true, content: json({ type: "object", required: ["email", "password"], properties: { email, password } }) },
      responses: {
        "200": success,
        "400": validation,
        "401": { description: "Invalid email or password.", content: json({ $ref: "#/components/schemas/Error" }) },
        "429": tooMany,
        "503": { description: "The authentication service is unreachable." },
      },
    },
  },
  "/auth/register": {
    post: { security: [], summary: "Create an account and organization", description: "Limited per IP and per email; every attempt counts.", responses: { "201": success, "400": validation, "429": tooMany } },
  },
  "/auth/signup": {
    post: { security: [], summary: "Legacy employee signup (410 unless enabled)", description: "Same limits as /auth/register.", responses: { "201": success, "400": validation, "410": { description: "Disabled" }, "429": tooMany } },
  },
  "/auth/password-reset": {
    post: {
      security: [],
      summary: "Request a password-reset email",
      description:
        "Always answers the same whether or not the account exists. Limited per IP, per email per hour, per " +
        "email per UTC day, and by a daily total for the whole app; after the daily total, everyone receives 429 " +
        "until the next UTC midnight.",
      requestBody: { required: true, content: json({ type: "object", required: ["email"], properties: { email } }) },
      responses: { "200": success, "400": validation, "429": tooMany },
    },
  },
  "/auth/password-reset/confirm": {
    post: { summary: "Set a new password with a recovery session", description: "Limited per IP.", responses: { "200": success, "400": validation, "401": { $ref: "#/components/responses/Unauthorized" }, "429": tooMany } },
  },
  "/invitations/{token}": {
    get: { security: [], summary: "Inspect an invitation", description: "Limited per IP to stop token scanning.", parameters: [token], responses: { "200": success, "404": { description: "Not found" }, "429": tooMany } },
  },
  "/invitations/{token}/register": {
    post: { security: [], summary: "Create an account from an invitation", description: "Limited per IP.", parameters: [token], responses: { "201": success, "400": validation, "429": tooMany } },
  },
  "/invitations/{token}/accept": {
    post: { summary: "Accept an invitation as the signed-in user", description: "Limited per IP.", parameters: [token], responses: { "200": success, "401": { $ref: "#/components/responses/Unauthorized" }, "429": tooMany } },
  },
  "/admin/invitation-email-allowances": {
    post: {
      summary: "Platform admin: raise one user's invitation email limit for the rest of today (UTC)",
      description:
        "Adds extra organization invitation emails for one user until 00:00 UTC. The app-wide daily invitation " +
        "total still applies, so the password-reset email reserve is never used up.",
      requestBody: {
        required: true,
        content: json({
          type: "object",
          required: ["userId", "additionalEmails"],
          properties: { userId: { type: "string", format: "uuid" }, additionalEmails: { type: "integer", minimum: 1, maximum: 1000 } },
        }),
      },
      responses: { "200": success, "400": validation, "403": { $ref: "#/components/responses/Forbidden" }, "404": { description: "User not found" } },
    },
  },
  "/admin/users": {
    post: { summary: "Platform admin: create a user and send their invitation email", description: "Limited per platform admin.", responses: { "201": success, "400": validation, "403": { $ref: "#/components/responses/Forbidden" }, "429": tooMany } },
  },
};
