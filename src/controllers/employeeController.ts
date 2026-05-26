import { Request, Response } from "express"
import  { getEmployeeProfileByAuthId } from "../services/employeeServices.js";

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