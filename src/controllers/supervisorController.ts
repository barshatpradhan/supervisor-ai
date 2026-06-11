import type { Request, Response } from "express";
import {
  createSupervisorProfile,
  getSupervisorProfileByAuthId,
} from "../services/supervisorService.js";

export async function getMySupervisorProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const supervisor = await getSupervisorProfileByAuthId(req.user.id);

    return res.json({
      success: true,
      message: "Supervisor profile fetched successfully",
      data: supervisor,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Supervisor profile not found",
    });
  }
}

export async function createMySupervisorProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const { full_name, department, bio } = req.body;

  if (!full_name) {
    return res.status(400).json({
      success: false,
      message: "Full name is required",
    });
  }

  try {
    const supervisor = await createSupervisorProfile(req.user.id, {
      full_name,
      department,
      bio,
    });

    return res.status(201).json({
      success: true,
      message: "Supervisor profile created successfully",
      data: supervisor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create supervisor profile",
    });
  }
}
