import { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/api'

export class ApiError extends Error {
  statusCode: number | null
  responseBody: ApiErrorResponse | null

  constructor(message: string, options?: {
    cause?: unknown
    responseBody?: ApiErrorResponse | null
    statusCode?: number | null
  }) {
    super(message, { cause: options?.cause })
    this.name = 'ApiError'
    this.statusCode = options?.statusCode ?? null
    this.responseBody = options?.responseBody ?? null
  }
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as Partial<ApiErrorResponse> | undefined

    if (responseData?.success === false && typeof responseData.error === 'string') {
      return responseData.error
    }

    if (typeof responseData?.message === 'string') {
      return responseData.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export function parseApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof AxiosError) {
    const responseData = error.response?.data as Partial<ApiErrorResponse> | undefined
    const responseBody =
      responseData?.success === false && typeof responseData.error === 'string'
        ? {
            success: false,
            error: responseData.error,
            message:
              typeof responseData.message === 'string'
                ? responseData.message
                : responseData.error,
          } as ApiErrorResponse
        : null

    return new ApiError(getApiErrorMessage(error), {
      cause: error,
      responseBody,
      statusCode: error.response?.status ?? null,
    })
  }

  return new ApiError(getApiErrorMessage(error), { cause: error })
}

export function getFriendlyApiErrorMessage(error: unknown) {
  return parseApiError(error).message
}
