import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import type { UserRole } from "../types/auth.js";

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized.", 401);
      }

      const { data: appUser, error } = await supabase
        .from("users")
        .select("role")
        .eq("auth_user_id", req.user.id)
        .single<{ role: UserRole }>();

      if (error || !appUser) {
        throw new AppError("User role not found.", 403);
      }

      if (!allowedRoles.includes(appUser.role)) {
        throw new AppError("Forbidden.", 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
