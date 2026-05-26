import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unathorized",
      });
    }

    const { data: appUser, error } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", req.user.id)
      .single();

    if (error || !appUser) {
      return res.status(403).json({
        success: false,
        message: "User role not found"
      });
    }

    if (!allowedRoles.includes(appUser.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
    next();
  }
}