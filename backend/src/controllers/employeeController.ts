import type { NextFunction, Request, Response } from "express";
import {
  getEmployeeProfileByAuthId,
  createEmployeeProfile,
  updateEmployeeProfile,
} from "../services/employeeService.js";
import { listApprovedSkillsForOrganization } from "../services/skillService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  optionalEnum,
  optionalNullableString,
  optionalNumber,
  optionalString,
  optionalStringArray,
  requireBody,
  requireString,
} from "../utils/validation.js";

const EMPLOYMENT_TYPES = ["full_time", "part_time"] as const;

export async function getApprovedSkills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.organization) {
      throw new AppError("Organization context is required.", 500);
    }

    const skills = await listApprovedSkillsForOrganization(req.organization.id);

    return sendSuccess(res, 200, "Approved skills fetched successfully.", skills);
  } catch (error) {
    return next(error);
  }
}

export async function getMyEmployeeProfile(
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

    const employee = await getEmployeeProfileByAuthId(req.user.id, req.organization.id);

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
    if (!req.organization) {
      throw new AppError("Organization context is required.", 500);
    }

    const body = requireBody(req.body);
    const fullName = requireString(body, "full_name", "Full name");
    const bio = optionalString(body, "bio");

    const employee = await createEmployeeProfile(req.user.id, req.organization.id, {
      full_name: fullName,
      bio,
      employment_type: optionalEnum(body, "employment_type", EMPLOYMENT_TYPES),
      weekly_capacity_hours: optionalNumber(body, "weekly_capacity_hours", {
        min: 1,
        max: 168,
      }),
      skills: optionalStringArray(body, "skills"),
    });

    return sendSuccess(res, 201, "Employee profile created successfully.", employee);
  } catch (error) {
    return next(error);
  }
}

export async function updateMyEmployeeProfile(
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

    const body = requireBody(req.body);
    const employee = await updateEmployeeProfile(req.user.id, req.organization.id, {
      full_name: optionalString(body, "full_name"),
      bio: optionalNullableString(body, "bio"),
      skills: optionalStringArray(body, "skills"),
    });

    return sendSuccess(res, 200, "Employee profile updated successfully.", employee);
  } catch (error) {
    return next(error);
  }
}
