import axios, { AxiosError } from 'axios'
import { API_BASE_URL } from '../lib/api/constants'
import { parseApiError } from '../lib/api/errors'
import {
  clearAuthTokens,
  getStoredAccessToken,
  notifyAuthSessionExpired,
} from '../features/auth/utils/tokenStorage'
import {
  getActiveOrganizationId,
  shouldSkipOrganizationHeader,
} from '../features/organizations/utils/organizationRequestContext'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function isPublicRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/signup' ||
    pathname.startsWith('/invitations/')
  )
}

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  const activeOrganizationId = getActiveOrganizationId()
  const shouldAttachOrganizationHeader =
    activeOrganizationId &&
    !shouldSkipOrganizationHeader(
      typeof config.url === 'string' ? config.url : undefined,
      'skipOrganizationContext' in config &&
        config.skipOrganizationContext === true,
    )

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (shouldAttachOrganizationHeader && activeOrganizationId) {
    config.headers['X-Organization-Id'] = activeOrganizationId
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401) {
      clearAuthTokens()
      notifyAuthSessionExpired()

      // A stale token can be present while a visitor opens a public route. The
      // auth provider will clear it and settle as unauthenticated; redirecting
      // here would incorrectly replace the public landing page with login.
      if (!isPublicRoute(window.location.pathname)) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(parseApiError(error))
  },
)
