export type LegacyUserRole = "admin" | "supervisor" | "employee";
export type PlatformRole = "platform_admin";

/**
 * @deprecated Use LegacyUserRole or PlatformRole explicitly.
 */
export type UserRole = LegacyUserRole;

export interface SignupInput {
  email: string;
  password: string;
  role: LegacyUserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedAppUser {
  id: string;
  authUserId: string;
  email: string;
  platformRole: PlatformRole | null;
  /**
   * @deprecated Legacy compatibility field derived from users.role.
   */
  legacyRole: LegacyUserRole | null;
  /**
   * @deprecated Temporary compatibility alias for legacyRole.
   */
  role: LegacyUserRole | null;
}

export interface AuthSessionResponse {
  user: AuthenticatedAppUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}
