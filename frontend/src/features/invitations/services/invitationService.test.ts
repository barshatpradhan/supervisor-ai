import { describe, expect, it, vi } from 'vitest'
import { registerInvitation } from '../../auth/services/authService'

const postJsonMock = vi.fn()

vi.mock('../../../lib/api', () => ({
  getJson: vi.fn(),
  postJson: (...args: unknown[]) => postJsonMock(...args),
}))

describe('registerInvitation', () => {
  it('sends only the supported password body to the token registration endpoint', async () => {
    postJsonMock.mockResolvedValue(undefined)

    await registerInvitation('opaque-token', 'safe-password')

    expect(postJsonMock).toHaveBeenCalledWith(
      '/invitations/opaque-token/register',
      { password: 'safe-password' },
      { skipOrganizationContext: true },
    )
    expect(postJsonMock.mock.calls[0]?.[1]).not.toHaveProperty('email')
    expect(postJsonMock.mock.calls[0]?.[1]).not.toHaveProperty('role')
    expect(postJsonMock.mock.calls[0]?.[1]).not.toHaveProperty('organizationId')
  })
})
