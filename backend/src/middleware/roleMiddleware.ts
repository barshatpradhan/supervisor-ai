import type { Request, Response, NextFunction } from "express";
import { getAppUserByAuthId } from "../services/userService.js";
import { AppError } from "../utils/appError.js";
import type { PlatformRole, UserRole } from "../types/auth.js";

export function requirePlatformRole(...allowedRoles: PlatformRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized.", 401);
      }

      const appUser = await getAppUserByAuthId(req.user.id);
      req.appUser = appUser;

      if (!appUser.platformRole) {
        throw new AppError("Forbidden.", 403);
      }

      if (!allowedRoles.includes(appUser.platformRole)) {
        throw new AppError("Forbidden.", 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * @deprecated Use requirePlatformRole instead.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  const mappedRoles = allowedRoles.flatMap<PlatformRole>((role) =>
    role === "admin" ? ["platform_admin"] : []
  );

  return requirePlatformRole(...mappedRoles);
}
