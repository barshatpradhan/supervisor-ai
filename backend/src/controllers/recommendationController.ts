import type { NextFunction, Request, Response } from "express";
import {
  assignRecommendedEmployee,
  generateProjectRecommendations,
  getLatestProjectRecommendations,
} from "../services/recommendationService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  isRecord,
  optionalDate,
  optionalEnum,
  optionalNumber,
  optionalString,
  optionalUuid,
  requireBody,
  requireString,
  requireUuid,
} from "../utils/validation.js";

const RECOMMENDATION_TASK_PRIORITIES = ["low", "medium", "high"] as const;

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

export async function assignRecommendedEmployeeHandler(
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
    const body = requireBody(req.body);
    const taskId = optionalUuid(body, "taskId", "Task id");
    const taskValue = body.task;

    if ((taskId ? 1 : 0) + (taskValue === undefined ? 0 : 1) !== 1) {
      throw new AppError("Provide exactly one of taskId or task.", 400);
    }

    let task;
    if (taskValue !== undefined) {
      if (!isRecord(taskValue)) {
        throw new AppError("task must be an object.", 400);
      }

      const estimatedHours = optionalNumber(taskValue, "estimatedHours", {
        min: 0.25,
      });
      if (estimatedHours === undefined) {
        throw new AppError("task.estimatedHours is required.", 400);
      }

      task = {
        title: requireString(taskValue, "title", "Task title"),
        description: optionalString(taskValue, "description"),
        priority: optionalEnum(
          taskValue,
          "priority",
          RECOMMENDATION_TASK_PRIORITIES
        ),
        estimatedHours,
        dueDate: optionalDate(taskValue, "dueDate"),
      };
    }

    const result = await assignRecommendedEmployee(
      req.user.id,
      req.organization.id,
      projectId,
      {
        recommendationRunId: requireUuid(
          body.recommendationRunId,
          "Recommendation run id"
        ),
        employeeId: requireUuid(body.employeeId, "Employee id"),
        taskId,
        task,
      }
    );

    return sendSuccess(
      res,
      taskId ? 200 : 201,
      "Recommended employee assigned successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
}
