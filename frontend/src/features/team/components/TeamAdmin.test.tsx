import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackendOrganizationMemberSummary, BackendOrganizationTeamSummary } from '../../../types/backend'
import { MemberRolesCard } from './MemberRolesCard'
import { TeamsAdminCard } from './TeamsAdminCard'

const { notify, refreshOrganizations, service } = vi.hoisted(() => ({
  notify: { error: vi.fn(), success: vi.fn() },
  refreshOrganizations: vi.fn().mockResolvedValue([]),
  service: {
    addTeamMember: vi.fn(),
    changeMemberRole: vi.fn(),
    createTeam: vi.fn(),
    deleteTeam: vi.fn(),
    moveTeamMember: vi.fn(),
    previewRoleChange: vi.fn(),
    removeTeamMember: vi.fn(),
    updateTeam: vi.fn(),
    listUnassignableOpenTasks: vi.fn(),
  },
}))
vi.mock('../services/teamAdminService', () => service)

let members: BackendOrganizationMemberSummary[] = []
let teams: BackendOrganizationTeamSummary[] = []
vi.mock('../hooks/useOrganizationTeam', () => ({
  useOrganizationTeam: () => ({ data: members, error: null, isLoading: false, refetch: vi.fn() }),
}))
vi.mock('../hooks/useOrganizationTeams', () => ({
  useOrganizationTeams: () => ({ data: teams, error: null, isLoading: false, refetch: vi.fn() }),
}))
vi.mock('../../organizations/hooks/useOrganization', () => ({
  useOrganization: () => ({ activeMembership: { id: 'm-sam' }, refreshOrganizations }),
}))
vi.mock('../../../hooks/useNotifications', () => ({ useNotifications: () => notify }))

function member(id: string, name: string, role: BackendOrganizationMemberSummary['role'], extra: Partial<BackendOrganizationMemberSummary> = {}): BackendOrganizationMemberSummary {
  return {
    membership_id: `m-${id}`,
    user_id: `u-${id}`,
    email: `${id}@example.test`,
    role,
    status: 'active',
    invited_at: null,
    joined_at: null,
    employee_profile_id: role === 'employee' ? `e-${id}` : null,
    employee_full_name: role === 'employee' ? name : null,
    supervisor_profile_id: role === 'supervisor' ? `s-${id}` : null,
    supervisor_full_name: role === 'supervisor' ? name : null,
    avatarVariant: null,
    ...extra,
  }
}

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>)
}

beforeEach(() => {
  for (const fn of Object.values(service)) fn.mockReset()
  notify.error.mockReset()
  notify.success.mockReset()
  members = [
    member('sam', 'Sam Carter', 'organization_admin', { email: 'sam@example.test' }),
    member('sup', 'Sue Lead', 'supervisor'),
    member('aisha', 'Aisha Bello', 'employee'),
    member('ben', 'Ben Okafor', 'employee'),
    member('ivy', 'Ivy Invited', 'employee', { status: 'invited', employee_full_name: null }),
  ]
  teams = [
    {
      id: 't-platform',
      name: 'Platform',
      description: null,
      lead: { supervisor_id: 's-sup', full_name: 'Sue Lead', avatarVariant: null },
      members: [
        { employee_id: 'e-aisha', full_name: 'Aisha Bello', job_title: null, avatarVariant: null, assignable: true },
        { employee_id: 'e-old', full_name: 'Olu Former', job_title: null, avatarVariant: null, assignable: false },
      ],
    },
    { id: 't-mobile', name: 'Mobile', description: null, lead: null, members: [] },
  ]
})

describe('MemberRolesCard', () => {
  it('locks the last admin and invited members, with the reason next to the control', () => {
    wrap(<MemberRolesCard organizationId="org-1" />)
    const sam = screen.getByLabelText('Role for sam@example.test')
    expect(sam).toBeDisabled()
    expect(sam).toHaveAccessibleDescription('Only admin: make someone else an admin first.')
    const ivy = screen.getByLabelText('Role for ivy@example.test')
    expect(ivy).toBeDisabled()
    expect(ivy).toHaveAccessibleDescription('Invited: they get a role when they accept.')
    expect(screen.getByLabelText('Role for Aisha Bello')).toBeEnabled()
    expect(screen.getByText('(you)')).toBeInTheDocument()
  })

  it('lets an admin be changed when another active admin exists', () => {
    members.push(member('rita', 'Rita Admin', 'organization_admin'))
    wrap(<MemberRolesCard organizationId="org-1" />)
    expect(screen.getByLabelText('Role for sam@example.test')).toBeEnabled()
  })

  it('opens the confirmation dialog, saves, and reports success', async () => {
    service.previewRoleChange.mockResolvedValue({
      membershipId: 'm-aisha', fromRole: 'employee', toRole: 'supervisor', unchanged: false, blockedReason: null,
      openTasks: 0, completedTasks: 0, teamsLed: [], teamsMemberOf: [], needsProfile: 'supervisor', suggestedName: 'Aisha Bello',
    })
    service.changeMemberRole.mockResolvedValue({})
    wrap(<MemberRolesCard organizationId="org-1" />)
    await userEvent.selectOptions(screen.getByLabelText('Role for Aisha Bello'), 'supervisor')
    const dialog = await screen.findByRole('dialog', { name: "Change Aisha Bello's role?" })
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Make supervisor' }))
    expect(service.changeMemberRole).toHaveBeenCalledWith('org-1', 'm-aisha', 'supervisor', 'Aisha Bello')
    expect(notify.success).toHaveBeenCalledWith({ title: 'Aisha Bello is now supervisor.' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(refreshOrganizations).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows the server error when the change is refused', async () => {
    service.previewRoleChange.mockResolvedValue({
      membershipId: 'm-ben', fromRole: 'employee', toRole: 'organization_admin', unchanged: false, blockedReason: null,
      openTasks: 0, completedTasks: 0, teamsLed: [], teamsMemberOf: [], needsProfile: null, suggestedName: 'Ben Okafor',
    })
    service.changeMemberRole.mockRejectedValue(new Error('This member has 1 open task(s). Reassign them first.'))
    wrap(<MemberRolesCard organizationId="org-1" />)
    await userEvent.selectOptions(screen.getByLabelText('Role for Ben Okafor'), 'organization_admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Make organization admin' }))
    expect(notify.error).toHaveBeenCalledWith({ title: 'That change was not saved', message: 'This member has 1 open task(s). Reassign them first.' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('avatars (Phase 2)', () => {
  const AVATAR = 'p03-s4-c2-a1'
  const hasFace = (name: string) => screen.getAllByRole('img', { name }).every((image) => image.querySelector('.av-face') !== null)

  it('shows the illustrated avatar on the member list, and initials without one', () => {
    members[2] = { ...members[2], avatarVariant: AVATAR }
    wrap(<MemberRolesCard organizationId="org-1" />)
    expect(hasFace('Aisha Bello')).toBe(true)
    const ben = screen.getByRole('img', { name: 'Ben Okafor' })
    expect(ben.querySelector('.av-face')).toBeNull()
    expect(ben).toHaveTextContent('BO')
  })

  it('shows avatars for the lead and members on the team list, assignable or not', () => {
    teams[0] = {
      ...teams[0],
      lead: { ...teams[0].lead!, avatarVariant: AVATAR },
      members: teams[0].members.map((entry) => ({ ...entry, avatarVariant: AVATAR })),
    }
    wrap(<TeamsAdminCard organizationId="org-1" />)
    expect(hasFace('Sue Lead')).toBe(true)
    expect(hasFace('Aisha Bello')).toBe(true)
    expect(hasFace('Olu Former')).toBe(true)
  })
})

describe('TeamsAdminCard', () => {
  it('disables delete with the reason while a team has members', () => {
    wrap(<TeamsAdminCard organizationId="org-1" />)
    const deletePlatform = screen.getByRole('button', { name: 'Delete Platform' })
    expect(deletePlatform).toBeDisabled()
    expect(deletePlatform).toHaveAccessibleDescription('Move or remove its 2 members first.')
    expect(screen.getByRole('button', { name: 'Delete Mobile' })).toBeEnabled()
  })

  it('moves a member to another team in one step from the keyboard-friendly dialog', async () => {
    service.moveTeamMember.mockResolvedValue({})
    const onPeopleChanged = vi.fn()
    wrap(<TeamsAdminCard onPeopleChanged={onPeopleChanged} organizationId="org-1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Aisha Bello to another team' }))
    const dialog = await screen.findByRole('dialog', { name: 'Move Aisha Bello' })
    expect(within(dialog).getByLabelText('Move to')).toHaveValue('t-mobile')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move' }))
    expect(service.moveTeamMember).toHaveBeenCalledWith('org-1', 't-platform', 'e-aisha', 't-mobile')
    expect(onPeopleChanged).toHaveBeenCalled()
    expect(notify.success).toHaveBeenCalledWith({ title: 'Aisha Bello moved.' })
  })

  it('marks people who are no longer assignable: they can be removed but not moved', async () => {
    service.removeTeamMember.mockResolvedValue({})
    wrap(<TeamsAdminCard organizationId="org-1" />)
    expect(screen.getByText('Not assignable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move Olu Former to another team' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Olu Former from Platform' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(service.removeTeamMember).toHaveBeenCalledWith('org-1', 't-platform', 'e-old')
  })

  it('offers only active employees not already in the team, and only valid leads', async () => {
    service.addTeamMember.mockResolvedValue({})
    service.createTeam.mockResolvedValue({ id: 't-new' })
    wrap(<TeamsAdminCard organizationId="org-1" />)
    const addToPlatform = screen.getByLabelText('Add an employee to Platform')
    expect(within(addToPlatform).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose an employee', 'Ben Okafor'])
    await userEvent.selectOptions(addToPlatform, 'e-ben')
    await userEvent.click(within(addToPlatform.closest('form') as HTMLElement).getByRole('button', { name: 'Add' }))
    expect(service.addTeamMember).toHaveBeenCalledWith('org-1', 't-platform', 'e-ben')

    await userEvent.click(screen.getByRole('button', { name: /New team/ }))
    const dialog = await screen.findByRole('dialog', { name: 'New team' })
    expect(within(within(dialog).getByLabelText(/Lead/)).getAllByRole('option').map((option) => option.textContent)).toEqual(['No lead', 'Sue Lead'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create team' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a team name.')
    expect(service.createTeam).not.toHaveBeenCalled()
    await userEvent.type(within(dialog).getByLabelText(/^Team name/), 'Data')
    await userEvent.selectOptions(within(dialog).getByLabelText(/Lead/), 's-sup')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create team' }))
    expect(service.createTeam).toHaveBeenCalledWith('org-1', { name: 'Data', description: undefined, leadSupervisorId: 's-sup' })
  })
})
