/** OpenAPI fragments for organization-admin management of member roles and teams. */
import { avatarPaths } from "./avatarsOpenApi.js";

const ok = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
});
const json = (schema: Record<string, unknown>, example?: Record<string, unknown>) => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});
const forbidden = { $ref: "#/components/responses/Forbidden" };
const notFound = (what: string) => ({ description: `${what} not found in this organization (ids from other organizations answer 404)` });
const tooMany = { description: "Too many changes: 30 per minute per admin" };
const uuidPath = (name: string) => ({ name, in: "path", required: true, schema: { type: "string", format: "uuid" } });
const ORG = uuidPath("organizationId");

const ADMIN_RULE =
  "Organization admins only (others get 403). The organization comes from the verified X-Organization-Id context, " +
  "never from the body; every member, team and profile id is checked to belong to it. Each change runs in one " +
  "database transaction and writes an activity log entry.";

const Role = { type: "string", enum: ["organization_admin", "supervisor", "employee"] };

export const organizationAdminSchemas = {
  RoleChangePreview: {
    type: "object",
    properties: {
      membershipId: { type: "string", format: "uuid" },
      fromRole: Role,
      toRole: Role,
      unchanged: { type: "boolean" },
      blockedReason: {
        type: ["string", "null"],
        enum: ["last_admin", "has_open_tasks", "leads_teams", "member_not_active", null],
        description: "The first rule that blocks the change, or null when it is allowed.",
      },
      openTasks: { type: "integer", description: "Open tasks (not completed or cancelled) assigned to the member." },
      completedTasks: { type: "integer" },
      teamsLed: { type: "array", items: { type: "string" } },
      teamsMemberOf: { type: "array", items: { type: "string" } },
      needsProfile: {
        type: ["string", "null"],
        enum: ["employee", "supervisor", null],
        description: "The profile the new role needs and the member doesn't have yet. Send fullName for it.",
      },
      suggestedName: { type: ["string", "null"], description: "The member's other profile name, to prefill fullName." },
    },
  },
};

export const organizationAdminPaths = {
  "/organizations/{organizationId}/members/{membershipId}/role-change-preview": {
    get: {
      summary: "What a role change would do",
      description:
        `${ADMIN_RULE} Read-only. Lists open and completed tasks, teams led and joined, the profile that would be ` +
        "created and the first blocking rule, for the confirmation dialog.",
      parameters: [ORG, uuidPath("membershipId"), { name: "role", in: "query", required: true, schema: Role }],
      responses: {
        "200": ok("RoleChangePreview"),
        "400": { description: "Invalid role or id" },
        "403": forbidden,
        "404": notFound("Member"),
      },
    },
  },
  "/organizations/{organizationId}/members/{membershipId}/role": {
    patch: {
      summary: "Change a member's role",
      description:
        `${ADMIN_RULE} Active members only. Profiles are never deleted: when the new role needs a profile the member ` +
        "doesn't have (employee or supervisor), it is created with fullName (or the other profile's name). Becoming " +
        "an organization_admin creates no profile. Takes effect on the member's next request. Refused with 409 when it " +
        "would leave no active admin (safe against simultaneous changes), when an employee still has open tasks, or " +
        "when the member leads a team and would become an employee.",
      parameters: [ORG, uuidPath("membershipId")],
      requestBody: json(
        {
          type: "object",
          required: ["role"],
          properties: { role: Role, fullName: { type: "string", maxLength: 120 } },
        },
        { role: "supervisor", fullName: "Aisha Bello" }
      ),
      responses: {
        "200": ok("The member as the member directory shows them"),
        "400": { description: "Invalid role, id or name, or a name is needed for the new profile" },
        "403": forbidden,
        "404": notFound("Member"),
        "409": { description: "last_admin, has_open_tasks, leads_teams or member_not_active" },
        "429": tooMany,
      },
    },
  },
  "/organizations/{organizationId}/teams": {
    ...avatarPaths["/organizations/{organizationId}/teams"],
    post: {
      summary: "Create a team",
      description:
        `${ADMIN_RULE} Names are 1-80 characters and unique within the organization regardless of case. The lead is ` +
        "optional and must be an active supervisor, or an admin with a supervisor profile.",
      parameters: [ORG],
      requestBody: json(
        {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", maxLength: 80 },
            description: { type: "string", maxLength: 500 },
            leadSupervisorId: { type: ["string", "null"], format: "uuid" },
          },
        },
        { name: "Platform", leadSupervisorId: null }
      ),
      responses: {
        "201": ok("The new team's id"),
        "400": { description: "Invalid name or id" },
        "403": forbidden,
        "409": { description: "team_name_taken or invalid_lead" },
        "429": tooMany,
      },
    },
  },
  "/organizations/{organizationId}/teams/{teamId}": {
    patch: {
      summary: "Rename a team, edit its description, or set or clear its lead",
      description: `${ADMIN_RULE} Fields left out stay as they are; description "" clears it; leadSupervisorId null removes the lead.`,
      parameters: [ORG, uuidPath("teamId")],
      requestBody: json({
        type: "object",
        properties: {
          name: { type: "string", maxLength: 80 },
          description: { type: "string", maxLength: 500 },
          leadSupervisorId: { type: ["string", "null"], format: "uuid" },
        },
      }),
      responses: {
        "200": ok("Updated"),
        "400": { description: "Nothing to update, or invalid fields" },
        "403": forbidden,
        "404": notFound("Team"),
        "409": { description: "team_name_taken or invalid_lead" },
        "429": tooMany,
      },
    },
    delete: {
      summary: "Delete an empty team",
      description: `${ADMIN_RULE} Refused while the team has any members, assignable or not; the message gives both counts.`,
      parameters: [ORG, uuidPath("teamId")],
      responses: { "200": ok("Deleted"), "403": forbidden, "404": notFound("Team"), "409": { description: "team_not_empty" }, "429": tooMany },
    },
  },
  "/organizations/{organizationId}/teams/{teamId}/members": {
    post: {
      summary: "Add an employee to a team",
      description: `${ADMIN_RULE} The employee must be assignable (an active member whose role is employee). People may be in several teams.`,
      parameters: [ORG, uuidPath("teamId")],
      requestBody: json({ type: "object", required: ["employeeId"], properties: { employeeId: { type: "string", format: "uuid" } } }),
      responses: { "201": ok("Added"), "403": forbidden, "404": notFound("Team or employee"), "409": { description: "already_in_team" }, "429": tooMany },
    },
  },
  "/organizations/{organizationId}/teams/{teamId}/members/{employeeId}": {
    delete: {
      summary: "Remove an employee from a team",
      description: `${ADMIN_RULE} Works for people who are no longer assignable too.`,
      parameters: [ORG, uuidPath("teamId"), uuidPath("employeeId")],
      responses: { "200": ok("Removed"), "403": forbidden, "404": notFound("Team or employee"), "409": { description: "not_in_team" }, "429": tooMany },
    },
  },
  "/organizations/{organizationId}/teams/{teamId}/members/{employeeId}/move": {
    post: {
      summary: "Move an employee to another team in one step",
      description: `${ADMIN_RULE} Removes the employee from {teamId} and adds them to toTeamId together, or does neither.`,
      parameters: [ORG, uuidPath("teamId"), uuidPath("employeeId")],
      requestBody: json({ type: "object", required: ["toTeamId"], properties: { toTeamId: { type: "string", format: "uuid" } } }),
      responses: {
        "200": ok("Moved"),
        "400": { description: "toTeamId is the same team" },
        "403": forbidden,
        "404": notFound("Team or employee"),
        "409": { description: "already_in_team or not_in_team" },
        "429": tooMany,
      },
    },
  },
  "/organizations/{organizationId}/unassignable-open-tasks": {
    get: {
      summary: "Open tasks whose assignee can no longer be assigned",
      description:
        `${ADMIN_RULE} Read-only. Tasks left with someone who is suspended or no longer in the employee role, for ` +
        "example when an assignment and a role change happen at the same moment. Shown on the team page.",
      parameters: [ORG],
      responses: { "200": ok("Tasks"), "403": forbidden },
    },
  },
};
