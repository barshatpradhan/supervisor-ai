import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformAdminDashboard } from './PlatformAdminDashboard'
import { getDashboardMetrics } from '../services/adminDashboardService'
import { listPendingSkills } from '../services/adminSkillService'
import { listUserDirectory } from '../services/adminUserDirectoryService'
import { listEmployeeUsers } from '../../../services/employees/employeeService'
import type { BackendUserDirectoryEntry, BackendUserDirectoryPage } from '../../../types/backend'

vi.mock('../../../services/employees/employeeService', () => ({
  listEmployeeUsers: vi.fn(),
}))

vi.mock('../services/adminDashboardService', () => ({
  getDashboardMetrics: vi.fn(),
}))

vi.mock('../services/adminSkillService', () => ({
  listPendingSkills: vi.fn(),
  approveSkill: vi.fn(),
  rejectSkill: vi.fn(),
}))

vi.mock('../services/adminUserDirectoryService', () => ({
  listUserDirectory: vi.fn(),
}))

const listUsersMock = vi.mocked(listEmployeeUsers)
const getDashboardMetricsMock = vi.mocked(getDashboardMetrics)
const listPendingSkillsMock = vi.mocked(listPendingSkills)
const listUserDirectoryMock = vi.mocked(listUserDirectory)

const ACME = { id: 'org-1', name: 'Acme' }
const PLATFORM_TEAM = { id: 'team-1', name: 'Platform' }

function entry(overrides: Partial<BackendUserDirectoryEntry> & { key: string }): BackendUserDirectoryEntry {
  return {
    user_id: overrides.key,
    email: `${overrides.key}@example.com`,
    full_name: null,
    avatarVariant: null,
    job_title: null,
    platform_role: null,
    created_at: '2026-01-01',
    organization: ACME,
    organization_role: 'employee',
    membership_status: 'active',
    teams: [],
    ...overrides,
  }
}

function directoryPage(items: BackendUserDirectoryEntry[], overrides: Partial<BackendUserDirectoryPage> = {}): BackendUserDirectoryPage {
  return {
    items,
    page: 1,
    page_size: 10,
    total: items.length,
    total_pages: 1,
    filters: { organizations: [{ ...ACME, teams: [PLATFORM_TEAM] }] },
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PlatformAdminDashboard />
    </MemoryRouter>,
  )
}

describe('PlatformAdminDashboard', () => {
  beforeEach(() => {
    listUsersMock.mockReset()
    getDashboardMetricsMock.mockReset()
    listPendingSkillsMock.mockReset()
    listUserDirectoryMock.mockReset()
    getDashboardMetricsMock.mockResolvedValue({ organizationCount: 4, userCount: 3, pendingSkillsCount: 2 })
    listPendingSkillsMock.mockResolvedValue([])
    listUsersMock.mockResolvedValue([
      { id: '1', auth_user_id: 'auth-1', email: 'employee@example.com', role: 'employee', created_at: '2026-01-01' },
      { id: '2', auth_user_id: 'auth-2', email: 'supervisor@example.com', role: 'supervisor', created_at: '2026-01-01' },
    ])
    listUserDirectoryMock.mockResolvedValue(directoryPage([]))
  })

  it('renders platform totals and the create user link', async () => {
    renderPage()

    expect(await screen.findByText('Organizations')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('1 employees · 1 supervisors · 0 admins')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create user/i })).toHaveAttribute('href', '/admin/users/new')
  })

  it('shows an error for totals without substituting data', async () => {
    getDashboardMetricsMock.mockRejectedValue(new Error('Access denied'))

    renderPage()

    expect(await screen.findByText('Platform totals could not be loaded')).toBeInTheDocument()
    expect(screen.queryByText('Organizations')).not.toBeInTheDocument()
  })

  it('shows a message when there are no pending skills', async () => {
    renderPage()

    expect(await screen.findByText('No skills are awaiting approval.')).toBeInTheDocument()
  })

  it('groups users by organization and then team', async () => {
    listUserDirectoryMock.mockResolvedValue(
      directoryPage([
        entry({ key: 'ada', full_name: 'Ada Lovelace', teams: [PLATFORM_TEAM] }),
        entry({ key: 'bob', full_name: 'Bob Stone', teams: [PLATFORM_TEAM] }),
        entry({ key: 'cy', full_name: 'Cy Young' }),
        entry({ key: 'solo', organization: null, organization_role: null, membership_status: null }),
      ]),
    )

    renderPage()

    const table = await screen.findByRole('table')
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual(['Person', 'Role', 'Teams', 'Status', 'Acme', 'Platform', 'No team', 'No organization'])
    expect(screen.getByText('Showing 1–4 of 4 users')).toBeInTheDocument()
  })

  it('pages ten at a time and sends filters to the server', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => entry({ key: `user-${index}` }))
    listUserDirectoryMock.mockResolvedValue(directoryPage(firstPage, { total: 12, total_pages: 2 }))

    renderPage()

    expect(await screen.findByText('Showing 1–10 of 12 users')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(listUserDirectoryMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

    fireEvent.change(screen.getByLabelText('Team'), { target: { value: PLATFORM_TEAM.id } })
    await waitFor(() =>
      expect(listUserDirectoryMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, teamId: PLATFORM_TEAM.id })),
    )
  })
})
