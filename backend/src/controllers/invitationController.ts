import type { NextFunction, Request, Response } from "express";
import {
  acceptInvitationByToken,
  inspectInvitationByToken,
} from "../services/organizationService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";

function requireInvitationToken(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("Invitation token is required.", 400);
  }

  return value.trim();
}

export async function inspectInvitationByTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = requireInvitationToken(req.params.token);
    const result = await inspectInvitationByToken(token, req.user?.id);

    return sendSuccess(res, 200, "Invitation fetched successfully.", result);
  } catch (error) {
    return next(error);
  }
}

export async function acceptInvitationByTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const token = requireInvitationToken(req.params.token);
    const result = await acceptInvitationByToken(token, req.user.id);

    return sendSuccess(res, 200, "Invitation accepted successfully.", result);
  } catch (error) {
    return next(error);
  }
}
