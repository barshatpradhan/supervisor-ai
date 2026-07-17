import { describe, expect, it } from 'vitest'
import {
  buildAuthPathWithReturnTo,
  buildInvitationAcceptPath,
  getPostAuthDestination,
  getReturnToFromSearch,
  isInvitationReturnToPath,
  sanitizeInternalReturnTo,
} from './invitationNavigation'

describe('invitationNavigation', () => {
  it('rejects unsafe external return paths', () => {
    expect(sanitizeInternalReturnTo('https://evil.example/invitations/accept')).toBeNull()
    expect(getPostAuthDestination('?returnTo=https%3A%2F%2Fevil.example%2Fnext')).toBe('/dashboard')
  })

  it('preserves safe internal invitation paths', () => {
    const returnTo = buildInvitationAcceptPath('secure-token')

    expect(returnTo).toBe('/invitations/accept?token=secure-token')
    expect(isInvitationReturnToPath(returnTo)).toBe(true)
    expect(getReturnToFromSearch(`?returnTo=${encodeURIComponent(returnTo)}`)).toBe(returnTo)
    expect(getPostAuthDestination(`?returnTo=${encodeURIComponent(returnTo)}`)).toBe(returnTo)
    expect(buildAuthPathWithReturnTo('/login', returnTo)).toBe(
      `/login?returnTo=${encodeURIComponent(returnTo)}`,
    )
  })
})
