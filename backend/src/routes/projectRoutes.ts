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
  generateProjectRecommendationsHandler,
  getLatestProjectRecommendationsHandler,
} from "../controllers/recommendationController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { uploadProjectDocumentFile } from "../middleware/uploadMiddleware.js";

const router = Router();

router.use(authenticateUser, requireRole("admin", "supervisor"));

router.get("/", getProjects);
router.post("/", createProjectHandler);
router.get("/:projectId/documents", listProjectDocumentsHandler);
router.get("/:projectId/documents/:documentId", getProjectDocumentHandler);
router.post("/:projectId/documents", uploadProjectDocumentFile, uploadProjectDocumentHandler);
router.post("/:projectId/recommendations", generateProjectRecommendationsHandler);
router.get("/:projectId/recommendations", getLatestProjectRecommendationsHandler);
router.get("/:projectId", getProject);
router.patch("/:projectId", updateProjectHandler);

export default router;
