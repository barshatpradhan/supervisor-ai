import type { NextFunction, Request, Response } from "express";
import {
  createSupervisorProfile,
  getSupervisorProfileByAuthId,
  listAssignableEmployees,
} from "../services/supervisorService.js";
import type { SupervisorEmployeeDirectoryQuery } from "../types/employee.js";
import { updateEmployeeWorkSettings } from "../services/employeeService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  optionalEnum,
  optionalEnumValue,
  optionalNumber,
  optionalNumberValue,
  optionalStringValue,
  optionalString,
  requireBody,
  requireString,
  requireUuid,
} from "../utils/validation.js";

const EMPLOYMENT_TYPES = ["full_time", "part_time"] as const;

function getSupervisorEmployeeDirectoryQuery(
  query: Request["query"]
): SupervisorEmployeeDirectoryQuery {
  return {
    search: optionalStringValue(query.search, "search"),
    skill: optionalStringValue(query.skill, "skill"),
    availability_min: optionalNumberValue(
      query.availability_min,
      "availability_min",
      {
        min: 0,
        max: 100,
      }
    ),
    employment_type: optionalEnumValue(
      query.employment_type,
      "employment_type",
      EMPLOYMENT_TYPES
    ),
  };
}

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

export async function updateEmployeeWorkSettingsHandler(
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

    const employeeId = requireUuid(req.params.employeeId, "Employee id");
    const body = requireBody(req.body);
    const employee = await updateEmployeeWorkSettings(employeeId, req.organization.id, {
      employment_type: optionalEnum(body, "employment_type", EMPLOYMENT_TYPES),
      weekly_capacity_hours: optionalNumber(body, "weekly_capacity_hours", {
        min: 1,
        max: 168,
      }),
    });

    return sendSuccess(
      res,
      200,
      "Employee work settings updated successfully.",
      employee
    );
  } catch (error) {
    return next(error);
  }
}

export async function getAssignableEmployeesHandler(
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

    const employees = await listAssignableEmployees(
      req.user.id,
      req.organization.id,
      getSupervisorEmployeeDirectoryQuery(req.query)
    );

    return sendSuccess(
      res,
      200,
      "Assignable employees fetched successfully.",
      employees
    );
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
