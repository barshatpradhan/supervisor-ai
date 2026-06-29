import { createContext } from 'react'
import type {
  AuthenticatedUser,
  LoginCredentials,
  SignupCredentials,
  UserRole,
} from '../types/auth'

export interface AuthContextValue {
  error: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  role: UserRole | null
  signup: (credentials: SignupCredentials) => Promise<void>
  user: AuthenticatedUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
