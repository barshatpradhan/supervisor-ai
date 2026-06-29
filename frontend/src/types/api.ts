export interface ApiSuccessResponse<TData> {
  success: true
  data: TData
}

export interface ApiErrorResponse {
  success: false
  error: string
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse

export interface PaginatedData<TItem> {
  items: TItem[]
  page: number
  limit: number
  total: number
}

export type PaginatedResponse<TItem> = ApiSuccessResponse<PaginatedData<TItem>>
