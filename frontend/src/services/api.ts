import axios, { AxiosError } from 'axios'
import {
  clearAuthTokens,
  getStoredAccessToken,
  notifyAuthSessionExpired,
} from '../features/auth/utils/tokenStorage'
import type { ApiErrorResponse } from '../types/api'

const fallbackApiBaseUrl = '/api/v1'

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as Partial<ApiErrorResponse> | undefined

    if (responseData?.success === false && responseData.error) {
      return responseData.error
    }

    if (typeof responseData?.message === 'string') {
      return responseData.message
    }
  }

  return 'Something went wrong. Please try again.'
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl,
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

    return Promise.reject(new Error(getErrorMessage(error), { cause: error }))
  },
)
