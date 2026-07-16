import { Router } from "express";
import { getPublicApprovedSkills } from "../controllers/publicController.js";

const router = Router();

router.get("/skills", getPublicApprovedSkills);

export default router;
