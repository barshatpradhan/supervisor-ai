import type {
  BackendAuthUserContext,
  BackendAuthSession,
  LoginRequest,
  PasswordResetConfirmationRequest,
  PasswordResetRequest,
  RegisterRequest,
  SignupRequest,
} from '../../types/backend'
import { getJson, postJson } from '../../lib/api'

export function login(credentials: LoginRequest) {
  return postJson<BackendAuthSession, LoginRequest>('/auth/login', credentials)
}

export function requestPasswordReset(credentials: PasswordResetRequest) {
  return postJson<void, PasswordResetRequest>('/auth/password-reset', credentials, {
    skipOrganizationContext: true,
  })
}

export function confirmPasswordReset(accessToken: string, credentials: PasswordResetConfirmationRequest) {
  return postJson<void, PasswordResetConfirmationRequest>('/auth/password-reset/confirm', credentials, {
    headers: { Authorization: `Bearer ${accessToken}` },
    skipOrganizationContext: true,
  })
}

export function signup(credentials: SignupRequest) {
  return postJson<BackendAuthSession, SignupRequest>('/auth/signup', credentials)
}

export function register(credentials: RegisterRequest) {
  return postJson<BackendAuthSession, RegisterRequest>('/auth/register', credentials, {
    skipOrganizationContext: true,
  })
}

export function registerInvitation(token: string, password: string) {
  return postJson<BackendAuthSession, { password: string }>(
    `/invitations/${encodeURIComponent(token)}/register`,
    { password },
    { skipOrganizationContext: true },
  )
}

export function getCurrentUser() {
  return getJson<BackendAuthUserContext>('/auth/me', {
    skipOrganizationContext: true,
  })
}
