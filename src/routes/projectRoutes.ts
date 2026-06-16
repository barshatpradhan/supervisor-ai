import { Router } from "express";
import {
  createProjectHandler,
  getProject,
  getProjects,
  updateProjectHandler,
} from "../controllers/projectController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticateUser, requireRole("admin", "supervisor"));

router.get("/", getProjects);
router.post("/", createProjectHandler);
router.get("/:projectId", getProject);
router.patch("/:projectId", updateProjectHandler);

export default router;
