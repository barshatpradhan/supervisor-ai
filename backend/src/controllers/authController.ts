import type { NextFunction, Request, Response } from "express";
import {
  getCurrentAppUser,
  login,
  register,
  requestPasswordReset,
  resetPassword,
  signup,
} from "../services/authService.js";
import type { LoginInput, RegisterInput } from "../types/auth.js";
import type { PublicEmployeeSignupInput } from "../types/provisioning.js";
import { AppError } from "../utils/appError.js";
import { getAppUserByAuthId, updateOwnAvatarVariant } from "../services/userService.js";
import { parseAvatarVariantInput } from "../utils/avatarVariant.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function signupUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input: PublicEmployeeSignupInput = {
      email: req.body.email,
      password: req.body.password,
      full_name: req.body.full_name,
      bio: req.body.bio,
      employment_type: req.body.employment_type,
      weekly_capacity_hours: req.body.weekly_capacity_hours,
      skills: req.body.skills,
    };

    const data = await signup(input);

    return sendSuccess(res, 201, "Account created successfully.", data);
  } catch (error) {
    return next(error);
  }
}

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input: RegisterInput = {
      email: req.body.email,
      password: req.body.password,
    };

    const data = await register(input);

    return sendSuccess(res, 201, "Account registered successfully.", data);
  } catch (error) {
    return next(error);
  }
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input: LoginInput = {
      email: req.body.email,
      password: req.body.password,
    };

    const data = await login(input);

    return sendSuccess(res, 200, "Login successful.", data);
  } catch (error) {
    return next(error);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const data = await getCurrentAppUser(req.user.id);

    return sendSuccess(res, 200, "Current user fetched successfully.", data);
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /auth/me/avatar: sets the caller's own avatar ({ variant: "p03-s4-c2-a1" } or null for
 * initials). Whose row changes comes only from the verified token, never from the body.
 */
export async function updateMyAvatar(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const body = req.body as { variant?: unknown } | undefined;
    if (!body || typeof body !== "object" || !("variant" in body)) {
      throw new AppError("variant is required (an avatar ID, or null for initials).", 400);
    }
    const variant = parseAvatarVariantInput(body.variant);
    const appUser = await getAppUserByAuthId(req.user.id);
    const user = await updateOwnAvatarVariant(appUser.id, variant);

    return sendSuccess(res, 200, "Avatar updated successfully.", { avatarVariant: user.avatarVariant });
  } catch (error) {
    return next(error);
  }
}

export async function requestPasswordResetEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await requestPasswordReset({ email: req.body.email });
    return sendSuccess(res, 200, "If an account exists for that email, a reset link has been sent.");
  } catch (error) {
    return next(error);
  }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    await resetPassword(req.user.id, { password: req.body.password });
    return sendSuccess(res, 200, "Password reset successfully.");
  } catch (error) {
    return next(error);
  }
}
