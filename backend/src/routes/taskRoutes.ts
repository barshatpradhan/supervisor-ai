import { Router } from "express";
import {
  assignTaskHandler,
  createTaskHandler,
  createTaskProgressHandler,
  getTasks,
} from "../controllers/taskController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticateUser);

router.get("/", getTasks);
router.post("/", requireRole("admin", "supervisor"), createTaskHandler);
router.patch("/:taskId/assign", requireRole("admin", "supervisor"), assignTaskHandler);
router.post("/:taskId/progress", requireRole("employee"), createTaskProgressHandler);

export default router;
