export type UserRole = "admin" | "supervisor" | "employee";

export interface SignupInput {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedAppUser {
  id: string;
  authUserId: string;
  email: string;
  role: UserRole;
}

export interface AuthSessionResponse {
  user: AuthenticatedAppUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}
