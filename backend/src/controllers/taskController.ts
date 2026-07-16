import type { NextFunction, Request, Response } from "express";
import {
  assignTask,
  createTask,
  createTaskProgress,
  getTaskById,
  listTasks,
  updateTask,
} from "../services/taskService.js";
import type { PriorityLevel } from "../types/project.js";
import type { TaskStatus } from "../types/task.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  optionalEnum,
  optionalNumber,
  optionalString,
  optionalUuid,
  requireBody,
  requireString,
  requireUuid,
} from "../utils/validation.js";

const TASK_STATUSES: readonly TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "review",
  "completed",
  "cancelled",
];
const PRIORITIES: readonly PriorityLevel[] = ["low", "medium", "high", "urgent"];

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    if (!req.organization || !req.membership) {
      throw new AppError("Organization context is required.", 500);
    }

    const tasks = await listTasks(req.user.id, req.organization.id, req.membership.role);
    return sendSuccess(res, 200, "Tasks fetched successfully.", tasks);
  } catch (error) {
    return next(error);
  }
}

export async function getTaskHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    if (!req.organization || !req.membership) {
      throw new AppError("Organization context is required.", 500);
    }

    const taskId = requireUuid(req.params.taskId, "Task id");
    const task = await getTaskById(
      req.user.id,
      req.organization.id,
      req.membership.role,
      taskId
    );
    return sendSuccess(res, 200, "Task fetched successfully.", task);
  } catch (error) {
    return next(error);
  }
}

export async function createTaskHandler(
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
    const task = await createTask(req.user.id, req.organization.id, {
      projectId: requireUuid(body.projectId, "Project id"),
      title: requireString(body, "title", "Title"),
      description: optionalString(body, "description"),
      status: optionalEnum(body, "status", TASK_STATUSES),
      priority: optionalEnum(body, "priority", PRIORITIES),
      estimatedHours: optionalNumber(body, "estimatedHours", { min: 0.25 }),
      assignedEmployeeId: optionalUuid(body, "assignedEmployeeId", "Employee id"),
    });

    return sendSuccess(res, 201, "Task created successfully.", task);
  } catch (error) {
    return next(error);
  }
}

export async function updateTaskHandler(
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

    const taskId = requireUuid(req.params.taskId, "Task id");
    const body = requireBody(req.body);
    const task = await updateTask(req.user.id, req.organization.id, taskId, {
      title: optionalString(body, "title"),
      description: optionalString(body, "description"),
      status: optionalEnum(body, "status", TASK_STATUSES),
      priority: optionalEnum(body, "priority", PRIORITIES),
      estimatedHours: optionalNumber(body, "estimatedHours", { min: 0.25 }),
    });

    return sendSuccess(res, 200, "Task updated successfully.", task);
  } catch (error) {
    return next(error);
  }
}

export async function assignTaskHandler(
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

    const taskId = requireUuid(req.params.taskId, "Task id");
    const body = requireBody(req.body);
    const employeeId = optionalUuid(body, "employeeId", "Employee id");
    const task = await assignTask(req.user.id, req.organization.id, taskId, employeeId);

    return sendSuccess(res, 200, "Task assignment updated successfully.", task);
  } catch (error) {
    return next(error);
  }
}

export async function createTaskProgressHandler(
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

    const taskId = requireUuid(req.params.taskId, "Task id");
    const body = requireBody(req.body);
    const progressPercentage = optionalNumber(body, "progressPercentage", {
      min: 0,
      max: 100,
    });

    if (progressPercentage === undefined) {
      throw new AppError("progressPercentage is required.", 400);
    }

    const progress = await createTaskProgress(req.user.id, req.organization.id, taskId, {
      progressPercentage,
      status: optionalEnum(body, "status", TASK_STATUSES),
      notes: optionalString(body, "notes"),
    });

    return sendSuccess(res, 201, "Task progress updated successfully.", progress);
  } catch (error) {
    return next(error);
  }
}
