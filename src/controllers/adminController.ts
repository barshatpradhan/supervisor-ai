import type { NextFunction, Request, Response } from "express";
import {
  isValidUserRole,
  listAppUsers,
  updateAppUserRole,
} from "../services/adminService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { requireBody, requireUuid } from "../utils/validation.js";

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await listAppUsers();

    return sendSuccess(res, 200, "Users fetched successfully.", users);
  } catch (error) {
    return next(error);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUuid(req.params.userId, "User id");
    const body = requireBody(req.body);
    const role = body.role;

    if (!isValidUserRole(role)) {
      throw new AppError("Role must be one of: admin, supervisor, employee.", 400);
    }

    const user = await updateAppUserRole(userId, role);

    return sendSuccess(res, 200, "User role updated successfully.", user);
  } catch (error) {
    return next(error);
  }
}
