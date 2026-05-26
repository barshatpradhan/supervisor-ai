import { Request, Response } from "express";

export function getCurrentUser(req: Request, res: Response) {
  return res.json({
    success:true,
    message: "Authenticated user found",
    user: req.user,
  });
}