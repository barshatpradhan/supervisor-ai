import { Router } from "express";
import {
  createProjectHandler,
  getProject,
  getProjects,
  updateProjectHandler,
} from "../controllers/projectController.js";
import { uploadProjectDocumentHandler } from "../controllers/projectDocumentController.js";
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
router.post("/:projectId/documents", uploadProjectDocumentFile, uploadProjectDocumentHandler);
router.post("/:projectId/recommendations", generateProjectRecommendationsHandler);
router.get("/:projectId/recommendations", getLatestProjectRecommendationsHandler);
router.get("/:projectId", getProject);
router.patch("/:projectId", updateProjectHandler);

export default router;
