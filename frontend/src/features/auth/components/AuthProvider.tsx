import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../hooks/authContext'
import type { AuthContextValue } from '../hooks/authContext'
import {
  getCurrentUser,
  login as loginWithBackend,
  signup as signupWithBackend,
} from '../services/authService'
import type {
  AuthSession,
  AuthenticatedUser,
  LoginCredentials,
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
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearSession = useCallback(() => {
    clearAuthTokens()
    setUser(null)
    setError(null)
  }, [])

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

  const logout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [clearSession, navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      role: user?.role ?? null,
      signup,
      user,
    }),
    [error, isLoading, login, logout, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
