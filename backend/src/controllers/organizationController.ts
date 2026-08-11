import type { NextFunction, Request, Response } from "express";
import {
  acceptOrganizationInvitation,
  createOrganizationForAuthenticatedUser,
  createOrganizationInvitation,
  getOrganizationDetails,
  listCurrentUserOrganizations,
  listOrganizationInvitations,
  listOrganizationMembers,
  resendOrganizationInvitation,
  revokeOrganizationInvitation,
} from "../services/organizationService.js";
import type {
  CreateOrganizationInvitationInput,
  OrganizationInvitationSkillInput,
} from "../types/organization.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  isRecord,
  optionalEnum,
  optionalNumber,
  optionalString,
  requireBody,
  requireEmail,
  requireString,
  requireUuid,
} from "../utils/validation.js";

const EMPLOYMENT_TYPES = ["full_time", "part_time"] as const;
const ORGANIZATION_INVITATION_ROLES = ["employee", "supervisor"] as const;
function parseInvitationSkills(body: Record<string, unknown>) {
  const skills = body.skills;

  if (skills === undefined) {
    return undefined;
  }

  if (!Array.isArray(skills)) {
    throw new AppError("profile.skills must be an array.", 400);
  }

  return skills.map<OrganizationInvitationSkillInput>((skill) => {
    if (!isRecord(skill)) {
      throw new AppError("profile.skills must contain objects.", 400);
    }

    return {
      name: requireString(skill, "name", "Skill name"),
      proficiency_level: optionalNumber(skill, "proficiency_level", {
        min: 1,
        max: 5,
      }),
      years_of_experience: optionalNumber(skill, "years_of_experience", {
        min: 0,
        max: 80,
      }),
    };
  });
}

function parseOrganizationInvitationInput(
  body: Record<string, unknown>
): CreateOrganizationInvitationInput {
  const role = optionalEnum(body, "role", ORGANIZATION_INVITATION_ROLES);

  if (!role) {
    throw new AppError("role is required.", 400);
  }

  const profile = requireBody(body.profile);

  if (role === "employee") {
    return {
      email: requireEmail(body, "email"),
      role,
      profile: {
        full_name: requireString(profile, "full_name", "Full name"),
        job_title: optionalString(profile, "job_title"),
        department: optionalString(profile, "department"),
        bio: optionalString(profile, "bio"),
        employment_type: optionalEnum(profile, "employment_type", EMPLOYMENT_TYPES),
        weekly_capacity_hours: optionalNumber(profile, "weekly_capacity_hours", {
          min: 1,
          max: 168,
        }),
        skills: parseInvitationSkills(profile),
      },
    };
  }

  for (const field of ["employment_type", "weekly_capacity_hours", "skills"]) {
    if (profile[field] !== undefined) {
      throw new AppError(`${field} is not supported for supervisor invitations.`, 400);
    }
  }

  return {
    email: requireEmail(body, "email"),
    role,
    profile: {
      full_name: requireString(profile, "full_name", "Full name"),
      department: optionalString(profile, "department"),
      bio: optionalString(profile, "bio"),
    },
  };
}

export async function createOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const body = requireBody(req.body);
    const organization = await createOrganizationForAuthenticatedUser(req.user.id, {
      name: requireString(body, "name", "Organization name"),
      slug: requireString(body, "slug", "Organization slug"),
    });

    return sendSuccess(res, 201, "Organization created successfully.", organization);
  } catch (error) {
    return next(error);
  }
}

export async function listCurrentUserOrganizationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const organizations = await listCurrentUserOrganizations(req.user.id);
    return sendSuccess(res, 200, "Organizations fetched successfully.", organizations);
  } catch (error) {
    return next(error);
  }
}

export async function getOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organizationId = requireUuid(req.params.organizationId, "Organization id");
    const organization = await getOrganizationDetails(organizationId);
    return sendSuccess(res, 200, "Organization fetched successfully.", organization);
  } catch (error) {
    return next(error);
  }
}

export async function listOrganizationMembersHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organizationId = requireUuid(req.params.organizationId, "Organization id");
    const members = await listOrganizationMembers(organizationId);
    return sendSuccess(
      res,
      200,
      "Organization members fetched successfully.",
      members
    );
  } catch (error) {
    return next(error);
  }
}

export async function listOrganizationInvitationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organizationId = requireUuid(req.params.organizationId, "Organization id");
    const invitations = await listOrganizationInvitations(organizationId);
    return sendSuccess(
      res,
      200,
      "Organization invitations fetched successfully.",
      invitations
    );
  } catch (error) {
    return next(error);
  }
}

export async function createOrganizationInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const organizationId = requireUuid(req.params.organizationId, "Organization id");
    const input = parseOrganizationInvitationInput(requireBody(req.body));
    const invitation = await createOrganizationInvitation(req.user.id, organizationId, input);

    return sendSuccess(
      res,
      201,
      "Organization invitation created successfully.",
      invitation
    );
  } catch (error) {
    return next(error);
  }
}

export async function resendOrganizationInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const organizationId = requireUuid(req.params.organizationId, "Organization id");
    const invitationId = requireUuid(req.params.invitationId, "Invitation id");
    const result = await resendOrganizationInvitation(
      req.user.id,
      organizationId,
      invitationId
    );

    return sendSuccess(
      res,
      200,
      "Organization invitation resent successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

export async function revokeOrganizationInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const organizationId = requireUuid(req.params.organizationId, "Organization id");
    const invitationId = requireUuid(req.params.invitationId, "Invitation id");
    const result = await revokeOrganizationInvitation(
      req.user.id,
      organizationId,
      invitationId
    );

    return sendSuccess(
      res,
      200,
      "Organization invitation revoked successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

export async function acceptOrganizationInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const organizationId = requireUuid(
      req.header("x-organization-id"),
      "X-Organization-Id"
    );
    const result = await acceptOrganizationInvitation(req.user.id, organizationId);
    return sendSuccess(
      res,
      200,
      "Organization invitation accepted successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
}
