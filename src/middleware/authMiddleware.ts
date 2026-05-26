import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  req.user = user;

  next();
}