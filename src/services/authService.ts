import { supabase } from "../config/supabase.js";
import type {
  AuthenticatedAppUser,
  AuthSessionResponse,
  LoginInput,
  SignupInput,
  UserRole,
} from "../types/auth.js";

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: UserRole;
}

function mapAppUser(row: AppUserRow): AuthenticatedAppUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email ?? "",
    role: row.role,
  };
}

async function getAppUserByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role")
    .eq("auth_user_id", authUserId)
    .single<AppUserRow>();

  if (error || !data) {
    throw new Error("Application user profile was not found.");
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
    throw new Error("Authentication session was not created.");
  }

  return {
    user: appUser,
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? null,
  };
}

export async function signup(input: SignupInput) {
  const { data: createdUser, error: createUserError } =
    await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

  if (createUserError || !createdUser.user) {
    throw new Error("Unable to create account.");
  }

  const authUserId = createdUser.user.id;

  const { error: appUserError } = await supabase.from("users").insert({
    auth_user_id: authUserId,
    email: input.email,
    role: input.role,
  });

  if (appUserError) {
    await supabase.auth.admin.deleteUser(authUserId);
    throw new Error("Unable to create application user profile.");
  }

  const { data: sessionData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

  if (loginError || !sessionData.session) {
    throw new Error("Account created, but login failed.");
  }

  const appUser = await getAppUserByAuthId(authUserId);

  return buildSessionResponse(
    appUser,
    sessionData.session.access_token,
    sessionData.session.refresh_token,
    sessionData.session.expires_at
  );
}

export async function login(input: LoginInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user || !data.session) {
    throw new Error("Invalid email or password.");
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
