export interface ApiSuccessResponse<TData = void> {
  success: true
  data?: TData
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse

export interface PaginatedData<TItem> {
  items: TItem[]
  page: number
  limit: number
  total: number
}

export type PaginatedResponse<TItem> = ApiSuccessResponse<PaginatedData<TItem>>
