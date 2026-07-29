import { Router } from "express";
import {
  createProjectHandler,
  getProject,
  getProjects,
  updateProjectHandler,
} from "../controllers/projectController.js";
import {
  getProjectDocumentHandler,
  listProjectDocumentsHandler,
  uploadProjectDocumentHandler,
} from "../controllers/projectDocumentController.js";
import {
  assignRecommendedEmployeeHandler,
  generateProjectRecommendationsHandler,
  getLatestProjectRecommendationsHandler,
} from "../controllers/recommendationController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { uploadProjectDocumentFile } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get(
  "/",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getProjects
);
router.post(
  "/",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  createProjectHandler
);
router.get(
  "/:projectId/documents",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  listProjectDocumentsHandler
);
router.get(
  "/:projectId/documents/:documentId",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getProjectDocumentHandler
);
router.post(
  "/:projectId/documents",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  uploadProjectDocumentFile,
  uploadProjectDocumentHandler
);
router.post(
  "/:projectId/recommendations",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  generateProjectRecommendationsHandler
);
router.post(
  "/:projectId/recommendations/assign",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  assignRecommendedEmployeeHandler
);
router.get(
  "/:projectId/recommendations",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getLatestProjectRecommendationsHandler
);
router.get(
  "/:projectId",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getProject
);
router.patch(
  "/:projectId",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  updateProjectHandler
);

export default router;
