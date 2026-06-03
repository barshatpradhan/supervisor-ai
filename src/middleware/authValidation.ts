import type { Request, Response, NextFunction } from "express";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8;
}

export function validateSignupRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!isRecord(req.body)) {
    return res.status(400).json({
      success: false,
      error: "Request body is required.",
    });
  }

  if (!isValidEmail(req.body.email)) {
    return res.status(400).json({
      success: false,
      error: "A valid email is required.",
    });
  }

  if (!isValidPassword(req.body.password)) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 8 characters.",
    });
  }

  if (req.body.role !== undefined) {
    return res.status(400).json({
      success: false,
      error: "Role cannot be assigned during public signup.",
    });
  }

  next();
}

export function validateLoginRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!isRecord(req.body)) {
    return res.status(400).json({
      success: false,
      error: "Request body is required.",
    });
  }

  if (!isValidEmail(req.body.email) || !isValidPassword(req.body.password)) {
    return res.status(400).json({
      success: false,
      error: "A valid email and password are required.",
    });
  }

  next();
}
