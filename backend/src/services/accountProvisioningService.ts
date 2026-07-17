import {
  supabase,
  supabaseAuth,
} from "../config/supabase.js";
import type {
  AuthSessionResponse,
  AuthenticatedAppUser,
  AuthUserContextResponse,
  LegacyUserRole,
  PlatformRole,
} from "../types/auth.js";
import type {
  AdminProvisionUserInput,
  ProvisionedAdminUserResponse,
  PublicAccountRegistrationInput,
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
import {
  getAppUserByAuthId,
  getAuthOnboardingStateForAppUser,
} from "./userService.js";

interface ProvisioningCleanupState {
  appUserId: string | null;
  authUserId: string | null;
  createdSkillIds: string[];
}

interface AppUserInsertRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: Extract<LegacyUserRole, "employee" | "supervisor"> | null;
  platform_role: PlatformRole | null;
}

const DEFAULT_EMPLOYEE_AVAILABILITY_PERCENTAGE = 100;
const REGISTRATION_COMPATIBILITY_ROLE: LegacyUserRole = "admin";

function logProvisioningEvent(
  event: string,
  details: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      scope: "account_provisioning",
      event,
      ...details,
    })
  );
}

function formatSupabaseError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    message: error.message ?? null,
  };
}

function wrapProvisioningError(
  message: string,
  operation: string,
  error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  },
  statusCode: number,
  context: Record<string, unknown> = {}
) {
  logProvisioningEvent("supabase_error", {
    operation,
    ...formatSupabaseError(error),
    ...context,
  });

  return new AppError(message, statusCode, true, { cause: error });
}

function createCleanupState(): ProvisioningCleanupState {
  return {
    appUserId: null,
    authUserId: null,
    createdSkillIds: [],
  };
}

async function buildAuthUserContextResponse(
  appUser: AuthenticatedAppUser
): Promise<AuthUserContextResponse> {
  return {
    user: appUser,
    onboarding: await getAuthOnboardingStateForAppUser(appUser.id),
  };
}

async function buildSessionResponse(
  appUser: AuthenticatedAppUser,
  accessToken: string | undefined,
  refreshToken: string | undefined,
  expiresAt: number | undefined
): Promise<AuthSessionResponse> {
  if (!accessToken || !refreshToken) {
    throw new AppError("Authentication session was not created.", 500, false);
  }

  return {
    ...(await buildAuthUserContextResponse(appUser)),
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? null,
  };
}

async function cleanupProvisioning(state: ProvisioningCleanupState) {
  if (state.createdSkillIds.length > 0) {
    const { error } = await supabase
      .from("skills")
      .delete()
      .in("id", state.createdSkillIds);

    if (error) {
      logProvisioningEvent("cleanup_failed", {
        operation: "delete_created_skills",
        skillCount: state.createdSkillIds.length,
        ...formatSupabaseError(error),
      });
    }
  }

  if (state.appUserId) {
    const { error } = await supabase.from("users").delete().eq("id", state.appUserId);

    if (error) {
      logProvisioningEvent("cleanup_failed", {
        operation: "delete_app_user",
        appUserId: state.appUserId,
        ...formatSupabaseError(error),
      });
    }
  }

  if (state.authUserId) {
    const { error } = await supabase.auth.admin.deleteUser(state.authUserId);

    if (error) {
      logProvisioningEvent("cleanup_failed", {
        operation: "delete_auth_user",
        authUserId: state.authUserId,
        ...formatSupabaseError(error),
      });
    }
  }
}

async function createAppUserRecord(input: {
  authUserId: string;
  email: string;
  role: Extract<LegacyUserRole, "employee" | "supervisor"> | null;
}) {
  const insertPayload = {
    auth_user_id: input.authUserId,
    email: input.email,
    role: input.role,
    platform_role: null,
  };

  const { data, error } = await supabase
    .from("users")
    .insert(insertPayload)
    .select("id, auth_user_id, email, role, platform_role")
    .single<AppUserInsertRow>();

  if (
    input.role === null &&
    error?.code === "23502" &&
    error.message?.includes("\"role\"")
  ) {
    logProvisioningEvent("legacy_role_compatibility_fallback", {
      operation: "insert_app_user",
      compatibilityRole: REGISTRATION_COMPATIBILITY_ROLE,
    });

    const compatibilityInsert = await supabase
      .from("users")
      .insert({
        ...insertPayload,
        role: REGISTRATION_COMPATIBILITY_ROLE,
      })
      .select("id, auth_user_id, email, role, platform_role")
      .single<AppUserInsertRow>();

    if (!compatibilityInsert.error && compatibilityInsert.data) {
      return compatibilityInsert.data;
    }

    throw wrapProvisioningError(
      "Unable to create application user profile.",
      "insert_app_user_with_compatibility_role",
      compatibilityInsert.error ?? {
        message: "Missing application user row in Supabase response.",
      },
      500,
      {
        role: REGISTRATION_COMPATIBILITY_ROLE,
      }
    );
  }

  if (error || !data) {
    throw wrapProvisioningError(
      "Unable to create application user profile.",
      "insert_app_user",
      error ?? {
        message: "Missing application user row in Supabase response.",
      },
      500,
      {
        role: input.role,
      }
    );
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
      legacyRole: appUser.role,
    },
    input
  );

  if (skills && skills.length > 0) {
    logProvisioningEvent("link_employee_skills_started", {
      createdSkillCandidateCount: skills.length,
      employeeId: employee.id,
    });
    const skillResult = await replaceEmployeeSkillsWithDetails(
      employee.id,
      appUser.id,
      skills
    );
    cleanupState.createdSkillIds.push(...skillResult.createdSkillIds);
    logProvisioningEvent("link_employee_skills_completed", {
      createdSkillCount: skillResult.createdSkillIds.length,
      employeeId: employee.id,
      linkedSkillCount: skillResult.linkedSkillIds.length,
    });
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
      legacyRole: appUser.role,
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
  logProvisioningEvent("signup_started", {
    hasBio: Boolean(input.bio),
    hasSkills: Boolean(input.skills?.length),
    requestedSkillCount: input.skills?.length ?? 0,
  });

  try {
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

    if (createUserError || !createdUser.user) {
      throw wrapProvisioningError(
        "Unable to create account.",
        "create_auth_user",
        createUserError ?? {
          message: "Missing auth user in Supabase response.",
        },
        400
      );
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

    logProvisioningEvent("signup_completed", {
      appUserId: appUser.id,
      authUserId: createdUser.user.id,
    });

    return await buildSessionResponse(
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

export async function registerCustomerAccount(
  input: PublicAccountRegistrationInput
): Promise<AuthSessionResponse> {
  const cleanupState = createCleanupState();
  logProvisioningEvent("registration_started", {});

  try {
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

    if (createUserError || !createdUser.user) {
      throw wrapProvisioningError(
        "Unable to create account.",
        "register_auth_user",
        createUserError ?? {
          message: "Missing auth user in Supabase response.",
        },
        400
      );
    }

    cleanupState.authUserId = createdUser.user.id;

    const appUser = await createAppUserRecord({
      authUserId: createdUser.user.id,
      email: input.email,
      role: null,
    });
    cleanupState.appUserId = appUser.id;

    const { data: sessionData, error: loginError } =
      await supabaseAuth.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (loginError || !sessionData.session) {
      throw new AppError("Account created, but login failed.", 500);
    }

    const registeredUser = await getAppUserByAuthId(createdUser.user.id);

    logProvisioningEvent("registration_completed", {
      appUserId: appUser.id,
      authUserId: createdUser.user.id,
    });

    return await buildSessionResponse(
      registeredUser,
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
  logProvisioningEvent("managed_user_provisioning_started", {
    requestedRole: input.role,
    requestedSkillCount: input.skills?.length ?? 0,
  });

  try {
    const { data: invitedUser, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(input.email);

    if (inviteError || !invitedUser.user) {
      throw wrapProvisioningError(
        "Unable to create managed account.",
        "invite_auth_user",
        inviteError ?? {
          message: "Missing invited auth user in Supabase response.",
        },
        400,
        {
          requestedRole: input.role,
        }
      );
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

    logProvisioningEvent("managed_user_provisioning_completed", {
      appUserId: appUser.id,
      authUserId: invitedUser.user.id,
      requestedRole: input.role,
    });

    return {
      user: {
        id: appUser.id,
        email: appUser.email ?? input.email,
        role: input.role,
        platformRole: appUser.platform_role,
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
