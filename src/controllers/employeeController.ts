import { Request, Response } from "express"
import {
  getEmployeeProfileByAuthId,
  createEmployeeProfile,
} from "../services/employeeService.js";

export async function getMyEmployeeProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const employee = await getEmployeeProfileByAuthId (req.user.id);

  return res.json({
    success: true,
    message: "Employee profile fetched sucessfullly",
    data: employee,
  })
}

export async function createMyEmployeeProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const { full_name,  bio } = req.body;

  if (!full_name){
    return res.sendStatus(400).json({
      success: false,
      message: "Full name is required"
    });
  }

  const employee = await createEmployeeProfile(req.user.id, {
    full_name,
    bio,
  });

  return res.status(201).json({
    success: true,
    message: "Employee profile create successsfully",
    data: employee,
  });
}