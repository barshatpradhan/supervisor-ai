import type { NextFunction, Request, Response } from "express";
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
} from "../services/projectService.js";
import type { PriorityLevel, ProjectStatus } from "../types/project.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  optionalEnum,
  optionalString,
  requireBody,
  requireString,
  requireUuid,
} from "../utils/validation.js";

const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];
const PRIORITIES: readonly PriorityLevel[] = ["low", "medium", "high", "urgent"];

function optionalStringArray(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new AppError(`${field} must be an array of strings.`, 400);
  }

  return value;
}

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const projects = await listProjects(req.user.id);
    return sendSuccess(res, 200, "Projects fetched successfully.", projects);
  } catch (error) {
    return next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const projectId = requireUuid(req.params.projectId, "Project id");
    const project = await getProjectById(req.user.id, projectId);
    return sendSuccess(res, 200, "Project fetched successfully.", project);
  } catch (error) {
    return next(error);
  }
}

export async function createProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const body = requireBody(req.body);
    const project = await createProject(req.user.id, {
      title: requireString(body, "title", "Title"),
      description: optionalString(body, "description"),
      status: optionalEnum(body, "status", PROJECT_STATUSES),
      priority: optionalEnum(body, "priority", PRIORITIES),
      requiredSkills: optionalStringArray(body, "requiredSkills"),
    });

    return sendSuccess(res, 201, "Project created successfully.", project);
  } catch (error) {
    return next(error);
  }
}

export async function updateProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const projectId = requireUuid(req.params.projectId, "Project id");
    const body = requireBody(req.body);
    const project = await updateProject(req.user.id, projectId, {
      title: optionalString(body, "title"),
      description: optionalString(body, "description"),
      status: optionalEnum(body, "status", PROJECT_STATUSES),
      priority: optionalEnum(body, "priority", PRIORITIES),
      requiredSkills: optionalStringArray(body, "requiredSkills"),
    });

    return sendSuccess(res, 200, "Project updated successfully.", project);
  } catch (error) {
    return next(error);
  }
}
