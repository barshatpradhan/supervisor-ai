import type { NextFunction, Request, Response } from "express";
import { listPublicApprovedSkills } from "../services/skillService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { optionalStringValue } from "../utils/validation.js";

export async function getPublicApprovedSkills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const skills = await listPublicApprovedSkills({
      search: optionalStringValue(req.query.search, "search"),
      category: optionalStringValue(req.query.category, "category"),
    });

    return sendSuccess(res, 200, "Approved skills fetched successfully.", skills);
  } catch (error) {
    return next(error);
  }
}
