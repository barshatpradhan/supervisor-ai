import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './constants'

export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface NormalizedPagination {
  page: number
  limit: number
}

export function normalizePagination(query?: PaginationQuery): NormalizedPagination {
  const pageValue = query?.page
  const limitValue = query?.limit
  const page =
    typeof pageValue === 'number' && Number.isFinite(pageValue) && pageValue > 0
      ? Math.floor(pageValue)
      : DEFAULT_PAGE
  const limit =
    typeof limitValue === 'number' && Number.isFinite(limitValue) && limitValue > 0
      ? Math.floor(limitValue)
      : DEFAULT_PAGE_SIZE

  return {
    page,
    limit,
  }
}

export function buildPaginationSearchParams(query?: PaginationQuery) {
  const normalized = normalizePagination(query)
  const params = new URLSearchParams()
  params.set('page', String(normalized.page))
  params.set('limit', String(normalized.limit))
  return params
}
