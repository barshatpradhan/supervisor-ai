import { api } from '../../../services/api'
import type { ApiResponse } from '../../../types/api'
import type {
  AuthSession,
  AuthenticatedUser,
  LoginCredentials,
  SignupCredentials,
} from '../types/auth'

function unwrapResponse<TData>(response: ApiResponse<TData>) {
  if (!response.success) {
    throw new Error(response.error)
  }

  return response.data
}

export async function login(credentials: LoginCredentials) {
  const response = await api.post<ApiResponse<AuthSession>>('/auth/login', credentials)
  return unwrapResponse(response.data)
}

export async function signup(credentials: SignupCredentials) {
  const response = await api.post<ApiResponse<AuthSession>>('/auth/signup', credentials)
  return unwrapResponse(response.data)
}

export async function getCurrentUser() {
  const response = await api.get<ApiResponse<AuthenticatedUser>>('/auth/me')
  return unwrapResponse(response.data)
}
