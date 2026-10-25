import { supabase } from "../config/supabase.js";
import type { OrganizationMembershipRole } from "../types/organization.js";
import { AppError } from "../utils/appError.js";
import { listOrganizationMembers } from "./organizationService.js";

/*
 * Organization-admin changes to member roles and teams. Every write is one database function
 * (supabase/migrations/202610260001_member_roles_and_teams.sql), so it fully applies or not at all,
 * and each function re-checks that the actor is an active organization_admin of the organization
 * and that every id belongs to it. The organization and actor always come from the verified request
 * context (resolveOrganizationContext), never from the request body.
 */

export interface RoleChangePreview {
  membershipId: string;
  fromRole: OrganizationMembershipRole;
  toRole: OrganizationMembershipRole;
  unchanged: boolean;
  /** The first rule that blocks the change, or null when it is allowed. */
  blockedReason: RoleChangeBlock | null;
  openTasks: number;
  completedTasks: number;
  teamsLed: string[];
  teamsMemberOf: string[];
  /** The profile the new role needs and the member doesn't have yet; the dialog asks for its name. */
  needsProfile: "employee" | "supervisor" | null;
  /** Prefill for that name: the member's other profile name. Never derived from the email. */
  suggestedName: string | null;
}

export type RoleChangeBlock = "last_admin" | "has_open_tasks" | "leads_teams" | "member_not_active";

export interface UnassignableOpenTask {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  projectId: string;
  projectTitle: string;
  employeeId: string;
  employeeName: string;
  memberRole: OrganizationMembershipRole | null;
  memberStatus: string | null;
}

interface RoleChangeFactsRow {
  membership_id: string;
  from_role: OrganizationMembershipRole;
  to_role: OrganizationMembershipRole;
  unchanged: boolean;
  blocked_reason: string | null;
  blocked_detail: string | null;
  open_tasks: number;
  completed_tasks: number;
  teams_led: string[];
  teams_member_of: string[];
  needs_profile: "employee" | "supervisor" | null;
  suggested_name: string | null;
}

interface DatabaseError {
  code?: string;
  message?: string;
  details?: string | null;
}

/** Plain-language messages for the codes the functions raise, with their HTTP status. */
function toAppError(operation: string, error: DatabaseError): AppError {
  const detail = error.details ?? "";
  if (error.code === "P0001") {
    switch (error.message) {
      case "forbidden":
        return new AppError("Only organization admins can do this.", 403);
      case "member_not_found":
        return new AppError("Member not found.", 404);
      case "team_not_found":
        return new AppError("Team not found.", 404);
      case "employee_not_found":
        return new AppError("Employee not found, or they can't be added to a team.", 404);
      case "invalid_role":
        return new AppError("role must be organization_admin, supervisor or employee.", 400);
      case "invalid_request":
        return new AppError("Choose a different team.", 400);
      case "invalid_team_name":
        return new AppError("Team name must be 1 to 80 characters.", 400);
      case "invalid_name":
        return new AppError("Name must be 120 characters or fewer.", 400);
      case "name_required":
        return new AppError("Enter a name for the new profile.", 400);
      case "member_not_active":
        return new AppError("Only active members can change roles.", 409);
      case "last_admin":
        return new AppError("The organization needs at least one active admin. Make someone else an admin first.", 409);
      case "has_open_tasks":
        return new AppError(`This member has ${detail || "open"} open task(s). Reassign them first.`, 409);
      case "leads_teams":
        return new AppError(`This member leads ${detail || "a team"}. Choose a new lead first.`, 409);
      case "team_not_empty": {
        const counts = parseCounts(detail);
        return new AppError(
          `Remove or move the team's ${counts.active} active and ${counts.inactive} inactive member(s) first.`,
          409
        );
      }
      case "team_name_taken":
        return new AppError("Another team already has this name.", 409);
      case "already_in_team":
        return new AppError("This employee is already in that team.", 409);
      case "not_in_team":
        return new AppError("This employee is not in that team.", 409);
      case "invalid_lead":
        return new AppError("The lead must be an active supervisor or admin with a supervisor profile.", 409);
    }
  }
  return new AppError(`Unable to ${operation}.`, 500, true, { cause: error });
}

function parseCounts(detail: string) {
  try {
    const parsed = JSON.parse(detail) as { active?: number; inactive?: number };
    return { active: Number(parsed.active ?? 0), inactive: Number(parsed.inactive ?? 0) };
  } catch {
    return { active: 0, inactive: 0 };
  }
}

const BLOCKS = new Set<string>(["last_admin", "has_open_tasks", "leads_teams", "member_not_active"]);

// Roles -------------------------------------------------------------------------------------------

export async function previewMemberRoleChange(
  organizationId: string,
  actorUserId: string,
  membershipId: string,
  role: OrganizationMembershipRole
): Promise<RoleChangePreview> {
  const { data, error } = await supabase.rpc("org_member_role_preview", {
    p_organization_id: organizationId,
    p_actor_user_id: actorUserId,
    p_membership_id: membershipId,
    p_new_role: role,
  });
  if (error) throw toAppError("preview the role change", error);

  const facts = data as RoleChangeFactsRow;
  return {
    membershipId: facts.membership_id,
    fromRole: facts.from_role,
    toRole: facts.to_role,
    unchanged: facts.unchanged,
    blockedReason: facts.blocked_reason && BLOCKS.has(facts.blocked_reason) ? (facts.blocked_reason as RoleChangeBlock) : null,
    openTasks: facts.open_tasks,
    completedTasks: facts.completed_tasks,
    teamsLed: facts.teams_led,
    teamsMemberOf: facts.teams_member_of,
    needsProfile: facts.needs_profile,
    suggestedName: facts.suggested_name,
  };
}

/** Changes the role and returns the member as the member directory shows them. */
export async function changeMemberRole(
  organizationId: string,
  actorUserId: string,
  membershipId: string,
  role: OrganizationMembershipRole,
  fullName: string | undefined
) {
  const { error } = await supabase.rpc("org_change_member_role", {
    p_organization_id: organizationId,
    p_actor_user_id: actorUserId,
    p_membership_id: membershipId,
    p_new_role: role,
    p_full_name: fullName ?? null,
  });
  if (error) throw toAppError("change the role", error);

  const member = (await listOrganizationMembers(organizationId)).find((entry) => entry.membership_id === membershipId);
  if (!member) throw new AppError("Member not found.", 404);
  return member;
}

// Teams -------------------------------------------------------------------------------------------

export async function createTeam(
  organizationId: string,
  actorUserId: string,
  input: { name: string; description?: string; leadSupervisorId?: string | null }
) {
  const { data, error } = await supabase.rpc("org_create_team", {
    p_organization_id: organizationId,
    p_actor_user_id: actorUserId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_lead_supervisor_id: input.leadSupervisorId ?? null,
  });
  if (error) throw toAppError("create the team", error);
  return { id: data as string };
}

/** Undefined fields stay as they are; leadSupervisorId null clears the lead. */
export async function updateTeam(
  organizationId: string,
  actorUserId: string,
  teamId: string,
  input: { name?: string; description?: string; leadSupervisorId?: string | null }
) {
  const { error } = await supabase.rpc("org_update_team", {
    p_organization_id: organizationId,
    p_actor_user_id: actorUserId,
    p_team_id: teamId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_change_lead: input.leadSupervisorId !== undefined,
    p_lead_supervisor_id: input.leadSupervisorId ?? null,
  });
  if (error) throw toAppError("update the team", error);
}

export async function deleteTeam(organizationId: string, actorUserId: string, teamId: string) {
  const { error } = await supabase.rpc("org_delete_team", {
    p_organization_id: organizationId,
    p_actor_user_id: actorUserId,
    p_team_id: teamId,
  });
  if (error) throw toAppError("delete the team", error);
}

/** Add (from null), remove (to null) or move (both) one employee in one step. */
export async function changeTeamMembership(
  organizationId: string,
  actorUserId: string,
  employeeId: string,
  fromTeamId: string | null,
  toTeamId: string | null
) {
  const { error } = await supabase.rpc("org_change_team_membership", {
    p_organization_id: organizationId,
    p_actor_user_id: actorUserId,
    p_employee_id: employeeId,
    p_from_team_id: fromTeamId,
    p_to_team_id: toTeamId,
  });
  if (error) throw toAppError("update the team members", error);
}

// Tasks left with people who can't be assigned ------------------------------------------------------

export async function listUnassignableOpenTasks(organizationId: string): Promise<UnassignableOpenTask[]> {
  const { data, error } = await supabase.rpc("org_unassignable_open_tasks", { p_organization_id: organizationId });
  if (error) throw toAppError("load tasks that need a new assignee", error);

  return ((data ?? []) as Array<Record<string, string | null>>).map((row) => ({
    taskId: row.task_id as string,
    taskTitle: row.task_title as string,
    taskStatus: row.task_status as string,
    projectId: row.project_id as string,
    projectTitle: row.project_title as string,
    employeeId: row.employee_id as string,
    employeeName: row.employee_name as string,
    memberRole: row.member_role as OrganizationMembershipRole | null,
    memberStatus: row.member_status,
  }));
}
