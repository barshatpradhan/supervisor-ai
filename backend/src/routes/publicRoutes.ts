import { Router } from "express";
import { getPublicApprovedSkills } from "../controllers/publicController.js";
import { listSkillCategoriesHandler } from "../controllers/skillController.js";

const router = Router();

router.get("/skills", getPublicApprovedSkills);
router.get("/skills/categories", listSkillCategoriesHandler);

export default router;
