import type { NextFunction, Request, Response } from "express";
import { isAppError } from "../utils/appError.js";
import { sendError } from "../utils/apiResponse.js";

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, "Route not found.");
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(error);
  }

  if (isAppError(error)) {
    const message = error.expose ? error.message : "Internal server error.";
    return sendError(res, error.statusCode, message);
  }

  return sendError(res, 500, "Internal server error.");
}
