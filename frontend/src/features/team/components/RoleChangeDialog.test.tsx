import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackendRoleChangePreview } from '../../../types/backend'
import { RoleChangeDialog } from './RoleChangeDialog'

const previewRoleChange = vi.fn()
vi.mock('../services/teamAdminService', () => ({ previewRoleChange: (...args: unknown[]) => previewRoleChange(...args) }))

const basePreview: BackendRoleChangePreview = {
  membershipId: 'm-1',
  fromRole: 'employee',
  toRole: 'supervisor',
  unchanged: false,
  blockedReason: null,
  openTasks: 0,
  completedTasks: 3,
  teamsLed: [],
  teamsMemberOf: ['Platform'],
  needsProfile: 'supervisor',
  suggestedName: 'Aisha Bello',
}

function renderDialog(preview: Partial<BackendRoleChangePreview>, props: { isSelf?: boolean } = {}) {
  previewRoleChange.mockResolvedValue({ ...basePreview, ...preview })
  const onConfirm = vi.fn().mockResolvedValue(true)
  const onCancel = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoleChangeDialog
        isSelf={props.isSelf ?? false}
        memberName="Aisha Bello"
        membershipId="m-1"
        onCancel={onCancel}
        onConfirm={onConfirm}
        organizationId="org-1"
        pending={false}
        targetRole={(preview.toRole ?? basePreview.toRole)}
      />
    </QueryClientProvider>,
  )
  return { onCancel, onConfirm }
}

describe('RoleChangeDialog', () => {
  beforeEach(() => previewRoleChange.mockReset())

  it('says in plain words what changes and what stays, then confirms with the prefilled name', async () => {
    const { onConfirm } = renderDialog({})
    expect(await screen.findByText(/leaves the recommendation pool and can't be assigned new tasks/)).toBeInTheDocument()
    expect(screen.getByText(/They see every project channel, with its full history/)).toBeInTheDocument()
    expect(screen.getByText(/stay listed in Platform, marked as not assignable/)).toBeInTheDocument()
    expect(screen.getByText(/3 completed tasks, skills, progress history, team memberships stay with their employee profile/)).toBeInTheDocument()
    expect(screen.getByText(/Nothing is deleted/)).toBeInTheDocument()
    expect(previewRoleChange).toHaveBeenCalledWith('org-1', 'm-1', 'supervisor')

    const name = screen.getByLabelText(/Name for their new supervisor profile/)
    expect(name).toHaveValue('Aisha Bello')
    await userEvent.click(screen.getByRole('button', { name: 'Make supervisor' }))
    expect(onConfirm).toHaveBeenCalledWith('Aisha Bello')
  })

  it('asks for a name when there is no other profile to take it from', async () => {
    const { onConfirm } = renderDialog({ fromRole: 'organization_admin', toRole: 'employee', needsProfile: 'employee', suggestedName: null, completedTasks: 0, teamsMemberOf: [] })
    const name = await screen.findByLabelText(/Name for their new employee profile/)
    expect(name).toHaveValue('')
    const confirm = screen.getByRole('button', { name: 'Make employee' })
    expect(confirm).toBeDisabled()
    await userEvent.type(name, '  Sam Carter ')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith('Sam Carter')
  })

  it.each([
    [{ blockedReason: 'has_open_tasks' as const, openTasks: 2 }, 'Aisha Bello has 2 open tasks. Reassign them before changing the role.'],
    [{ blockedReason: 'last_admin' as const, fromRole: 'organization_admin' as const }, 'Aisha Bello is the only active admin. Make someone else an admin first.'],
    [{ blockedReason: 'leads_teams' as const, fromRole: 'supervisor' as const, toRole: 'employee' as const, teamsLed: ['Platform', 'Data'] }, 'Aisha Bello leads Platform, Data. Choose a new lead for those teams first.'],
  ])('blocks the change with a clear reason (%o)', async (preview, message) => {
    const { onConfirm } = renderDialog(preview)
    const reason = await screen.findByRole('alert')
    expect(reason).toHaveTextContent(message)
    const confirm = screen.getByRole('button', { name: /^Make / })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-describedby', reason.id)
    expect(screen.queryByLabelText(/Name for their new/)).not.toBeInTheDocument()
    await userEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('warns an admin who is changing their own role', async () => {
    renderDialog({ fromRole: 'organization_admin', toRole: 'supervisor', needsProfile: null, completedTasks: 0, teamsMemberOf: [] }, { isSelf: true })
    expect(await screen.findByRole('note')).toHaveTextContent('You will lose the admin pages as soon as you confirm.')
    expect(screen.getByText(/They lose the admin pages: team management and invitations/)).toBeInTheDocument()
  })

  it('shows an error with a retry when the preview fails', async () => {
    previewRoleChange.mockRejectedValue(new Error('down'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <RoleChangeDialog isSelf={false} memberName="Aisha" membershipId="m-1" onCancel={vi.fn()} onConfirm={vi.fn()} organizationId="org-1" pending={false} targetRole="supervisor" />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Could not check what this change affects.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Make supervisor/ })).toBeDisabled()
    previewRoleChange.mockResolvedValue(basePreview)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText(/leaves the recommendation pool/)).toBeInTheDocument()
  })
})
