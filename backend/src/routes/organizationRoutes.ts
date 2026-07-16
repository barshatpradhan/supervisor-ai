import { Router } from "express";
import {
  acceptOrganizationInvitationHandler,
  createOrganizationHandler,
  createOrganizationInvitationHandler,
  getOrganizationHandler,
  listCurrentUserOrganizationsHandler,
  listOrganizationInvitationsHandler,
  listOrganizationMembersHandler,
} from "../controllers/organizationController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";

const router = Router();

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

export default router;
