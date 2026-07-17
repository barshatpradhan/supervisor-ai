import { supabaseAuth } from "../config/supabase.js";
import type {
  AuthUserContextResponse,
  AuthSessionResponse,
  LoginInput,
  RegisterInput,
} from "../types/auth.js";
import type { PublicEmployeeSignupInput } from "../types/provisioning.js";
import { AppError } from "../utils/appError.js";
import {
  registerCustomerAccount,
  signupEmployeeWithProvisioning,
} from "./accountProvisioningService.js";
import {
  getAppUserByAuthId,
  getAuthOnboardingStateForAppUser,
} from "./userService.js";

const LEGACY_EMPLOYEE_SIGNUP_ENABLED =
  process.env.AUTH_LEGACY_EMPLOYEE_SIGNUP_ENABLED === "true";

function buildSessionResponse(
  authContext: AuthUserContextResponse,
  accessToken: string | undefined,
  refreshToken: string | undefined,
  expiresAt: number | undefined
): AuthSessionResponse {
  if (!accessToken || !refreshToken) {
    throw new AppError("Authentication session was not created.", 500, false);
  }

  return {
    ...authContext,
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? null,
  };
}

async function buildAuthUserContext(authUserId: string): Promise<AuthUserContextResponse> {
  const appUser = await getAppUserByAuthId(authUserId);

  return {
    user: appUser,
    onboarding: await getAuthOnboardingStateForAppUser(appUser.id),
  };
}

export async function signup(input: PublicEmployeeSignupInput) {
  if (!LEGACY_EMPLOYEE_SIGNUP_ENABLED) {
    throw new AppError(
      "Legacy employee signup has been deprecated. Register an account, create an organization, or accept an invitation.",
      410
    );
  }

  return signupEmployeeWithProvisioning(input);
}

export async function register(input: RegisterInput) {
  return registerCustomerAccount(input);
}

export async function login(input: LoginInput) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user || !data.session) {
    throw new AppError("Invalid email or password.", 401);
  }

  const authContext = await buildAuthUserContext(data.user.id);

  return buildSessionResponse(
    authContext,
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_at
  );
}

export async function getCurrentAppUser(authUserId: string) {
  return buildAuthUserContext(authUserId);
}
