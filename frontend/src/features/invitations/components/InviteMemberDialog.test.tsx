import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InviteMemberDialog } from './InviteMemberDialog'

const successMock = vi.fn()
const errorMock = vi.fn()
const createOrganizationInvitationMock = vi.fn()
const onCancelMock = vi.fn()
const onSuccessMock = vi.fn()

vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    error: errorMock,
    success: successMock,
  }),
}))

vi.mock('../../organizations/hooks/useOrganization', () => ({
  useOrganization: () => ({
    activeMembershipRole: 'organization_admin',
    activeOrganization: { id: 'org-1', name: 'Organization A' },
  }),
}))

vi.mock('../services/invitationService', () => ({
  createOrganizationInvitation: (...args: unknown[]) =>
    createOrganizationInvitationMock(...args),
}))

describe('InviteMemberDialog', () => {
  beforeEach(() => {
    successMock.mockReset()
    errorMock.mockReset()
    createOrganizationInvitationMock.mockReset()
    onCancelMock.mockReset()
    onSuccessMock.mockReset()
  })

  it('switches fields by role', async () => {
    render(<InviteMemberDialog isOpen onCancel={onCancelMock} onSuccess={onSuccessMock} />)

    expect(screen.getByLabelText(/employment type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weekly capacity hours/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^department$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText(/^role$/i), 'supervisor')

    expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/job title/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/employment type/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/weekly capacity hours/i)).not.toBeInTheDocument()
  })

  it('submits a valid employee invitation payload', async () => {
    createOrganizationInvitationMock.mockResolvedValue({
      invitation: { id: 'invite-1' },
      membership: { id: 'membership-1' },
    })

    render(<InviteMemberDialog isOpen onCancel={onCancelMock} onSuccess={onSuccessMock} />)

    await userEvent.type(screen.getByLabelText(/^email$/i), ' Employee@Example.com ')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jordan Lee')
    await userEvent.type(screen.getByLabelText(/^bio$/i), 'Frontend engineer')
    await userEvent.selectOptions(screen.getByLabelText(/employment type/i), 'full_time')
    await userEvent.type(screen.getByLabelText(/weekly capacity hours/i), '40')
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(createOrganizationInvitationMock).toHaveBeenCalledWith('org-1', {
        email: 'employee@example.com',
        role: 'employee',
        profile: {
          bio: 'Frontend engineer',
          employment_type: 'full_time',
          full_name: 'Jordan Lee',
          weekly_capacity_hours: 40,
        },
      })
    })

    expect(onSuccessMock).toHaveBeenCalled()
  })

  it('submits a valid supervisor invitation payload', async () => {
    createOrganizationInvitationMock.mockResolvedValue({
      invitation: { id: 'invite-2' },
      membership: { id: 'membership-2' },
    })

    render(<InviteMemberDialog isOpen onCancel={onCancelMock} onSuccess={onSuccessMock} />)

    await userEvent.selectOptions(screen.getByLabelText(/^role$/i), 'supervisor')
    await userEvent.type(screen.getByLabelText(/^email$/i), 'supervisor@example.com')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Taylor Morgan')
    await userEvent.type(screen.getByLabelText(/department/i), 'Engineering')
    await userEvent.type(screen.getByLabelText(/^bio$/i), 'Delivery lead')
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(createOrganizationInvitationMock).toHaveBeenCalledWith('org-1', {
        email: 'supervisor@example.com',
        role: 'supervisor',
        profile: {
          bio: 'Delivery lead',
          department: 'Engineering',
          full_name: 'Taylor Morgan',
        },
      })
    })
  })

  it('prevents duplicate submission while a request is in flight', async () => {
    let resolveRequest!: (value: {
      invitation: { id: string }
      membership: { id: string }
    }) => void
    const pendingRequest = new Promise<{
      invitation: { id: string }
      membership: { id: string }
    }>((resolve) => {
      resolveRequest = resolve
    })
    createOrganizationInvitationMock.mockReturnValue(pendingRequest)

    render(<InviteMemberDialog isOpen onCancel={onCancelMock} onSuccess={onSuccessMock} />)

    await userEvent.type(screen.getByLabelText(/^email$/i), 'employee@example.com')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jordan Lee')
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))

    const submitButton = screen.getByRole('button', { name: /sending invitation/i })
    expect(submitButton).toBeDisabled()

    await userEvent.click(submitButton)
    expect(createOrganizationInvitationMock).toHaveBeenCalledTimes(1)

    resolveRequest({
      invitation: { id: 'invite-3' },
      membership: { id: 'membership-3' },
    })
    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled()
    })
  })

  it('shows backend validation errors safely', async () => {
    createOrganizationInvitationMock.mockRejectedValue(
      new Error('profile.department is not supported for employee invitations.'),
    )

    render(<InviteMemberDialog isOpen onCancel={onCancelMock} onSuccess={onSuccessMock} />)

    await userEvent.type(screen.getByLabelText(/^email$/i), 'employee@example.com')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Jordan Lee')
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/profile\.department is not supported for employee invitations\./i),
      ).toBeInTheDocument()
    })
  })
})
