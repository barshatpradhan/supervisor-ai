import { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/api'

export class ApiError extends Error {
  statusCode: number | null
  responseBody: ApiErrorResponse | null
  /** Seconds from the Retry-After header (429/503), or null when the server sent none. */
  retryAfterSeconds: number | null

  constructor(message: string, options?: {
    cause?: unknown
    responseBody?: ApiErrorResponse | null
    statusCode?: number | null
    retryAfterSeconds?: number | null
  }) {
    super(message, { cause: options?.cause })
    this.name = 'ApiError'
    this.statusCode = options?.statusCode ?? null
    this.responseBody = options?.responseBody ?? null
    this.retryAfterSeconds = options?.retryAfterSeconds ?? null
  }
}

function parseRetryAfter(value: unknown) {
  const seconds = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null
}

/** Seconds to wait when the error is a 429 rate limit; null for anything else. */
export function rateLimitRetryAfter(error: unknown) {
  if (!(error instanceof ApiError) || error.statusCode !== 429) return null
  return error.retryAfterSeconds ?? 60
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
      retryAfterSeconds: parseRetryAfter(error.response?.headers?.['retry-after']),
    })
  }

  return new ApiError(getApiErrorMessage(error), { cause: error })
}

export function getFriendlyApiErrorMessage(error: unknown) {
  return parseApiError(error).message
}
