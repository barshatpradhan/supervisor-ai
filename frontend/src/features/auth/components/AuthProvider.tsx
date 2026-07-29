import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../hooks/authContext'
import type { AuthContextValue } from '../hooks/authContext'
import {
  getCurrentUser,
  login as loginWithBackend,
  register as registerWithBackend,
  registerInvitation as registerInvitationWithBackend,
  signup as signupWithBackend,
} from '../services/authService'
import type {
  AuthOnboardingState,
  AuthSession,
  AuthenticatedUser,
  LoginCredentials,
  RegisterCredentials,
  SignupCredentials,
} from '../types/auth'
import {
  authSessionExpiredEvent,
  clearAuthTokens,
  getStoredAccessToken,
  storeAuthTokens,
} from '../utils/tokenStorage'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [onboarding, setOnboarding] = useState<AuthOnboardingState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearSession = useCallback(() => {
    clearAuthTokens()
    queryClient.clear()
    setUser(null)
    setOnboarding(null)
    setError(null)
  }, [queryClient])

  useEffect(() => {
    let isMounted = true

    async function hydrateUser() {
      if (!getStoredAccessToken()) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentUser()
        if (isMounted) {
          setUser(currentUser.user)
          setOnboarding(currentUser.onboarding)
        }
      } catch {
        clearAuthTokens()
        if (isMounted) {
          setUser(null)
          setOnboarding(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void hydrateUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    function handleSessionExpired() {
      clearSession()
    }

    window.addEventListener(authSessionExpiredEvent, handleSessionExpired)

    return () => {
      window.removeEventListener(authSessionExpiredEvent, handleSessionExpired)
    }
  }, [clearSession])

  const handleSession = useCallback((session: AuthSession) => {
    storeAuthTokens(session.accessToken, session.refreshToken)
    setUser(session.user)
    setOnboarding(session.onboarding)
    setError(null)
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const session = await loginWithBackend(credentials)
        handleSession(session)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : 'Unable to log in.'
        setError(message)
        throw new Error(message, { cause: caughtError })
      }
    },
    [handleSession],
  )

  const signup = useCallback(
    async (credentials: SignupCredentials) => {
      try {
        const session = await signupWithBackend(credentials)
        handleSession(session)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : 'Unable to create account.'
        setError(message)
        throw new Error(message, { cause: caughtError })
      }
    },
    [handleSession],
  )

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        const session = await registerWithBackend(credentials)
        handleSession(session)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : 'Unable to create account.'
        setError(message)
        throw new Error(message, { cause: caughtError })
      }
    },
    [handleSession],
  )

  const registerInvitation = useCallback(
    async (token: string, password: string) => {
      try {
        const session = await registerInvitationWithBackend(token, password)
        handleSession(session)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Unable to create account.'
        setError(message)
        throw new Error(message, { cause: caughtError })
      }
    },
    [handleSession],
  )

  const logout = useCallback((options?: { redirectTo?: string }) => {
    clearSession()
    navigate(options?.redirectTo ?? '/login', { replace: true })
  }, [clearSession, navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: Boolean(user),
      isLoading,
      status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
      login,
      logout,
      onboarding,
      platformRole: user?.platformRole ?? null,
      register,
      registerInvitation,
      role: user?.role ?? null,
      signup,
      user,
    }),
    [error, isLoading, login, logout, onboarding, register, registerInvitation, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
