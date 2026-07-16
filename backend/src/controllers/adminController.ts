import type { NextFunction, Request, Response } from "express";
import {
  isValidUserRole,
  listAppUsers,
  updateAppUserRole,
} from "../services/adminService.js";
import { provisionManagedUser } from "../services/accountProvisioningService.js";
import {
  approveSkill,
  listPendingSkills,
  rejectSkill,
} from "../services/skillService.js";
import type { AdminProvisionUserInput } from "../types/provisioning.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { requireBody, requireUuid } from "../utils/validation.js";

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await listAppUsers();

    return sendSuccess(res, 200, "Users fetched successfully.", users);
  } catch (error) {
    return next(error);
  }
}

export async function getPendingSkills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const skills = await listPendingSkills();

    return sendSuccess(res, 200, "Pending skills fetched successfully.", skills);
  } catch (error) {
    return next(error);
  }
}

export async function approveSkillHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const skillId = requireUuid(req.params.skillId, "Skill id");
    const skill = await approveSkill(skillId);

    return sendSuccess(res, 200, "Skill approved successfully.", skill);
  } catch (error) {
    return next(error);
  }
}

export async function rejectSkillHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const skillId = requireUuid(req.params.skillId, "Skill id");
    await rejectSkill(skillId);

    return sendSuccess(res, 200, "Skill rejected successfully.");
  } catch (error) {
    return next(error);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUuid(req.params.userId, "User id");
    const body = requireBody(req.body);
    const role = body.role;

    if (!isValidUserRole(role)) {
      throw new AppError("Role must be one of: admin, supervisor, employee.", 400);
    }

    const user = await updateAppUserRole(userId, role);

    return sendSuccess(res, 200, "User role updated successfully.", user);
  } catch (error) {
    return next(error);
  }
}

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = requireBody(req.body);
    const input: AdminProvisionUserInput = {
      email: String(body.email),
      role: body.role as AdminProvisionUserInput["role"],
      full_name: String(body.full_name),
      bio: typeof body.bio === "string" ? body.bio : undefined,
      department: typeof body.department === "string" ? body.department : undefined,
      employment_type:
        body.employment_type === "full_time" || body.employment_type === "part_time"
          ? body.employment_type
          : undefined,
      weekly_capacity_hours:
        typeof body.weekly_capacity_hours === "number"
          ? body.weekly_capacity_hours
          : undefined,
      skills: Array.isArray(body.skills)
        ? body.skills.map((skill) => ({
            name: String((skill as Record<string, unknown>).name),
            proficiency_level:
              typeof (skill as Record<string, unknown>).proficiency_level === "number"
                ? ((skill as Record<string, unknown>).proficiency_level as number)
                : undefined,
            years_of_experience:
              typeof (skill as Record<string, unknown>).years_of_experience === "number"
                ? ((skill as Record<string, unknown>).years_of_experience as number)
                : (skill as Record<string, unknown>).years_of_experience === null
                  ? null
                  : undefined,
          }))
        : undefined,
    };

    const user = await provisionManagedUser(input);

    return sendSuccess(res, 201, "User provisioned successfully.", user);
  } catch (error) {
    return next(error);
  }
}
