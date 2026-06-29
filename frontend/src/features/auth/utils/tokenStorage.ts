const accessTokenKey = 'supervisor_ai_access_token'
const refreshTokenKey = 'supervisor_ai_refresh_token'
export const authSessionExpiredEvent = 'supervisor-ai:auth-session-expired'

export function getStoredAccessToken() {
  return window.localStorage.getItem(accessTokenKey)
}

export function storeAuthTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(accessTokenKey, accessToken)
  window.localStorage.setItem(refreshTokenKey, refreshToken)
}

export function clearAuthTokens() {
  window.localStorage.removeItem(accessTokenKey)
  window.localStorage.removeItem(refreshTokenKey)
}

export function notifyAuthSessionExpired() {
  window.dispatchEvent(new Event(authSessionExpiredEvent))
}
