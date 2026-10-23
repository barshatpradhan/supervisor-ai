/** OpenAPI fragments for people lists that carry avatars (avatar Phase 2). */

const ok = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
});
const forbidden = { $ref: "#/components/responses/Forbidden" };
const uuidPath = (name: string) => ({ name, in: "path", required: true, schema: { type: "string", format: "uuid" } });

const AVATAR_RULE =
  "avatarVariant is the person's chosen avatar ID (users.avatar_variant) or null for initials. It appears only beside a " +
  "name the response already shows, and is read live on every request.";

export const avatarSchemas = {
  AvatarVariant: {
    type: ["string", "null"],
    pattern: "^p(0[1-9]|1[0-2])-s([1-6])-c([1-6])-a([0-3])$",
    example: "p03-s4-c2-a1",
    description: "An avatar ID, or null to show initials.",
  },
};

export const avatarPaths = {
  "/supervisors/employees": {
    get: {
      summary: "Assignable employees with skills and capacity",
      description: `Organization admins and supervisors. Each employee carries avatarVariant. ${AVATAR_RULE}`,
      responses: { "200": ok("Employees"), "403": forbidden },
    },
  },
  "/projects/{projectId}/recommendations": {
    get: {
      summary: "The latest recommendation run for a project",
      description:
        `Each recommendation carries avatarVariant, read when the run is loaded (never stored with it), so a changed ` +
        `avatar shows without regenerating. ${AVATAR_RULE}`,
      parameters: [uuidPath("projectId")],
      responses: { "200": ok("Recommendations"), "403": forbidden, "404": { description: "No recommendations yet" } },
    },
    post: {
      summary: "Generate a recommendation run",
      description: `Same response shape as GET, including avatarVariant. ${AVATAR_RULE}`,
      parameters: [uuidPath("projectId")],
      responses: { "200": ok("Recommendations"), "400": { description: "No analysis or no employees" }, "403": forbidden },
    },
  },
  "/organizations/{organizationId}/members": {
    get: {
      summary: "Organization memberships",
      description: `Organization admins and supervisors. avatarVariant is null for members shown only by email. ${AVATAR_RULE}`,
      parameters: [uuidPath("organizationId")],
      responses: { "200": ok("Members"), "403": forbidden },
    },
  },
  "/organizations/{organizationId}/teams": {
    get: {
      summary: "Teams with their lead and members",
      description: `Organization admins and supervisors. The lead and each member carry avatarVariant. ${AVATAR_RULE}`,
      parameters: [uuidPath("organizationId")],
      responses: { "200": ok("Teams"), "403": forbidden },
    },
  },
  "/admin/users/directory": {
    get: {
      summary: "Platform user directory (one page)",
      description: `Platform admins. avatarVariant for the entries on this page; null when an entry has no name. ${AVATAR_RULE}`,
      responses: { "200": ok("Directory page"), "403": forbidden },
    },
  },
};
