import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import { avatarFor, getAvatarVariants } from "./avatarService.js";

interface TeamMemberSummary {
  employee_id: string;
  full_name: string;
  job_title: string | null;
  avatarVariant: string | null;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  lead: { supervisor_id: string; full_name: string; avatarVariant: string | null } | null;
  members: TeamMemberSummary[];
}

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  lead_supervisor_id: string | null;
  supervisors: { id: string; user_id: string; full_name: string; organization_id: string } | null;
  team_members: Array<{
    employee_id: string;
    employees: { id: string; user_id: string; full_name: string; job_title: string | null; organization_id: string } | null;
  }>;
}

/**
 * Teams in an organization with their lead and members. Read-only: teams are created by
 * the demo seed or SQL for now. Members from another organization are never returned.
 */
export async function listOrganizationTeams(organizationId: string): Promise<TeamSummary[]> {
  const { data, error } = await supabase
    .from("teams")
    .select(
      `
        id,
        name,
        description,
        lead_supervisor_id,
        supervisors ( id, user_id, full_name, organization_id ),
        team_members (
          employee_id,
          employees ( id, user_id, full_name, job_title, organization_id )
        )
      `
    )
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .returns<TeamRow[]>();

  if (error) {
    throw new AppError("Unable to fetch teams.", 500, true, { cause: error });
  }

  // Avatars only for people in this organization who are shown by name.
  const sameOrganization = <T extends { organization_id: string }>(profile: T | null): profile is T =>
    profile?.organization_id === organizationId;
  const avatars = await getAvatarVariants(
    (data ?? []).flatMap((team) => [
      ...(sameOrganization(team.supervisors) ? [team.supervisors.user_id] : []),
      ...team.team_members.flatMap((member) => (sameOrganization(member.employees) ? [member.employees.user_id] : [])),
    ])
  );

  return (data ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    description: team.description,
    lead: team.supervisors
      ? {
          supervisor_id: team.supervisors.id,
          full_name: team.supervisors.full_name,
          avatarVariant: sameOrganization(team.supervisors) ? avatarFor(avatars, team.supervisors.user_id) : null,
        }
      : null,
    members: team.team_members
      .filter((member) => member.employees?.organization_id === organizationId)
      .map((member) => ({
        employee_id: member.employee_id,
        full_name: member.employees?.full_name ?? "Unknown",
        job_title: member.employees?.job_title ?? null,
        avatarVariant: avatarFor(avatars, member.employees?.user_id),
      }))
      .sort((left, right) => left.full_name.localeCompare(right.full_name)),
  }));
}
