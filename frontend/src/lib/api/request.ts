import type { AxiosRequestConfig, Method } from 'axios'
import { api } from '../../services/api'
import type { ApiResponse } from '../../types/api'
import { parseApiError } from './errors'

function unwrapApiResponse<TData>(response: ApiResponse<TData>) {
  if (!response.success) {
    throw new Error(response.error)
  }

  return response.data as TData
}

export interface ApiRequestOptions<TBody = unknown>
  extends Omit<AxiosRequestConfig<TBody>, 'method' | 'url' | 'data'> {
  data?: TBody
  skipOrganizationContext?: boolean
}

async function requestJson<TResponse, TBody = unknown>(
  method: Method,
  url: string,
  options?: ApiRequestOptions<TBody>,
) {
  try {
    const response = await api.request<ApiResponse<TResponse>>({
      ...options,
      data: options?.data,
      method,
      url,
    })

    return unwrapApiResponse(response.data)
  } catch (error) {
    throw parseApiError(error)
  }
}

export function getJson<TResponse>(url: string, options?: ApiRequestOptions) {
  return requestJson<TResponse>('get', url, options)
}

export function postJson<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options?: ApiRequestOptions<TBody>,
) {
  return requestJson<TResponse, TBody>('post', url, {
    ...options,
    data: body,
  })
}

export function patchJson<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options?: ApiRequestOptions<TBody>,
) {
  return requestJson<TResponse, TBody>('patch', url, {
    ...options,
    data: body,
  })
}

export function deleteJson<TResponse>(url: string, options?: ApiRequestOptions) {
  return requestJson<TResponse>('delete', url, options)
}

export async function postFormData<TResponse>(
  url: string,
  formData: FormData,
  options?: ApiRequestOptions<FormData>,
) {
  return requestJson<TResponse, FormData>('post', url, {
    ...options,
    data: formData,
    headers: {
      ...(options?.headers ?? {}),
      'Content-Type': 'multipart/form-data',
    },
  })
}
