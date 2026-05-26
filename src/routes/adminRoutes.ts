import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.get(
  "/dashboard",
  authenticateUser,
  requireRole("admin"),
  (req,res) => {
    return res.json({
      success: true,
      message: "welcome admin"
    });
  }
);

export default router;