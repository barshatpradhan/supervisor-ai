import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

const tokens = vi.hoisted(() => ({
  clearAuthTokens: vi.fn(),
  getStoredAccessToken: vi.fn(() => 'stored-token'),
  notifyAuthSessionExpired: vi.fn(),
}))
vi.mock('../features/auth/utils/tokenStorage', () => tokens)

/** An adapter that fails with the given HTTP status, as the network layer would. */
function failingWith(status: number): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, {
      config,
      data: { success: false, error: status === 401 ? 'Session expired' : 'Server error' },
      headers: {},
      status,
      statusText: '',
    })
  }
}

describe('api authentication handling', () => {
  beforeEach(() => Object.values(tokens).forEach((mock) => mock.mockClear()))

  it('sends the stored access token', async () => {
    let authorization: unknown
    await api.get('/ping', {
      adapter: async (config) => {
        authorization = config.headers.Authorization
        return { config, data: { success: true, data: null }, headers: {}, status: 200, statusText: 'OK' }
      },
    })
    expect(authorization).toBe('Bearer stored-token')
  })

  it('clears the session and notifies listeners after a 401, leaving navigation to the route guards', async () => {
    await expect(api.get('/me', { adapter: failingWith(401) })).rejects.toBeTruthy()

    expect(tokens.clearAuthTokens).toHaveBeenCalledTimes(1)
    expect(tokens.notifyAuthSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('keeps the session for other errors', async () => {
    await expect(api.get('/me', { adapter: failingWith(500) })).rejects.toBeTruthy()

    expect(tokens.clearAuthTokens).not.toHaveBeenCalled()
    expect(tokens.notifyAuthSessionExpired).not.toHaveBeenCalled()
  })
})
