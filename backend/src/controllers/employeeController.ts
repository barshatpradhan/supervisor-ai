import type { NextFunction, Request, Response } from "express";
import {
  getEmployeeProfileByAuthId,
  createEmployeeProfile,
  updateEmployeeProfile,
} from "../services/employeeService.js";
import { listApprovedSkillsForOrganization } from "../services/skillService.js";
import { listEmployeeTasks } from "../services/taskService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  optionalEnum,
  optionalNullableString,
  optionalNumber,
  optionalString,
  optionalStringArray,
  optionalEnumValue,
  optionalNumberValue,
  optionalStringValue,
  isRecord,
  requireBody,
  requireString,
  requireUuid,
} from "../utils/validation.js";
import type { PriorityLevel } from "../types/project.js";
import type { TaskStatus } from "../types/task.js";
import type { EmployeeSkillInput } from "../services/skillService.js";

const EMPLOYMENT_TYPES = ["full_time", "part_time"] as const;
const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "blocked", "review", "completed", "cancelled"];
const PRIORITIES: readonly PriorityLevel[] = ["low", "medium", "high", "urgent"];

function optionalEmployeeSkills(body: Record<string, unknown>): EmployeeSkillInput[] | undefined {
  if (body.skills === undefined) return undefined;
  if (!Array.isArray(body.skills)) throw new AppError("skills must be an array.", 400);
  return body.skills.map((skill) => {
    if (typeof skill === "string") return { name: skill };
    if (!isRecord(skill)) throw new AppError("skills must contain objects.", 400);
    return {
      name: requireString(skill, "name", "Skill name"),
      proficiency_level: optionalNumber(skill, "proficiency_level", { min: 1, max: 5 }),
      years_of_experience:
        skill.years_of_experience === null
          ? null
          : optionalNumber(skill, "years_of_experience", { min: 0, max: 80 }),
    };
  });
}

export async function getMyTasks(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError("Unauthorized.", 401));
  try {
    if (!req.organization) throw new AppError("Organization context is required.", 500);
    const page = optionalNumberValue(req.query.page, "page", { min: 1 }) ?? 1;
    const limit = optionalNumberValue(req.query.limit, "limit", { min: 1, max: 100 }) ?? 20;
    if (!Number.isInteger(page) || !Number.isInteger(limit)) throw new AppError("page and limit must be integers.", 400);
    const dueBefore = optionalStringValue(req.query.dueBefore, "dueBefore");
    const dueAfter = optionalStringValue(req.query.dueAfter, "dueAfter");
    for (const [label, value] of [["dueBefore", dueBefore], ["dueAfter", dueAfter]] as const) {
      if (value !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()))) throw new AppError(`${label} must be a valid YYYY-MM-DD date.`, 400);
    }
    const projectId = optionalStringValue(req.query.projectId, "projectId");
    if (projectId !== undefined) requireUuid(projectId, "projectId");
    const tasks = await listEmployeeTasks(req.user.id, req.organization.id, {
      status: optionalEnumValue(req.query.status, "status", TASK_STATUSES),
      priority: optionalEnumValue(req.query.priority, "priority", PRIORITIES),
      projectId,
      dueBefore,
      dueAfter,
      page,
      limit,
      sort: optionalEnumValue(req.query.sort, "sort", ["assignedAt", "dueDate", "priority", "progress"] as const) ?? "assignedAt",
    });
    return sendSuccess(res, 200, "Employee tasks fetched successfully.", tasks);
  } catch (error) { return next(error); }
}

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
      skills: optionalStringArray(body, "skills")?.map((name) => ({ name })),
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
      job_title: optionalNullableString(body, "job_title"),
      department: optionalNullableString(body, "department"),
      bio: optionalNullableString(body, "bio"),
      skills: optionalEmployeeSkills(body),
    });

    return sendSuccess(res, 200, "Employee profile updated successfully.", employee);
  } catch (error) {
    return next(error);
  }
}
