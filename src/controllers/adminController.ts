import type { Request, Response } from "express";
import {
  isValidUserRole,
  listAppUsers,
  updateAppUserRole,
} from "../services/adminService.js";

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await listAppUsers();

    return res.json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unable to fetch users",
    });
  }
}

export async function updateUserRole(req: Request, res: Response) {
  const userIdParam = req.params.userId;
  const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
  const { role } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User id is required",
    });
  }

  if (!isValidUserRole(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be one of: admin, supervisor, employee",
    });
  }

  try {
    const user = await updateAppUserRole(userId, role);

    return res.json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to update user role",
    });
  }
}
