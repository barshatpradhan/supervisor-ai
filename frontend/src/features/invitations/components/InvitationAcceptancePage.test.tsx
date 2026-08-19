import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { InvitationAcceptancePage } from './InvitationAcceptancePage'
import type { InvitationAcceptance, InvitationInspection } from '../types/invitation'

const navigateMock = vi.fn()
const acceptMock = vi.fn()
const reloadMock = vi.fn()
const clearOrganizationMock = vi.fn()
const refreshOrganizationsMock = vi.fn()
const selectOrganizationMock = vi.fn()
const registerInvitationMock = vi.fn()
const refreshAuthMock = vi.fn()
const logoutMock = vi.fn()
const notificationSuccessMock = vi.fn()
const notificationErrorMock = vi.fn()

const useInvitationFlowMock = vi.fn()
const useAuthMock = vi.fn()
const useOrganizationMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../hooks/useInvitationFlow', () => ({
  useInvitationFlow: (...args: unknown[]) => useInvitationFlowMock(...args),
}))

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../../organizations/hooks/useOrganization', () => ({
  useOrganization: () => useOrganizationMock(),
}))

vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    error: notificationErrorMock,
    success: notificationSuccessMock,
  }),
}))

const pendingInvitation: InvitationInspection = {
  account_exists: false,
  authentication_required: true,
  current_user_email_matches: null,
  expires_at: '2026-07-23T10:00:00.000Z',
  invited_email_masked: 'in****@example.com',
  invited_email: 'invitee@example.com',
  organization: {
    id: 'org-1',
    name: 'Acme Corporation',
    slug: 'acme-corporation',
  },
  role: 'employee',
  profile: {
    full_name: 'Invitee Example',
    job_title: 'Senior Frontend Engineer',
    department: 'Product Engineering',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
  },
  status: 'pending',
}

const acceptedResponse: InvitationAcceptance = {
  organization: {
    id: 'org-1',
    name: 'Acme Corporation',
    slug: 'acme-corporation',
    created_at: '2026-07-16T09:00:00.000Z',
    created_by_user_id: 'user-1',
    updated_at: '2026-07-16T09:00:00.000Z',
  },
  membership: {
    id: 'membership-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    role: 'employee',
    status: 'active',
    invited_at: '2026-07-16T10:00:00.000Z',
    invited_by_user_id: 'user-2',
    joined_at: '2026-07-16T11:00:00.000Z',
    created_at: '2026-07-16T10:00:00.000Z',
  },
  profileCreated: true,
}

function renderPage(entry = '/invitations/accept?token=secure-token') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <InvitationAcceptancePage />
    </MemoryRouter>,
  )
}

describe('InvitationAcceptancePage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    acceptMock.mockReset()
    reloadMock.mockReset()
    clearOrganizationMock.mockReset()
    refreshOrganizationsMock.mockReset()
    selectOrganizationMock.mockReset()
    registerInvitationMock.mockReset()
    refreshAuthMock.mockReset()
    logoutMock.mockReset()
    notificationSuccessMock.mockReset()
    notificationErrorMock.mockReset()

    useInvitationFlowMock.mockReturnValue({
      accept: acceptMock,
      error: null,
      invitation: pendingInvitation,
      isAccepting: false,
      isLoading: false,
      reload: reloadMock,
    })

    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      logout: logoutMock,
      refreshAuth: refreshAuthMock,
      registerInvitation: registerInvitationMock,
      user: null,
    })

    useOrganizationMock.mockReturnValue({
      clearOrganization: clearOrganizationMock,
      refreshOrganizations: refreshOrganizationsMock,
      selectOrganization: selectOrganizationMock,
    })
  })

  it('renders a valid new-user invitation with a read-only email and profile details', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Join Acme Corporation' })).toBeInTheDocument()
    expect(screen.getByText(/senior frontend engineer/i)).toBeInTheDocument()
    expect(screen.getByText(/product engineering/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('invitee@example.com')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: /create account & join organization/i })).toBeInTheDocument()
  })

  it('validates password confirmation before invitation registration', async () => {
    renderPage()
    const inputs = screen.getAllByLabelText(/password/i)
    await userEvent.type(inputs[0]!, 'password-one')
    await userEvent.type(inputs[1]!, 'password-two')
    await userEvent.click(screen.getByRole('button', { name: /create account & join organization/i }))
    expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument()
    expect(registerInvitationMock).not.toHaveBeenCalled()
  })

  it('registers a new invitee with only the invitation token and password, then selects the organization', async () => {
    registerInvitationMock.mockResolvedValue(undefined)
    refreshAuthMock.mockResolvedValue(undefined)
    refreshOrganizationsMock.mockResolvedValue([{ organization: pendingInvitation.organization, membership: { id: 'membership-1', role: 'employee', status: 'active' }, invitation: null }])
    renderPage()
    const inputs = screen.getAllByLabelText(/password/i)
    await userEvent.type(inputs[0]!, 'password-one')
    await userEvent.type(inputs[1]!, 'password-one')
    await userEvent.click(screen.getByRole('button', { name: /create account & join organization/i }))
    await waitFor(() => {
      expect(registerInvitationMock).toHaveBeenCalledWith('secure-token', 'password-one')
      expect(refreshAuthMock).toHaveBeenCalled()
      expect(selectOrganizationMock).toHaveBeenCalledWith('org-1')
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('re-inspects the invitation when registration discovers an existing account', async () => {
    registerInvitationMock.mockRejectedValue(new ApiError('An account already exists for this invitation email.', { statusCode: 409 }))
    reloadMock.mockResolvedValue(undefined)
    renderPage()
    const inputs = screen.getAllByLabelText(/password/i)
    await userEvent.type(inputs[0]!, 'password-one')
    await userEvent.type(inputs[1]!, 'password-one')
    await userEvent.click(screen.getByRole('button', { name: /create account & join organization/i }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalled())
  })

  it('shows sign-in only for an invitation whose email already has an account', () => {
    useInvitationFlowMock.mockReturnValue({ accept: acceptMock, error: null, invitation: { ...pendingInvitation, account_exists: true }, isAccepting: false, isLoading: false, reload: reloadMock })
    renderPage()
    expect(screen.getByRole('link', { name: /sign in to accept/i })).toHaveAttribute('href', `/login?returnTo=${encodeURIComponent('/invitations/accept?token=secure-token')}`)
    expect(screen.queryByRole('button', { name: /create account & join/i })).not.toBeInTheDocument()
  })

  it('renders expired, revoked, and already accepted states', () => {
    useInvitationFlowMock
      .mockReturnValueOnce({
        accept: acceptMock,
        error: null,
        invitation: { ...pendingInvitation, status: 'expired' },
        isAccepting: false,
        isLoading: false,
        reload: reloadMock,
      })
      .mockReturnValueOnce({
        accept: acceptMock,
        error: null,
        invitation: { ...pendingInvitation, status: 'revoked' },
        isAccepting: false,
        isLoading: false,
        reload: reloadMock,
      })
      .mockReturnValueOnce({
        accept: acceptMock,
        error: null,
        invitation: { ...pendingInvitation, status: 'accepted' },
        isAccepting: false,
        isLoading: false,
        reload: reloadMock,
      })

    const { rerender } = renderPage()
    expect(screen.getByText(/invitation expired/i)).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/invitations/accept?token=secure-token']}>
        <InvitationAcceptancePage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/invitation revoked/i)).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/invitations/accept?token=secure-token']}>
        <InvitationAcceptancePage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/invitation already accepted/i)).toBeInTheDocument()
  })

  it('shows the wrong-account state for a mismatched authenticated email', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      logout: logoutMock,
      refreshAuth: refreshAuthMock,
      registerInvitation: registerInvitationMock,
      user: { email: 'wrong@example.com' },
    })
    useInvitationFlowMock.mockReturnValue({
      accept: acceptMock,
      error: null,
      invitation: { ...pendingInvitation, current_user_email_matches: false },
      isAccepting: false,
      isLoading: false,
      reload: reloadMock,
    })

    renderPage()

    expect(screen.getByText(/this invitation belongs to a different email/i)).toBeInTheDocument()
    expect(screen.getByText(/wrong@example.com/i)).toBeInTheDocument()
  })

  it('prevents duplicate submit while invitation acceptance is in progress', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      logout: logoutMock,
      refreshAuth: refreshAuthMock,
      registerInvitation: registerInvitationMock,
      user: { email: 'invitee@example.com' },
    })
    useInvitationFlowMock.mockReturnValue({
      accept: acceptMock,
      error: null,
      invitation: { ...pendingInvitation, current_user_email_matches: true },
      isAccepting: true,
      isLoading: false,
      reload: reloadMock,
    })

    renderPage()

    expect(screen.getByRole('button', { name: /accepting/i })).toBeDisabled()
  })

  it('accepts the invitation, refreshes memberships, and redirects to the dashboard', async () => {
    acceptMock.mockResolvedValue(acceptedResponse)
    refreshOrganizationsMock.mockResolvedValue([
      {
        organization: {
          id: 'org-1',
          name: 'Acme Corporation',
          slug: 'acme-corporation',
        },
        membership: {
          id: 'membership-1',
          role: 'employee',
          status: 'active',
          invited_at: null,
          joined_at: '2026-07-16T11:00:00.000Z',
          created_at: '2026-07-16T10:00:00.000Z',
        },
        invitation: null,
      },
    ])
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      logout: logoutMock,
      refreshAuth: refreshAuthMock,
      registerInvitation: registerInvitationMock,
      user: { email: 'invitee@example.com' },
    })
    useInvitationFlowMock.mockReturnValue({
      accept: acceptMock,
      error: null,
      invitation: { ...pendingInvitation, current_user_email_matches: true },
      isAccepting: false,
      isLoading: false,
      reload: reloadMock,
    })

    const localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /accept invitation/i }))

    await waitFor(() => {
      expect(acceptMock).toHaveBeenCalledTimes(1)
      expect(clearOrganizationMock).toHaveBeenCalled()
      expect(refreshOrganizationsMock).toHaveBeenCalled()
      expect(selectOrganizationMock).toHaveBeenCalledWith('org-1')
      expect(notificationSuccessMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Invitation accepted' }),
      )
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    })

    expect(localStorageSetItemSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/token/i),
      expect.any(String),
    )
    localStorageSetItemSpy.mockRestore()
  })

  it('renders invalid and backend error states safely', () => {
    useInvitationFlowMock
      .mockReturnValueOnce({
        accept: acceptMock,
        error: new ApiError('Invitation not found.', { statusCode: 404 }),
        invitation: null,
        isAccepting: false,
        isLoading: false,
        reload: reloadMock,
      })
      .mockReturnValueOnce({
        accept: acceptMock,
        error: new ApiError('Temporary backend failure.', { statusCode: 500 }),
        invitation: null,
        isAccepting: false,
        isLoading: false,
        reload: reloadMock,
      })

    const { rerender } = renderPage()
    expect(screen.getByText(/invitation not found/i)).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/invitations/accept?token=secure-token']}>
        <InvitationAcceptancePage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/invitation details could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/temporary backend failure/i)).toBeInTheDocument()
  })
})
