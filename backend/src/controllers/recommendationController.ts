import type { NextFunction, Request, Response } from "express";
import {
  generateProjectRecommendations,
  getLatestProjectRecommendations,
} from "../services/recommendationService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { requireUuid } from "../utils/validation.js";

export async function generateProjectRecommendationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    if (!req.organization) {
      throw new AppError("Organization context is required.", 500);
    }

    const projectId = requireUuid(req.params.projectId, "Project id");
    const recommendations = await generateProjectRecommendations(
      req.user.id,
      req.organization.id,
      projectId
    );

    return sendSuccess(
      res,
      201,
      "Project recommendations generated successfully.",
      recommendations
    );
  } catch (error) {
    return next(error);
  }
}

export async function getLatestProjectRecommendationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    if (!req.organization) {
      throw new AppError("Organization context is required.", 500);
    }

    const projectId = requireUuid(req.params.projectId, "Project id");
    const recommendations = await getLatestProjectRecommendations(
      req.user.id,
      req.organization.id,
      projectId
    );

    return sendSuccess(
      res,
      200,
      "Project recommendations fetched successfully.",
      recommendations
    );
  } catch (error) {
    return next(error);
  }
}
