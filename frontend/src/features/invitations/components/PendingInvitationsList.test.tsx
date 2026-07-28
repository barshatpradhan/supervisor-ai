import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PendingInvitationsList } from './PendingInvitationsList'

const successMock = vi.fn()
const errorMock = vi.fn()
const resendMock = vi.fn()
const revokeMock = vi.fn()
const refreshMock = vi.fn()

const useOrganizationMock = vi.fn()
const usePendingInvitationsMock = vi.fn()

vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    error: errorMock,
    success: successMock,
  }),
}))

vi.mock('../../organizations/hooks/useOrganization', () => ({
  useOrganization: () => useOrganizationMock(),
}))

vi.mock('../hooks/usePendingInvitations', () => ({
  usePendingInvitations: (...args: unknown[]) => usePendingInvitationsMock(...args),
}))

describe('PendingInvitationsList', () => {
  beforeEach(() => {
    successMock.mockReset()
    errorMock.mockReset()
    resendMock.mockReset()
    revokeMock.mockReset()
    refreshMock.mockReset()

    useOrganizationMock.mockReturnValue({
      activeOrganization: { id: 'org-1', name: 'Acme Corporation' },
      activeMembershipRole: 'organization_admin',
    })

    usePendingInvitationsMock.mockReturnValue({
      error: null,
      invitations: [
        {
          invitation_id: 'invite-1',
          membership_id: 'membership-1',
          email: 'invitee@example.com',
          role: 'employee',
          invited_at: '2026-07-16T10:00:00.000Z',
          last_sent_at: '2026-07-16T10:00:00.000Z',
          send_count: 1,
          expires_at: '2026-07-23T10:00:00.000Z',
          accepted_by_user_id: null,
          accepted_at: null,
          revoked_by_user_id: null,
          revoked_at: null,
          membership_status: 'invited',
          derivedStatus: 'pending',
        },
      ],
      isLoading: false,
      mutatingInvitationId: null,
      refresh: refreshMock,
      resend: resendMock,
      revoke: revokeMock,
    })

    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('shows resend and revoke controls only for organization admins', () => {
    const { rerender } = render(<PendingInvitationsList />)

    expect(screen.getByText(/organization invite management/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()

    useOrganizationMock.mockReturnValue({
      activeOrganization: { id: 'org-1', name: 'Acme Corporation' },
      activeMembershipRole: 'supervisor',
    })

    rerender(<PendingInvitationsList />)

    expect(screen.queryByText(/organization invite management/i)).not.toBeInTheDocument()
  })

  it('resends and revokes invitations through org-admin actions', async () => {
    resendMock.mockResolvedValue(undefined)
    revokeMock.mockResolvedValue(undefined)

    render(<PendingInvitationsList />)

    await userEvent.click(screen.getByRole('button', { name: /resend/i }))

    expect(resendMock).toHaveBeenCalledWith('invite-1')
    expect(successMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Invitation resent' }),
    )

    await userEvent.click(screen.getByRole('button', { name: /revoke/i }))

    expect(window.confirm).toHaveBeenCalled()
    expect(revokeMock).toHaveBeenCalledWith('invite-1')

    await waitFor(() => {
      expect(successMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Invitation revoked' }),
      )
    })
  })
})
