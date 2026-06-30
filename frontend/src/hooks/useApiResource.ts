import { useCallback, useEffect, useRef, useState } from 'react'
import { parseApiError } from '../lib/api'
import type { ApiError } from '../lib/api'

export interface UseApiResourceOptions {
  enabled?: boolean
}

export interface UseApiResourceResult<TData> {
  data: TData | null
  error: ApiError | null
  isLoading: boolean
  isRefreshing: boolean
  refetch: () => Promise<TData | null>
}

export function useApiResource<TData>(
  fetcher: () => Promise<TData>,
  { enabled = true }: UseApiResourceOptions = {},
): UseApiResourceResult<TData> {
  const [data, setData] = useState<TData | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const runRequest = useCallback(
    async (isManualRefresh = false) => {
      if (!enabled) {
        return null
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      if (isManualRefresh) {
        setIsRefreshing(true)
      }

      setError(null)

      try {
        const nextData = await fetcher()

        if (mountedRef.current && requestIdRef.current === requestId) {
          setData(nextData)
          setHasLoaded(true)
        }

        return nextData
      } catch (caughtError) {
        const parsedError = parseApiError(caughtError)

        if (mountedRef.current && requestIdRef.current === requestId) {
          setError(parsedError)
        }

        throw parsedError
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setIsRefreshing(false)
        }
      }
    },
    [enabled, fetcher],
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    void fetcher()
      .then((nextData) => {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setData(nextData)
          setHasLoaded(true)
        }
      })
      .catch((caughtError) => {
        const parsedError = parseApiError(caughtError)

        if (mountedRef.current && requestIdRef.current === requestId) {
          setError(parsedError)
        }
      })
  }, [enabled, fetcher])

  const isLoading = enabled && !hasLoaded && data === null && error === null

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refetch: () => runRequest(true),
  }
}
