import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformAdminDashboard } from './PlatformAdminDashboard'
import { listEmployeeUsers } from '../../../services/employees/employeeService'

vi.mock('../../../services/employees/employeeService', () => ({
  listEmployeeUsers: vi.fn(),
}))

const listUsersMock = vi.mocked(listEmployeeUsers)

describe('PlatformAdminDashboard', () => {
  beforeEach(() => {
    listUsersMock.mockReset()
  })

  it('renders account totals from the platform users endpoint', async () => {
    listUsersMock.mockResolvedValue([
      { id: '1', auth_user_id: 'auth-1', email: 'employee@example.com', role: 'employee', created_at: '2026-01-01' },
      { id: '2', auth_user_id: 'auth-2', email: 'supervisor@example.com', role: 'supervisor', created_at: '2026-01-01' },
      { id: '3', auth_user_id: 'auth-3', email: 'admin@example.com', role: 'admin', created_at: '2026-01-01' },
    ])

    render(
      <MemoryRouter>
        <PlatformAdminDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Managed users')).toBeInTheDocument()
    expect(screen.getByText('employee@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create user/i })).toHaveAttribute('href', '/admin/users/new')
  })

  it('renders an API failure without substituting dashboard data', async () => {
    listUsersMock.mockRejectedValue(new Error('Access denied'))

    render(
      <MemoryRouter>
        <PlatformAdminDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /unable to load platform administration/i })).toBeInTheDocument()
  })
})
