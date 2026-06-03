import type { Request, Response } from "express";
import {
  getCurrentAppUser,
  login,
  signup,
} from "../services/authService.js";
import type { LoginInput, SignupInput } from "../types/auth.js";

export async function signupUser(req: Request, res: Response) {
  try {
    const input: SignupInput = {
      email: req.body.email,
      password: req.body.password,
      role: "employee",
    };

    const data = await signup(input);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to create account.",
    });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const input: LoginInput = {
      email: req.body.email,
      password: req.body.password,
    };

    const data = await login(input);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid email or password.",
    });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized.",
    });
  }

  try {
    const data = await getCurrentAppUser(req.user.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Application user profile was not found.",
    });
  }
}
