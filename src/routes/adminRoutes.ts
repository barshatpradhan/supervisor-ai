import { Router } from "express";
import { getUsers, updateUserRole } from "../controllers/adminController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authenticateUser, requireRole("admin"));

router.get(
  "/dashboard",
  (req,res) => {
    return res.json({
      success: true,
      message: "welcome admin"
    });
  }
);

router.get("/users", getUsers);
router.patch("/users/:userId/role", updateUserRole);

export default router;
