import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

const useAuthMock = vi.fn()
const useOrganizationMock = vi.fn()

vi.mock('../features/auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../features/organizations/hooks/useOrganization', () => ({
  useOrganization: () => useOrganizationMock(),
}))

vi.mock('../features/organizations/components/OrganizationSwitcher', () => ({
  OrganizationSwitcher: () => <div>Organization switcher</div>,
}))

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      logout: vi.fn(),
      user: {
        email: 'tenant-org-admin-a@example.test',
        platformRole: null,
        role: 'supervisor',
      },
    })

    useOrganizationMock.mockReturnValue({
      activeMembershipRole: 'organization_admin',
      activeOrganization: {
        id: 'org-1',
        name: 'Organization A',
      },
    })
  })

  it('shows the invitation sidebar item for organization admins even when the legacy auth role is supervisor', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<div>Dashboard body</div>} path="/dashboard" />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Invitations' })).toHaveAttribute(
      'href',
      '/organization/invitations',
    )
  })

  it('hides the invitation sidebar item for supervisors', () => {
    useOrganizationMock.mockReturnValue({
      activeMembershipRole: 'supervisor',
      activeOrganization: {
        id: 'org-1',
        name: 'Organization A',
      },
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<div>Dashboard body</div>} path="/dashboard" />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Invitations' })).not.toBeInTheDocument()
  })
})
