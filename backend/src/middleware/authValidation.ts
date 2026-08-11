import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import {
  isRecord,
  optionalEnum,
  optionalNumber,
  optionalString,
  requireBody,
  requireEmail,
  requirePassword,
  requireString,
} from "../utils/validation.js";

const EMPLOYMENT_TYPES = ["full_time", "part_time"] as const;
const MANAGED_ROLES = ["employee", "supervisor"] as const;
const MAX_PROFICIENCY_LEVEL = 5;
const MAX_YEARS_OF_EXPERIENCE = 80;

function validateProvisioningSkills(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new AppError(`${field} must be an array.`, 400);
  }

  for (const item of value) {
    if (!isRecord(item)) {
      throw new AppError(`${field} must contain objects.`, 400);
    }

    requireString(item, "name", "Skill name");

    const proficiencyLevel = optionalNumber(item, "proficiency_level", {
      min: 1,
      max: MAX_PROFICIENCY_LEVEL,
    });

    if (
      proficiencyLevel !== undefined &&
      !Number.isInteger(proficiencyLevel)
    ) {
      throw new AppError(
        `Skill proficiency_level must be an integer between 1 and ${MAX_PROFICIENCY_LEVEL}.`,
        400
      );
    }

    optionalNumber(item, "years_of_experience", {
      min: 0,
      max: MAX_YEARS_OF_EXPERIENCE,
    });
  }
}

function validateEmployeeProvisioningFields(body: Record<string, unknown>) {
  requireString(body, "full_name", "Full name");
  optionalString(body, "bio");
  optionalEnum(body, "employment_type", EMPLOYMENT_TYPES);
  optionalNumber(body, "weekly_capacity_hours", {
    min: 1,
    max: 168,
  });
  validateProvisioningSkills(body, "skills");
}

export function validateRegisterRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    requirePassword(body, "password");

    const forbiddenFields = [
      "role",
      "platform_role",
      "organization_id",
      "membership_role",
      "full_name",
      "bio",
      "department",
      "employment_type",
      "weekly_capacity_hours",
      "skills",
      "user_id",
      "employee_id",
      "supervisor_id",
      "workload_percentage",
      "availability_percentage",
      "performance_score",
    ];

    for (const field of forbiddenFields) {
      if (body[field] !== undefined) {
        throw new AppError(`${field} cannot be assigned during account registration.`, 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function validateSignupRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    requirePassword(body, "password");
    validateEmployeeProvisioningFields(body);

    const forbiddenFields = [
      "role",
      "user_id",
      "employee_id",
      "workload_percentage",
      "availability_percentage",
      "performance_score",
      "is_approved",
      "created_by",
      "department",
    ];

    for (const field of forbiddenFields) {
      if (body[field] !== undefined) {
        throw new AppError(`${field} cannot be assigned during public signup.`, 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function validateLoginRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    requirePassword(body, "password");
    next();
  } catch {
    next(new AppError("A valid email and password are required.", 400));
  }
}

export function validatePasswordResetRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    next();
  } catch {
    next(new AppError("A valid email is required.", 400));
  }
}

export function validatePasswordReset(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requirePassword(body, "password");
    next();
  } catch (error) {
    next(error);
  }
}

export function validateAdminCreateUserRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    requireString(body, "full_name", "Full name");
    const role = optionalEnum(body, "role", MANAGED_ROLES);

    if (!role) {
      throw new AppError("role is required.", 400);
    }

    if (body.password !== undefined) {
      throw new AppError("password is not supported for admin-managed provisioning.", 400);
    }

    optionalString(body, "bio");

    if (role === "employee") {
      if (body.department !== undefined) {
        throw new AppError("department is not supported for employee provisioning.", 400);
      }

      validateEmployeeProvisioningFields(body);
    } else {
      optionalString(body, "department");

      for (const field of [
        "employment_type",
        "weekly_capacity_hours",
        "skills",
        "workload_percentage",
        "availability_percentage",
        "performance_score",
        "is_approved",
        "created_by",
      ]) {
        if (body[field] !== undefined) {
          throw new AppError(`${field} is not supported for supervisor provisioning.`, 400);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
