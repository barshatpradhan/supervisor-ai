import { Router } from "express";
import {
  acceptOrganizationInvitationHandler,
  createOrganizationHandler,
  createOrganizationInvitationHandler,
  getOrganizationHandler,
  listCurrentUserOrganizationsHandler,
  listOrganizationInvitationsHandler,
  listOrganizationMembersHandler,
  listOrganizationTeamsHandler,
  resendOrganizationInvitationHandler,
  issueInvitationLinkHandler,
  revokeOrganizationInvitationHandler,
} from "../controllers/organizationController.js";
import {
  addTeamMemberHandler,
  changeMemberRoleHandler,
  createTeamHandler,
  deleteTeamHandler,
  listUnassignableOpenTasksHandler,
  moveTeamMemberHandler,
  previewMemberRoleChangeHandler,
  removeTeamMemberHandler,
  updateTeamHandler,
} from "../controllers/organizationAdminController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";
import { createUserRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/** Organization-admin role and team changes. The limiter runs after authentication (per user). */
const adminOnly = [authenticateUser, resolveOrganizationContext, requireOrganizationRole("organization_admin")];
const adminWriteLimit = createUserRateLimiter({
  name: "organization-admin-write",
  max: 30,
  windowMs: 60_000,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

router.get("/", authenticateUser, listCurrentUserOrganizationsHandler);
router.post("/", authenticateUser, createOrganizationHandler);
router.post(
  "/invitations/accept",
  authenticateUser,
  acceptOrganizationInvitationHandler
);

router.get(
  "/:organizationId",
  authenticateUser,
  resolveOrganizationContext,
  getOrganizationHandler
);

router.get(
  "/:organizationId/teams",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  listOrganizationTeamsHandler
);

router.get(
  "/:organizationId/members",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  listOrganizationMembersHandler
);

router.get(
  "/:organizationId/invitations",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin"),
  listOrganizationInvitationsHandler
);

router.post(
  "/:organizationId/invitations",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin"),
  createOrganizationInvitationHandler
);

router.post(
  "/:organizationId/invitations/:invitationId/resend",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin"),
  resendOrganizationInvitationHandler
);

// Admin-only: issues a fresh acceptance link to share by hand when email delivery fails.
router.post(
  "/:organizationId/invitations/:invitationId/link",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin"),
  issueInvitationLinkHandler
);

router.post(
  "/:organizationId/invitations/:invitationId/revoke",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin"),
  revokeOrganizationInvitationHandler
);

// Member roles (admin only).
router.get("/:organizationId/members/:membershipId/role-change-preview", ...adminOnly, previewMemberRoleChangeHandler);
router.patch("/:organizationId/members/:membershipId/role", ...adminOnly, adminWriteLimit, changeMemberRoleHandler);

// Team management (admin only). GET /:organizationId/teams above stays readable by supervisors.
router.post("/:organizationId/teams", ...adminOnly, adminWriteLimit, createTeamHandler);
router.patch("/:organizationId/teams/:teamId", ...adminOnly, adminWriteLimit, updateTeamHandler);
router.delete("/:organizationId/teams/:teamId", ...adminOnly, adminWriteLimit, deleteTeamHandler);
router.post("/:organizationId/teams/:teamId/members", ...adminOnly, adminWriteLimit, addTeamMemberHandler);
router.delete("/:organizationId/teams/:teamId/members/:employeeId", ...adminOnly, adminWriteLimit, removeTeamMemberHandler);
router.post("/:organizationId/teams/:teamId/members/:employeeId/move", ...adminOnly, adminWriteLimit, moveTeamMemberHandler);

// Open tasks whose assignee can no longer be assigned (shown on the team page, admin only).
router.get("/:organizationId/unassignable-open-tasks", ...adminOnly, listUnassignableOpenTasksHandler);

export default router;
