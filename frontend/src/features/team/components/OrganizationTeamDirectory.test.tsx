import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrganizationTeamDirectory } from './OrganizationTeamDirectory'

const useOrganizationMock = vi.fn()
const useOrganizationTeamMock = vi.fn()

vi.mock('../../organizations/hooks/useOrganization', () => ({
  useOrganization: () => useOrganizationMock(),
}))

vi.mock('../hooks/useOrganizationTeam', () => ({
  useOrganizationTeam: () => useOrganizationTeamMock(),
}))

const activeEmployee = {
  membership_id: 'employee-membership', user_id: 'employee-user', email: 'employee@example.com',
  role: 'employee' as const, status: 'active' as const, invited_at: null, joined_at: '2026-01-01',
  employee_profile_id: 'employee-profile', employee_full_name: 'Avery Chen',
  supervisor_profile_id: null, supervisor_full_name: null,
}

const activeSupervisor = {
  membership_id: 'supervisor-membership', user_id: 'supervisor-user', email: 'supervisor@example.com',
  role: 'supervisor' as const, status: 'active' as const, invited_at: null, joined_at: '2026-01-01',
  employee_profile_id: null, employee_full_name: null,
  supervisor_profile_id: 'supervisor-profile', supervisor_full_name: 'Morgan Diaz',
}

describe('OrganizationTeamDirectory', () => {
  beforeEach(() => {
    useOrganizationMock.mockReturnValue({ activeOrganization: { id: 'org-a', name: 'Organization A' } })
    useOrganizationTeamMock.mockReturnValue({ data: [activeEmployee, activeSupervisor], error: null, isFetching: false, isLoading: false, refetch: vi.fn() })
  })

  it('shows active employees and supervisors without applying employee metrics to supervisors', () => {
    render(<OrganizationTeamDirectory />)

    expect(screen.getByText('Avery Chen')).toBeInTheDocument()
    expect(screen.getByText('Morgan Diaz')).toBeInTheDocument()
    expect(screen.getAllByText('Employee profile')).toHaveLength(1)
    expect(screen.getAllByText('Supervisor profile')).toHaveLength(1)
    expect(screen.queryByText(/workload|availability|weekly capacity/i)).not.toBeInTheDocument()
  })

  it('filters the mixed team by membership role', async () => {
    const user = userEvent.setup()
    render(<OrganizationTeamDirectory />)

    await user.click(screen.getByRole('tab', { name: 'Supervisors' }))

    expect(screen.getByText('Morgan Diaz')).toBeInTheDocument()
    expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument()
  })

  it('keeps invited members out of the active team list', () => {
    useOrganizationTeamMock.mockReturnValue({ data: [{ ...activeEmployee, status: 'invited' }], error: null, isFetching: false, isLoading: false, refetch: vi.fn() })
    render(<OrganizationTeamDirectory />)

    expect(screen.getByRole('heading', { name: 'No team members yet' })).toBeInTheDocument()
  })

  it('renders a failure state instead of an empty team', () => {
    useOrganizationTeamMock.mockReturnValue({ data: null, error: new Error('Request failed'), isFetching: false, isLoading: false, refetch: vi.fn() })
    render(<OrganizationTeamDirectory />)

    expect(screen.getByRole('heading', { name: /unable to load organization team/i })).toBeInTheDocument()
  })
})
