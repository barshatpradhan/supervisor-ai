import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrganizationInvitationsPage } from './OrganizationInvitationsPage'

const successMock = vi.fn()
const errorMock = vi.fn()
const createOrganizationInvitationMock = vi.fn()
const useOrganizationMock = vi.fn()
const pendingListMock = vi.fn()

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    error: errorMock,
    success: successMock,
  }),
}))

vi.mock('../features/organizations/hooks/useOrganization', () => ({
  useOrganization: () => useOrganizationMock(),
}))

vi.mock('../features/invitations/services/invitationService', () => ({
  createOrganizationInvitation: (...args: unknown[]) =>
    createOrganizationInvitationMock(...args),
}))

vi.mock('../features/invitations/components/PendingInvitationsList', () => ({
  PendingInvitationsList: (props: { refreshKey?: number; showHeader?: boolean }) => {
    pendingListMock(props)
    return (
      <div data-testid="pending-invitations-list">
        refresh:{props.refreshKey ?? 0}|header:{String(props.showHeader)}
      </div>
    )
  },
}))

describe('OrganizationInvitationsPage', () => {
  beforeEach(() => {
    successMock.mockReset()
    errorMock.mockReset()
    createOrganizationInvitationMock.mockReset()
    pendingListMock.mockReset()
    useOrganizationMock.mockReturnValue({
      activeMembershipRole: 'organization_admin',
      activeOrganization: { id: 'org-1', name: 'Organization A' },
    })
  })

  it('organization_admin sees Invite member', () => {
    render(<OrganizationInvitationsPage />)
    expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument()
  })

  it('supervisor does not see Invite member', () => {
    useOrganizationMock.mockReturnValue({
      activeMembershipRole: 'supervisor',
      activeOrganization: { id: 'org-1', name: 'Organization A' },
    })

    render(<OrganizationInvitationsPage />)
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument()
  })

  it('employee does not see Invite member', () => {
    useOrganizationMock.mockReturnValue({
      activeMembershipRole: 'employee',
      activeOrganization: { id: 'org-1', name: 'Organization A' },
    })

    render(<OrganizationInvitationsPage />)
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument()
  })

  it('successful creation refreshes the pending invitation list', async () => {
    createOrganizationInvitationMock.mockResolvedValue({
      invitation: { id: 'invite-1' },
      membership: { id: 'membership-1' },
    })

    render(<OrganizationInvitationsPage />)

    expect(screen.getByTestId('pending-invitations-list')).toHaveTextContent('refresh:0')

    await userEvent.click(screen.getByRole('button', { name: /invite member/i }))
    await userEvent.type(screen.getByLabelText(/^email$/i), 'invitee@example.com')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jordan Lee')
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(screen.getByTestId('pending-invitations-list')).toHaveTextContent('refresh:1')
    })

  })
})
