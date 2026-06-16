import type { NextFunction, Request, Response } from "express";
import {
  getEmployeeProfileByAuthId,
  createEmployeeProfile,
} from "../services/employeeService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { optionalString, requireBody, requireString } from "../utils/validation.js";

export async function getMyEmployeeProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const employee = await getEmployeeProfileByAuthId(req.user.id);

    return sendSuccess(res, 200, "Employee profile fetched successfully.", employee);
  } catch (error) {
    return next(error);
  }
}

export async function createMyEmployeeProfile(
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
    const bio = optionalString(body, "bio");

    const employee = await createEmployeeProfile(req.user.id, {
      full_name: fullName,
      bio,
    });

    return sendSuccess(res, 201, "Employee profile created successfully.", employee);
  } catch (error) {
    return next(error);
  }
}
