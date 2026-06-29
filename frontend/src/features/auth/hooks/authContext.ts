import { createContext } from 'react'
import type { AuthenticatedUser, LoginCredentials, SignupCredentials } from '../types/auth'

export interface AuthContextValue {
  error: string | null
  isAuthenticated: boolean
  isLoading: boolean
  loginUser: (credentials: LoginCredentials) => Promise<void>
  logoutUser: () => void
  signupUser: (credentials: SignupCredentials) => Promise<void>
  user: AuthenticatedUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
