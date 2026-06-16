import type { NextFunction, Request, Response } from "express";
import {
  createSupervisorProfile,
  getSupervisorProfileByAuthId,
} from "../services/supervisorService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { optionalString, requireBody, requireString } from "../utils/validation.js";

export async function getMySupervisorProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const supervisor = await getSupervisorProfileByAuthId(req.user.id);

    return sendSuccess(res, 200, "Supervisor profile fetched successfully.", supervisor);
  } catch (error) {
    return next(error);
  }
}

export async function createMySupervisorProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const body = requireBody(req.body);
    const fullName = requireString(body, "full_name", "Full name");
    const department = optionalString(body, "department");
    const bio = optionalString(body, "bio");

    const supervisor = await createSupervisorProfile(req.user.id, {
      full_name: fullName,
      department,
      bio,
    });

    return sendSuccess(res, 201, "Supervisor profile created successfully.", supervisor);
  } catch (error) {
    return next(error);
  }
}
