import axios, { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/api'

const fallbackApiBaseUrl = '/api/v1'

function getAccessToken() {
  return window.localStorage.getItem('supervisor_ai_access_token')
}

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as Partial<ApiErrorResponse> | undefined

    if (responseData?.success === false && responseData.error) {
      return responseData.error
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
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(new Error(getErrorMessage(error))),
)
