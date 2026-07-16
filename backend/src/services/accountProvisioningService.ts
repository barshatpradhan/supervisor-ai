import {
  supabase,
  supabaseAuth,
} from "../config/supabase.js";
import type {
  AuthSessionResponse,
  AuthenticatedAppUser,
} from "../types/auth.js";
import type {
  AdminProvisionUserInput,
  ProvisionedAdminUserResponse,
  ProvisioningSkillInput,
  PublicEmployeeSignupInput,
} from "../types/provisioning.js";
import { AppError } from "../utils/appError.js";
import {
  createEmployeeProfileRecordForUser,
  type CreateEmployeeProfileRecordInput,
} from "./employeeService.js";
import { replaceEmployeeSkillsWithDetails } from "./skillService.js";
import {
  createSupervisorProfileRecordForUser,
  type CreateSupervisorProfileRecordInput,
} from "./supervisorService.js";
import { getAppUserByAuthId } from "./userService.js";

interface ProvisioningCleanupState {
  appUserId: string | null;
  authUserId: string | null;
  createdSkillIds: string[];
}

interface AppUserInsertRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: "employee" | "supervisor";
}

const DEFAULT_EMPLOYEE_AVAILABILITY_PERCENTAGE = 100;

function createCleanupState(): ProvisioningCleanupState {
  return {
    appUserId: null,
    authUserId: null,
    createdSkillIds: [],
  };
}

function buildSessionResponse(
  appUser: AuthenticatedAppUser,
  accessToken: string | undefined,
  refreshToken: string | undefined,
  expiresAt: number | undefined
): AuthSessionResponse {
  if (!accessToken || !refreshToken) {
    throw new AppError("Authentication session was not created.", 500, false);
  }

  return {
    user: appUser,
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? null,
  };
}

async function cleanupProvisioning(state: ProvisioningCleanupState) {
  if (state.appUserId) {
    await supabase.from("users").delete().eq("id", state.appUserId);
  }

  if (state.createdSkillIds.length > 0) {
    await supabase.from("skills").delete().in("id", state.createdSkillIds);
  }

  if (state.authUserId) {
    await supabase.auth.admin.deleteUser(state.authUserId);
  }
}

async function createAppUserRecord(input: {
  authUserId: string;
  email: string;
  role: "employee" | "supervisor";
}) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      auth_user_id: input.authUserId,
      email: input.email,
      role: input.role,
    })
    .select("id, auth_user_id, email, role")
    .single<AppUserInsertRow>();

  if (error || !data) {
    throw new AppError("Unable to create application user profile.", 500);
  }

  return data;
}

async function provisionEmployeeProfile(
  appUser: AppUserInsertRow,
  input: CreateEmployeeProfileRecordInput,
  skills: ProvisioningSkillInput[] | undefined,
  cleanupState: ProvisioningCleanupState
) {
  const employee = await createEmployeeProfileRecordForUser(
    {
      id: appUser.id,
      role: appUser.role,
    },
    input
  );

  if (skills && skills.length > 0) {
    const skillResult = await replaceEmployeeSkillsWithDetails(
      employee.id,
      appUser.id,
      skills
    );
    cleanupState.createdSkillIds.push(...skillResult.createdSkillIds);
  }

  return {
    id: employee.id,
    full_name: employee.full_name,
    employment_type: employee.employment_type,
    weekly_capacity_hours: Number(employee.weekly_capacity_hours ?? 0),
  };
}

async function provisionSupervisorProfile(
  appUser: AppUserInsertRow,
  input: CreateSupervisorProfileRecordInput
) {
  const supervisor = await createSupervisorProfileRecordForUser(
    {
      id: appUser.id,
      role: appUser.role,
    },
    input
  );

  return {
    id: supervisor.id,
    full_name: supervisor.full_name,
    department: supervisor.department ?? null,
  };
}

export async function signupEmployeeWithProvisioning(
  input: PublicEmployeeSignupInput
) {
  const cleanupState = createCleanupState();

  try {
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

    if (createUserError || !createdUser.user) {
      throw new AppError("Unable to create account.", 400);
    }

    cleanupState.authUserId = createdUser.user.id;

    const appUser = await createAppUserRecord({
      authUserId: createdUser.user.id,
      email: input.email,
      role: "employee",
    });
    cleanupState.appUserId = appUser.id;

    await provisionEmployeeProfile(
      appUser,
      {
        full_name: input.full_name,
        bio: input.bio ?? null,
        employment_type: input.employment_type,
        weekly_capacity_hours: input.weekly_capacity_hours,
      },
      input.skills,
      cleanupState
    );

    const { data: sessionData, error: loginError } =
      await supabaseAuth.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (loginError || !sessionData.session) {
      throw new AppError("Account created, but login failed.", 500);
    }

    const provisionedUser = await getAppUserByAuthId(createdUser.user.id);

    return buildSessionResponse(
      provisionedUser,
      sessionData.session.access_token,
      sessionData.session.refresh_token,
      sessionData.session.expires_at
    );
  } catch (error) {
    if (cleanupState.authUserId) {
      await cleanupProvisioning(cleanupState);
    }

    throw error;
  }
}

export async function provisionManagedUser(
  input: AdminProvisionUserInput
): Promise<ProvisionedAdminUserResponse> {
  const cleanupState = createCleanupState();

  try {
    const { data: invitedUser, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(input.email);

    if (inviteError || !invitedUser.user) {
      throw new AppError("Unable to create managed account.", 400);
    }

    cleanupState.authUserId = invitedUser.user.id;

    const appUser = await createAppUserRecord({
      authUserId: invitedUser.user.id,
      email: input.email,
      role: input.role,
    });
    cleanupState.appUserId = appUser.id;

    const employeeProfile =
      input.role === "employee"
        ? await provisionEmployeeProfile(
            appUser,
            {
              full_name: input.full_name,
              bio: input.bio ?? null,
              employment_type: input.employment_type,
              weekly_capacity_hours: input.weekly_capacity_hours,
            },
            input.skills,
            cleanupState
          )
        : null;

    const supervisorProfile =
      input.role === "supervisor"
        ? await provisionSupervisorProfile(appUser, {
            full_name: input.full_name,
            department: input.department,
            bio: input.bio,
          })
        : null;

    return {
      user: {
        id: appUser.id,
        email: appUser.email ?? input.email,
        role: appUser.role,
      },
      invitation_sent: true,
      employee_profile: employeeProfile,
      supervisor_profile: supervisorProfile,
    };
  } catch (error) {
    if (cleanupState.authUserId) {
      await cleanupProvisioning(cleanupState);
    }

    throw error;
  }
}
