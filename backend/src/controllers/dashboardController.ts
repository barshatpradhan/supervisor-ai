import type { NextFunction, Request, Response } from "express";
import {
  getEmployeeDashboard,
  getSupervisorDashboard,
} from "../services/dashboardService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { logActivity } from "../services/activityLogService.js";

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
    await logActivity({ organizationId: req.organization.id, actorUserId: req.appUser?.id ?? req.user.id, eventType: "supervisor_dashboard_viewed" });

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
    await logActivity({ organizationId: req.organization.id, actorUserId: req.appUser?.id ?? req.user.id, eventType: "employee_dashboard_viewed" });

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
