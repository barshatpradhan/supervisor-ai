const DEFAULT_POST_AUTH_PATH = '/dashboard'
const INVITATION_ACCEPT_PATH = '/invitations/accept'

export function sanitizeInternalReturnTo(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const trimmedValue = value.trim()

  if (!trimmedValue || !trimmedValue.startsWith('/') || trimmedValue.startsWith('//')) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue, window.location.origin)

    if (parsedUrl.origin !== window.location.origin) {
      return null
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  } catch {
    return null
  }
}

export function getReturnToFromSearch(search: string) {
  const params = new URLSearchParams(search)
  return sanitizeInternalReturnTo(params.get('returnTo'))
}

export function buildAuthPathWithReturnTo(basePath: '/login' | '/signup', returnTo: string | null) {
  const safeReturnTo = sanitizeInternalReturnTo(returnTo)

  if (!safeReturnTo) {
    return basePath
  }

  const params = new URLSearchParams({
    returnTo: safeReturnTo,
  })

  return `${basePath}?${params.toString()}`
}

export function buildInvitationAcceptPath(token: string) {
  return `${INVITATION_ACCEPT_PATH}?token=${encodeURIComponent(token)}`
}

export function getPostAuthDestination(search: string) {
  return getReturnToFromSearch(search) ?? DEFAULT_POST_AUTH_PATH
}

export function isInvitationReturnToPath(path: string | null) {
  return path?.startsWith(`${INVITATION_ACCEPT_PATH}?token=`) ?? false
}
