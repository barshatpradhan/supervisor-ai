import type { NextFunction, Request, Response } from "express";
import {
  getCurrentAppUser,
  login,
  signup,
} from "../services/authService.js";
import type { LoginInput } from "../types/auth.js";
import type { PublicEmployeeSignupInput } from "../types/provisioning.js";
import { AppError } from "../utils/appError.js";
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
