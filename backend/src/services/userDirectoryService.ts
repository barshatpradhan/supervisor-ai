import { supabase } from "../config/supabase.js";
import type { OrganizationMembershipRole, OrganizationMembershipStatus } from "../types/organization.js";
import { AppError } from "../utils/appError.js";
import { requireUuid } from "../utils/validation.js";

const DIRECTORY_PAGE_SIZE = 10;

/** "none" selects users without an organization (or team). */
type DirectoryScopeFilter = string | "none";
type DirectoryRoleFilter = OrganizationMembershipRole | "platform_admin" | "unassigned";

export interface UserDirectoryQuery {
  organizationId?: DirectoryScopeFilter;
  page: number;
  role?: DirectoryRoleFilter;
  search?: string;
  teamId?: DirectoryScopeFilter;
}

interface UserDirectoryEntry {
  /** One entry per user and organization; users without a membership get one entry. */
  key: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
  platform_role: string | null;
  created_at: string;
  organization: { id: string; name: string } | null;
  organization_role: OrganizationMembershipRole | null;
  membership_status: OrganizationMembershipStatus | null;
  /** Sorted by name; the first one is the grouping team. */
  teams: Array<{ id: string; name: string }>;
}

export interface UserDirectoryPage {
  items: UserDirectoryEntry[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  filters: {
    organizations: Array<{ id: string; name: string; teams: Array<{ id: string; name: string }> }>;
  };
}

const ROLE_FILTERS: readonly DirectoryRoleFilter[] = [
  "organization_admin",
  "supervisor",
  "employee",
  "platform_admin",
  "unassigned",
];

function parseScope(value: unknown, label: string): DirectoryScopeFilter | undefined {
  if (value === undefined || value === "" || value === "all") return undefined;
  if (value === "none") return "none";
  return requireUuid(value, label);
}

/** Validates raw query-string values; unknown or malformed values are rejected with 400. */
export function parseUserDirectoryQuery(raw: Record<string, unknown>): UserDirectoryQuery {
  const page = raw.page === undefined ? 1 : Number(raw.page);
  if (!Number.isInteger(page) || page < 1 || page > 10_000) {
    throw new AppError("Page must be a positive whole number.", 400);
  }

  let role: DirectoryRoleFilter | undefined;
  if (raw.role !== undefined && raw.role !== "" && raw.role !== "all") {
    if (!ROLE_FILTERS.includes(raw.role as DirectoryRoleFilter)) {
      throw new AppError("Role filter is not recognised.", 400);
    }
    role = raw.role as DirectoryRoleFilter;
  }

  const search = typeof raw.search === "string" ? raw.search.trim().slice(0, 100) : undefined;

  return {
    organizationId: parseScope(raw.organizationId, "Organization id"),
    page,
    role,
    search: search || undefined,
    teamId: parseScope(raw.teamId, "Team id"),
  };
}

interface UserRow { id: string; email: string | null; platform_role: string | null; created_at: string }
interface MembershipRow { user_id: string; organization_id: string; role: OrganizationMembershipRole; status: OrganizationMembershipStatus }
interface ProfileRow { id: string; user_id: string; organization_id: string | null; full_name: string | null; job_title?: string | null }
interface TeamRow { id: string; name: string; organization_id: string; lead_supervisor_id: string | null }
interface TeamMemberRow { team_id: string; employee_id: string }

async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns).returns<T[]>();
  if (error) throw new AppError("Unable to load the user directory.", 500, true, { cause: error });
  return data ?? [];
}

const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name);

/**
 * Platform-wide user directory, grouped by organization and then team, filtered and paged
 * at DIRECTORY_PAGE_SIZE. Reads everything and filters in memory, which is fine at the
 * current scale; move the filtering into SQL if user counts grow into the tens of thousands.
 */
export async function listUserDirectory(query: UserDirectoryQuery): Promise<UserDirectoryPage> {
  const [users, memberships, organizations, employees, supervisors, teams, teamMembers] = await Promise.all([
    selectAll<UserRow>("users", "id, email, platform_role, created_at"),
    selectAll<MembershipRow>("organization_members", "user_id, organization_id, role, status"),
    selectAll<{ id: string; name: string }>("organizations", "id, name"),
    selectAll<ProfileRow>("employees", "id, user_id, organization_id, full_name, job_title"),
    selectAll<ProfileRow>("supervisors", "id, user_id, organization_id, full_name"),
    selectAll<TeamRow>("teams", "id, name, organization_id, lead_supervisor_id"),
    selectAll<TeamMemberRow>("team_members", "team_id, employee_id"),
  ]);

  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const profileKey = (userId: string, organizationId: string | null) => `${userId}:${organizationId ?? ""}`;

  const employeeByKey = new Map(employees.map((employee) => [profileKey(employee.user_id, employee.organization_id), employee]));
  const supervisorByKey = new Map(supervisors.map((supervisor) => [profileKey(supervisor.user_id, supervisor.organization_id), supervisor]));

  // Teams per employee profile (membership) and per supervisor profile (lead).
  const teamIdsByProfile = new Map<string, Set<string>>();
  const addTeam = (profileId: string, teamId: string) => {
    teamIdsByProfile.set(profileId, (teamIdsByProfile.get(profileId) ?? new Set()).add(teamId));
  };
  for (const member of teamMembers) addTeam(member.employee_id, member.team_id);
  for (const team of teams) if (team.lead_supervisor_id) addTeam(team.lead_supervisor_id, team.id);

  const membershipsByUser = new Map<string, MembershipRow[]>();
  for (const membership of memberships) {
    membershipsByUser.set(membership.user_id, [...(membershipsByUser.get(membership.user_id) ?? []), membership]);
  }

  const entries: UserDirectoryEntry[] = [];
  for (const user of users) {
    const userMemberships = membershipsByUser.get(user.id) ?? [];
    const scopes = userMemberships.length > 0 ? userMemberships : [null];

    for (const membership of scopes) {
      const organizationId = membership?.organization_id ?? null;
      const employee = employeeByKey.get(profileKey(user.id, organizationId));
      const supervisor = supervisorByKey.get(profileKey(user.id, organizationId));
      const teamIds = new Set([
        ...(employee ? teamIdsByProfile.get(employee.id) ?? [] : []),
        ...(supervisor ? teamIdsByProfile.get(supervisor.id) ?? [] : []),
      ]);
      const organization = organizationId ? organizationsById.get(organizationId) ?? null : null;

      entries.push({
        key: profileKey(user.id, organizationId),
        user_id: user.id,
        email: user.email,
        full_name: employee?.full_name ?? supervisor?.full_name ?? null,
        job_title: employee?.job_title ?? null,
        platform_role: user.platform_role,
        created_at: user.created_at,
        organization: organization ? { id: organization.id, name: organization.name } : null,
        organization_role: membership?.role ?? null,
        membership_status: membership?.status ?? null,
        teams: [...teamIds]
          .map((teamId) => teamsById.get(teamId))
          .filter((team): team is TeamRow => Boolean(team))
          .map((team) => ({ id: team.id, name: team.name }))
          .sort(byName),
      });
    }
  }

  const search = query.search?.toLocaleLowerCase();
  const filtered = entries.filter((entry) => {
    if (query.organizationId === "none" ? entry.organization !== null : query.organizationId && entry.organization?.id !== query.organizationId) {
      return false;
    }
    if (query.teamId === "none" ? entry.teams.length > 0 : query.teamId && !entry.teams.some((team) => team.id === query.teamId)) {
      return false;
    }
    if (query.role === "platform_admin" && entry.platform_role !== "platform_admin") return false;
    if (query.role === "unassigned" && entry.organization_role !== null) return false;
    if (query.role && query.role !== "platform_admin" && query.role !== "unassigned" && entry.organization_role !== query.role) {
      return false;
    }
    if (search) {
      const haystack = [entry.full_name, entry.email, entry.job_title].filter(Boolean).join(" ").toLocaleLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  // Organization, then team, then person. "No organization" and "No team" sort last.
  const last = "￿";
  filtered.sort(
    (left, right) =>
      (left.organization?.name ?? last).localeCompare(right.organization?.name ?? last) ||
      (left.teams[0]?.name ?? last).localeCompare(right.teams[0]?.name ?? last) ||
      (left.full_name ?? left.email ?? last).localeCompare(right.full_name ?? right.email ?? last)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * DIRECTORY_PAGE_SIZE;

  return {
    items: filtered.slice(start, start + DIRECTORY_PAGE_SIZE),
    page,
    page_size: DIRECTORY_PAGE_SIZE,
    total: filtered.length,
    total_pages: totalPages,
    filters: {
      organizations: [...organizations].sort(byName).map((organization) => ({
        id: organization.id,
        name: organization.name,
        teams: teams
          .filter((team) => team.organization_id === organization.id)
          .map((team) => ({ id: team.id, name: team.name }))
          .sort(byName),
      })),
    },
  };
}
