import type { NextFunction, Request, Response } from "express";
import {
  getEmployeeDashboard,
  getSupervisorDashboard,
} from "../services/dashboardService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getSupervisorDashboardHandler(
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

    const dashboard = await getSupervisorDashboard(req.user.id, req.organization.id);

    return sendSuccess(
      res,
      200,
      "Supervisor dashboard fetched successfully",
      dashboard
    );
  } catch (error) {
    return next(error);
  }
}

export async function getEmployeeDashboardHandler(
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

    const dashboard = await getEmployeeDashboard(req.user.id, req.organization.id);

    return sendSuccess(
      res,
      200,
      "Employee dashboard fetched successfully",
      dashboard
    );
  } catch (error) {
    return next(error);
  }
}
