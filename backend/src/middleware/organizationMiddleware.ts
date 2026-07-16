import type { NextFunction, Request, Response } from "express";
import type { OrganizationMembershipRole } from "../types/organization.js";
import { resolveOrganizationContextForUser } from "../services/organizationService.js";
import { AppError } from "../utils/appError.js";
import { requireUuid } from "../utils/validation.js";

const ORGANIZATION_HEADER = "x-organization-id";

export async function resolveOrganizationContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError("Unauthorized.", 401));
  }

  try {
    const headerValue = req.header(ORGANIZATION_HEADER);

    if (!headerValue) {
      throw new AppError("X-Organization-Id header is required.", 400);
    }

    const organizationId = requireUuid(headerValue, "X-Organization-Id");

    if (
      req.params.organizationId !== undefined &&
      req.params.organizationId !== organizationId
    ) {
      throw new AppError(
        "Organization route context must match the selected organization header.",
        403
      );
    }

    const context = await resolveOrganizationContextForUser(
      req.user.id,
      organizationId
    );

    req.appUser = context.appUser;
    req.membership = context.membership;
    req.organization = context.organization;

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireOrganizationRole(...allowedRoles: OrganizationMembershipRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.membership) {
      return next(new AppError("Organization membership not resolved.", 500));
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return next(new AppError("Forbidden.", 403));
    }

    return next();
  };
}
