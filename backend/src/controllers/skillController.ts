import type { NextFunction, Request, Response } from "express";
import { MAX_SKILLS_PER_RESOLVE, resolveSkillNames } from "../services/skillResolutionService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { SKILL_CATEGORIES } from "../utils/skillNames.js";

/** Checks typed skills before they are saved: catalog match, AI correction or rejection. */
export async function resolveSkillsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const names = (req.body as { names?: unknown } | undefined)?.names;
    if (!Array.isArray(names) || names.length === 0 || names.some((name) => typeof name !== "string")) {
      throw new AppError("names must be a non-empty array of strings.", 400);
    }
    if (names.length > MAX_SKILLS_PER_RESOLVE) {
      throw new AppError(`Check at most ${MAX_SKILLS_PER_RESOLVE} skills at a time.`, 400);
    }

    const resolutions = await resolveSkillNames(names as string[]);
    return sendSuccess(res, 200, "Skills checked successfully.", resolutions);
  } catch (error) {
    return next(error);
  }
}

export function listSkillCategoriesHandler(_req: Request, res: Response) {
  return sendSuccess(res, 200, "Skill categories fetched successfully.", SKILL_CATEGORIES);
}
