import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import { requireBody, requireEmail, requirePassword } from "../utils/validation.js";

export function validateSignupRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    requirePassword(body, "password");

    if (body.role !== undefined) {
      throw new AppError("Role cannot be assigned during public signup.", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function validateLoginRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    requireEmail(body, "email");
    requirePassword(body, "password");
    next();
  } catch {
    next(new AppError("A valid email and password are required.", 400));
  }
}
