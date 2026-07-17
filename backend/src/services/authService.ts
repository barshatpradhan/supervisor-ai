import { supabase, supabaseAuth } from "../config/supabase.js";
import type {
  AuthenticatedAppUser,
  AuthSessionResponse,
  LoginInput,
  LegacyUserRole,
  PlatformRole,
} from "../types/auth.js";
import type { PublicEmployeeSignupInput } from "../types/provisioning.js";
import { AppError } from "../utils/appError.js";
import { signupEmployeeWithProvisioning } from "./accountProvisioningService.js";

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: LegacyUserRole | null;
  platform_role: PlatformRole | null;
}

function mapAppUser(row: AppUserRow): AuthenticatedAppUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email ?? "",
    platformRole: row.platform_role,
    legacyRole: row.role,
    role: row.role,
  };
}

async function getAppUserByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, platform_role")
    .eq("auth_user_id", authUserId)
    .single<AppUserRow>();

  if (error || !data) {
    throw new AppError("Application user profile was not found.", 404);
  }

  return mapAppUser(data);
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

export async function signup(input: PublicEmployeeSignupInput) {
  return signupEmployeeWithProvisioning(input);
}

export async function login(input: LoginInput) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user || !data.session) {
    throw new AppError("Invalid email or password.", 401);
  }

  const appUser = await getAppUserByAuthId(data.user.id);

  return buildSessionResponse(
    appUser,
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_at
  );
}

export async function getCurrentAppUser(authUserId: string) {
  return getAppUserByAuthId(authUserId);
}
