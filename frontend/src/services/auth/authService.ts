import type {
  BackendAuthSession,
  BackendAuthUser,
  LoginRequest,
  SignupRequest,
} from '../../types/backend'
import { getJson, postJson } from '../../lib/api'

export function login(credentials: LoginRequest) {
  return postJson<BackendAuthSession, LoginRequest>('/auth/login', credentials)
}

export function signup(credentials: SignupRequest) {
  return postJson<BackendAuthSession, SignupRequest>('/auth/signup', credentials)
}

export function getCurrentUser() {
  return getJson<BackendAuthUser>('/auth/me')
}
