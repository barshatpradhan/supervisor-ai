import { Router } from "express";
import { resolveSkillsHandler } from "../controllers/skillController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/resolve", authenticateUser, resolveSkillsHandler);

export default router;
