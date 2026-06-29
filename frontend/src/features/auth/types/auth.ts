export type UserRole = 'admin' | 'supervisor' | 'employee'

export interface AuthenticatedUser {
  id: string
  authUserId: string
  email: string
  role: UserRole
}

export interface AuthSession {
  user: AuthenticatedUser
  accessToken: string
  refreshToken: string
  expiresAt: number | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
}
