import type {
  BackendAuthUserContext,
  BackendAuthSession,
  LoginRequest,
  RegisterRequest,
  SignupRequest,
} from '../../types/backend'
import { getJson, postJson } from '../../lib/api'

export function login(credentials: LoginRequest) {
  return postJson<BackendAuthSession, LoginRequest>('/auth/login', credentials)
}

export function signup(credentials: SignupRequest) {
  return postJson<BackendAuthSession, SignupRequest>('/auth/signup', credentials)
}

export function register(credentials: RegisterRequest) {
  return postJson<BackendAuthSession, RegisterRequest>('/auth/register', credentials, {
    skipOrganizationContext: true,
  })
}

export function getCurrentUser() {
  return getJson<BackendAuthUserContext>('/auth/me', {
    skipOrganizationContext: true,
  })
}
