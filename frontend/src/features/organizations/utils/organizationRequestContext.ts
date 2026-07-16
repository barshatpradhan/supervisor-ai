let activeOrganizationId: string | null = null

function stripQueryAndHash(url: string) {
  return url.split('?')[0]?.split('#')[0] ?? url
}

function normalizeRequestPath(url: string | undefined) {
  if (!url) {
    return ''
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    const parsedUrl = new URL(url)
    return stripQueryAndHash(parsedUrl.pathname.replace(/^\/api\/v1/, ''))
  }

  return stripQueryAndHash(url.replace(/^\/api\/v1/, ''))
}

export function getActiveOrganizationId() {
  return activeOrganizationId
}

export function setActiveOrganizationId(nextOrganizationId: string | null) {
  activeOrganizationId = nextOrganizationId
}

export function shouldSkipOrganizationHeader(
  url: string | undefined,
  skipOrganizationContext = false,
) {
  if (skipOrganizationContext) {
    return true
  }

  const path = normalizeRequestPath(url)

  if (!path) {
    return false
  }

  if (path.startsWith('/auth/')) {
    return true
  }

  if (path.startsWith('/public/')) {
    return true
  }

  return path === '/organizations' || path === '/organizations/invitations/accept'
}
