import { createContext } from 'react'
import type {
  AuthOnboardingState,
  AuthenticatedUser,
  LoginCredentials,
  PlatformRole,
  RegisterCredentials,
  SignupCredentials,
  UserRole,
} from '../types/auth'

export interface AuthContextValue {
  error: string | null
  isAuthenticated: boolean
  isLoading: boolean
  status: 'loading' | 'authenticated' | 'unauthenticated'
  login: (credentials: LoginCredentials) => Promise<void>
  logout: (options?: { redirectTo?: string }) => void
  onboarding: AuthOnboardingState | null
  platformRole: PlatformRole | null
  register: (credentials: RegisterCredentials) => Promise<void>
  registerInvitation: (token: string, password: string) => Promise<void>
  role: UserRole | null
  signup: (credentials: SignupCredentials) => Promise<void>
  user: AuthenticatedUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
