import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { getMyEmployeeProfile } from "../controllers/employeeController.js";

const router = Router();

router.get("/me", authenticateUser, getMyEmployeeProfile);

export default router;