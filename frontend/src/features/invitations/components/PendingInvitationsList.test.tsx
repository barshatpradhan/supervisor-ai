import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PendingInvitationsList } from './PendingInvitationsList'

const successMock = vi.fn()
const errorMock = vi.fn()
const warningMock = vi.fn()
const issueInvitationLinkMock = vi.fn()
const resendMock = vi.fn()
const revokeMock = vi.fn()
const refreshMock = vi.fn()

const useOrganizationMock = vi.fn()
const usePendingInvitationsMock = vi.fn()

vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    error: errorMock,
    success: successMock,
    warning: warningMock,
  }),
}))

vi.mock('../services/invitationService', () => ({
  issueInvitationLink: (...args: unknown[]) => issueInvitationLinkMock(...args),
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
    warningMock.mockReset()
    issueInvitationLinkMock.mockReset()
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
          delivery_status: 'sent',
          delivery_error: null,
          derivedStatus: 'pending',
        },
      ],
      isLoading: false,
      mutatingInvitationId: null,
      refresh: refreshMock,
      resend: resendMock,
      revoke: revokeMock,
    })

  })

  it('shows resend and revoke controls only for organization admins', () => {
    const { rerender } = render(<PendingInvitationsList />)

    expect(screen.getByText(/pending invitations/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^revoke$/i })).toBeInTheDocument()

    useOrganizationMock.mockReturnValue({
      activeOrganization: { id: 'org-1', name: 'Acme Corporation' },
      activeMembershipRole: 'supervisor',
    })

    rerender(<PendingInvitationsList />)

    expect(screen.queryByText(/pending invitations/i)).not.toBeInTheDocument()
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

    await userEvent.click(screen.getByRole('button', { name: /^revoke$/i }))
    await userEvent.click(screen.getByRole('button', { name: /revoke invitation/i }))

    expect(revokeMock).toHaveBeenCalledWith('invite-1')

    await waitFor(() => {
      expect(successMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Invitation revoked' }),
      )
    })
  })

  it('marks failed emails on the page and logs the reason only to the console', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const state = usePendingInvitationsMock()
    usePendingInvitationsMock.mockReturnValue({
      ...state,
      invitations: [{ ...state.invitations[0], delivery_status: 'failed', delivery_error: 'Brevo responded 401: unauthorized' }],
    })

    render(<PendingInvitationsList />)

    expect(screen.getByText('Email failed')).toBeInTheDocument()
    expect(screen.queryByText(/brevo responded/i)).not.toBeInTheDocument()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Brevo responded 401'))
    warn.mockRestore()
  })

  it('warns when a resend fails to deliver instead of claiming success', async () => {
    resendMock.mockResolvedValue({ deliveryStatus: 'failed' })

    render(<PendingInvitationsList />)
    await userEvent.click(screen.getByRole('button', { name: /resend/i }))

    expect(resendMock).toHaveBeenCalledWith('invite-1')
    expect(warningMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Resend failed to deliver' }))
    expect(successMock).not.toHaveBeenCalled()
  })

  it('lets organization admins copy a freshly issued invite link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    issueInvitationLinkMock.mockResolvedValue({
      acceptanceUrl: 'http://localhost:5173/invitations/accept?token=fresh',
      expiresAt: '2026-07-23T10:00:00.000Z',
    })

    render(<PendingInvitationsList />)
    await userEvent.click(screen.getByRole('button', { name: /copy invite link/i }))

    await waitFor(() => {
      expect(issueInvitationLinkMock).toHaveBeenCalledWith('org-1', 'invite-1')
      expect(writeText).toHaveBeenCalledWith('http://localhost:5173/invitations/accept?token=fresh')
      expect(successMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invite link copied' }))
    })
  })

  it('never offers the invite link to non-admins', () => {
    useOrganizationMock.mockReturnValue({
      activeOrganization: { id: 'org-1', name: 'Acme Corporation' },
      activeMembershipRole: 'supervisor',
    })

    render(<PendingInvitationsList />)

    expect(screen.queryByRole('button', { name: /copy invite link/i })).not.toBeInTheDocument()
    expect(issueInvitationLinkMock).not.toHaveBeenCalled()
  })
})
