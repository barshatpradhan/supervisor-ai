import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from '../hooks/authContext'
import type { AuthContextValue } from '../hooks/authContext'
import { getCurrentUser, login, signup } from '../services/authService'
import type {
  AuthSession,
  AuthenticatedUser,
  LoginCredentials,
  SignupCredentials,
} from '../types/auth'
import {
  clearAuthTokens,
  getStoredAccessToken,
  storeAuthTokens,
} from '../utils/tokenStorage'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setUser(currentUser)
        }
      } catch {
        clearAuthTokens()
        if (isMounted) {
          setUser(null)
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

  const handleSession = useCallback((session: AuthSession) => {
    storeAuthTokens(session.accessToken, session.refreshToken)
    setUser(session.user)
    setError(null)
  }, [])

  const loginUser = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const session = await login(credentials)
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

  const signupUser = useCallback(
    async (credentials: SignupCredentials) => {
      try {
        const session = await signup(credentials)
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

  const logoutUser = useCallback(() => {
    clearAuthTokens()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: Boolean(user),
      isLoading,
      loginUser,
      logoutUser,
      signupUser,
      user,
    }),
    [error, isLoading, loginUser, logoutUser, signupUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
