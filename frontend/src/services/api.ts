import axios, { AxiosError } from 'axios'
import { API_BASE_URL } from '../lib/api/constants'
import { parseApiError } from '../lib/api/errors'
import {
  clearAuthTokens,
  getStoredAccessToken,
  notifyAuthSessionExpired,
} from '../features/auth/utils/tokenStorage'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401) {
      clearAuthTokens()
      notifyAuthSessionExpired()

      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(parseApiError(error))
  },
)
