import type { NextFunction, Request, Response } from "express";
import {
  changeMemberRole,
  changeTeamMembership,
  createTeam,
  deleteTeam,
  listUnassignableOpenTasks,
  previewMemberRoleChange,
  updateTeam,
} from "../services/organizationAdminService.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  optionalEnumValue,
  optionalString,
  requireBody,
  requireString,
  requireUuid,
} from "../utils/validation.js";

const ROLES = ["organization_admin", "supervisor", "employee"] as const;

/**
 * The organization and the acting user, from the verified request context (never from the body).
 * Routes run resolveOrganizationContext and requireOrganizationRole("organization_admin") first.
 */
function adminContext(req: Request) {
  if (!req.organization || !req.appUser) {
    throw new AppError("Organization membership not resolved.", 500);
  }
  return { organizationId: req.organization.id, actorUserId: req.appUser.id };
}

function requireRole(value: unknown) {
  const role = optionalEnumValue(value, "role", ROLES);
  if (!role) throw new AppError(`role must be one of: ${ROLES.join(", ")}.`, 400);
  return role;
}

/** Optional text field with a length limit; "" and null count as not given. */
function optionalText(body: Record<string, unknown>, field: string, max: number) {
  const value = optionalString(body, field);
  if (value !== undefined && value.length > max) {
    throw new AppError(`${field} must be ${max} characters or fewer.`, 400);
  }
  return value;
}

/** leadSupervisorId: absent = unchanged, null = no lead, otherwise a UUID. */
function optionalLead(body: Record<string, unknown>) {
  if (!("leadSupervisorId" in body)) return undefined;
  if (body.leadSupervisorId === null) return null;
  return requireUuid(body.leadSupervisorId, "leadSupervisorId");
}

// Roles -------------------------------------------------------------------------------------------

export async function previewMemberRoleChangeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const membershipId = requireUuid(req.params.membershipId, "Membership id");
    const role = requireRole(req.query.role);
    const preview = await previewMemberRoleChange(organizationId, actorUserId, membershipId, role);
    return sendSuccess(res, 200, "Role change preview fetched successfully.", preview);
  } catch (error) {
    return next(error);
  }
}

export async function changeMemberRoleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const membershipId = requireUuid(req.params.membershipId, "Membership id");
    const body = requireBody(req.body);
    const role = requireRole(body.role);
    const fullName = optionalText(body, "fullName", 120);
    const member = await changeMemberRole(organizationId, actorUserId, membershipId, role, fullName);
    return sendSuccess(res, 200, "Member role updated successfully.", member);
  } catch (error) {
    return next(error);
  }
}

// Teams -------------------------------------------------------------------------------------------

export async function createTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const body = requireBody(req.body);
    const name = requireString(body, "name", "Team name");
    if (name.length > 80) throw new AppError("Team name must be 1 to 80 characters.", 400);
    const team = await createTeam(organizationId, actorUserId, {
      name,
      description: optionalText(body, "description", 500),
      leadSupervisorId: optionalLead(body) ?? null,
    });
    return sendSuccess(res, 201, "Team created successfully.", team);
  } catch (error) {
    return next(error);
  }
}

export async function updateTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const teamId = requireUuid(req.params.teamId, "Team id");
    const body = requireBody(req.body);
    const name = "name" in body ? requireString(body, "name", "Team name") : undefined;
    if (name !== undefined && name.length > 80) throw new AppError("Team name must be 1 to 80 characters.", 400);
    // An empty description clears it; absent leaves it.
    const description = "description" in body ? (optionalText(body, "description", 500) ?? "") : undefined;
    const leadSupervisorId = optionalLead(body);
    if (name === undefined && description === undefined && leadSupervisorId === undefined) {
      throw new AppError("Nothing to update: send name, description or leadSupervisorId.", 400);
    }
    await updateTeam(organizationId, actorUserId, teamId, { name, description, leadSupervisorId });
    return sendSuccess(res, 200, "Team updated successfully.", { id: teamId });
  } catch (error) {
    return next(error);
  }
}

export async function deleteTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const teamId = requireUuid(req.params.teamId, "Team id");
    await deleteTeam(organizationId, actorUserId, teamId);
    return sendSuccess(res, 200, "Team deleted successfully.", { id: teamId });
  } catch (error) {
    return next(error);
  }
}

export async function addTeamMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const teamId = requireUuid(req.params.teamId, "Team id");
    const employeeId = requireUuid(requireBody(req.body).employeeId, "employeeId");
    await changeTeamMembership(organizationId, actorUserId, employeeId, null, teamId);
    return sendSuccess(res, 201, "Team member added successfully.", { teamId, employeeId });
  } catch (error) {
    return next(error);
  }
}

export async function removeTeamMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const teamId = requireUuid(req.params.teamId, "Team id");
    const employeeId = requireUuid(req.params.employeeId, "Employee id");
    await changeTeamMembership(organizationId, actorUserId, employeeId, teamId, null);
    return sendSuccess(res, 200, "Team member removed successfully.", { teamId, employeeId });
  } catch (error) {
    return next(error);
  }
}

export async function moveTeamMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, actorUserId } = adminContext(req);
    const fromTeamId = requireUuid(req.params.teamId, "Team id");
    const employeeId = requireUuid(req.params.employeeId, "Employee id");
    const toTeamId = requireUuid(requireBody(req.body).toTeamId, "toTeamId");
    await changeTeamMembership(organizationId, actorUserId, employeeId, fromTeamId, toTeamId);
    return sendSuccess(res, 200, "Team member moved successfully.", { fromTeamId, toTeamId, employeeId });
  } catch (error) {
    return next(error);
  }
}

// Tasks left with people who can't be assigned ------------------------------------------------------

export async function listUnassignableOpenTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId } = adminContext(req);
    const tasks = await listUnassignableOpenTasks(organizationId);
    return sendSuccess(res, 200, "Tasks that need a new assignee fetched successfully.", tasks);
  } catch (error) {
    return next(error);
  }
}
