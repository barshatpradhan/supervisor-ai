import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrganizationRoute } from './OrganizationRoute'

const useAuthMock = vi.fn()
const useOrganizationMock = vi.fn()

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: () => useOrganizationMock(),
}))

vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

function renderInvitationRoute() {
  return render(
    <MemoryRouter initialEntries={['/organization/invitations']}>
      <Routes>
        <Route element={<OrganizationRoute allowedRoles={['organization_admin']} />}>
          <Route
            element={<div>Invitation page</div>}
            path="/organization/invitations"
          />
        </Route>
        <Route element={<div>Forbidden</div>} path="/forbidden" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrganizationRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      onboarding: {
        hasActiveOrganization: true,
        hasPendingInvitations: false,
        requiresOrganizationCreation: false,
      },
    })

    useOrganizationMock.mockReturnValue({
      activeMembership: {
        id: 'membership-1',
        role: 'organization_admin',
        status: 'active',
        invited_at: null,
        joined_at: '2026-07-16T11:00:00.000Z',
        created_at: '2026-07-16T10:00:00.000Z',
      },
      activeMembershipRole: 'organization_admin',
      activeOrganization: {
        id: 'org-1',
        name: 'Organization A',
        slug: 'organization-a',
      },
      clearOrganization: vi.fn(),
      error: null,
      isLoading: false,
      organizations: [
        {
          membership: {
            id: 'membership-1',
            role: 'organization_admin',
            status: 'active',
            invited_at: null,
            joined_at: '2026-07-16T11:00:00.000Z',
            created_at: '2026-07-16T10:00:00.000Z',
          },
          organization: {
            id: 'org-1',
            name: 'Organization A',
            slug: 'organization-a',
          },
          invitation: null,
        },
      ],
      refreshOrganizations: vi.fn(),
      selectOrganization: vi.fn(),
    })
  })

  it('allows organization admins to access the invitation page using active membership role instead of the legacy auth role', () => {
    useAuthMock.mockReturnValue({
      onboarding: {
        hasActiveOrganization: true,
        hasPendingInvitations: false,
        requiresOrganizationCreation: false,
      },
      user: {
        email: 'tenant-org-admin-a@example.test',
        legacyRole: 'supervisor',
        platformRole: null,
        role: 'supervisor',
      },
    })

    renderInvitationRoute()

    expect(screen.getByText('Invitation page')).toBeInTheDocument()
  })

  it('denies supervisors from accessing the invitation page', () => {
    useOrganizationMock.mockReturnValue({
      ...useOrganizationMock(),
      activeMembershipRole: 'supervisor',
      activeMembership: {
        id: 'membership-1',
        role: 'supervisor',
        status: 'active',
        invited_at: null,
        joined_at: '2026-07-16T11:00:00.000Z',
        created_at: '2026-07-16T10:00:00.000Z',
      },
      organizations: [
        {
          membership: {
            id: 'membership-1',
            role: 'supervisor',
            status: 'active',
            invited_at: null,
            joined_at: '2026-07-16T11:00:00.000Z',
            created_at: '2026-07-16T10:00:00.000Z',
          },
          organization: {
            id: 'org-1',
            name: 'Organization A',
            slug: 'organization-a',
          },
          invitation: null,
        },
      ],
    })

    renderInvitationRoute()

    expect(screen.getByText('Forbidden')).toBeInTheDocument()
  })

  it('denies employees from accessing the invitation page', () => {
    useOrganizationMock.mockReturnValue({
      ...useOrganizationMock(),
      activeMembershipRole: 'employee',
      activeMembership: {
        id: 'membership-1',
        role: 'employee',
        status: 'active',
        invited_at: null,
        joined_at: '2026-07-16T11:00:00.000Z',
        created_at: '2026-07-16T10:00:00.000Z',
      },
      organizations: [
        {
          membership: {
            id: 'membership-1',
            role: 'employee',
            status: 'active',
            invited_at: null,
            joined_at: '2026-07-16T11:00:00.000Z',
            created_at: '2026-07-16T10:00:00.000Z',
          },
          organization: {
            id: 'org-1',
            name: 'Organization A',
            slug: 'organization-a',
          },
          invitation: null,
        },
      ],
    })

    renderInvitationRoute()

    expect(screen.getByText('Forbidden')).toBeInTheDocument()
  })

  it('does not redirect while organizations are loading', () => {
    useOrganizationMock.mockReturnValue({
      activeMembership: null,
      activeMembershipRole: null,
      activeOrganization: null,
      clearOrganization: vi.fn(),
      error: null,
      isLoading: true,
      organizations: [],
      refreshOrganizations: vi.fn(),
      selectOrganization: vi.fn(),
    })

    renderInvitationRoute()

    expect(screen.getByText(/loading your organizations/i)).toBeInTheDocument()
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument()
  })

  it('denies a platform admin without tenant membership from viewing tenant invitation content', () => {
    useAuthMock.mockReturnValue({
      onboarding: {
        hasActiveOrganization: false,
        hasPendingInvitations: false,
        requiresOrganizationCreation: false,
      },
      user: {
        email: 'platform-admin@example.test',
        legacyRole: 'admin',
        platformRole: 'platform_admin',
        role: 'admin',
      },
    })
    useOrganizationMock.mockReturnValue({
      activeMembership: null,
      activeMembershipRole: null,
      activeOrganization: null,
      clearOrganization: vi.fn(),
      error: null,
      isLoading: false,
      organizations: [],
      refreshOrganizations: vi.fn(),
      selectOrganization: vi.fn(),
    })

    renderInvitationRoute()

    expect(screen.queryByText('Invitation page')).not.toBeInTheDocument()
    expect(screen.getByText(/no active organization access/i)).toBeInTheDocument()
  })
})
