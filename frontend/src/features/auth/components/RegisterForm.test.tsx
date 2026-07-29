import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterForm } from './RegisterForm'

const navigateMock = vi.fn()
const registerMock = vi.fn()
const registerInvitationMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    register: registerMock,
    registerInvitation: registerInvitationMock,
  }),
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    registerMock.mockReset()
    registerInvitationMock.mockReset()
  })

  it('returns invited users to the invitation path after registration', async () => {
    registerInvitationMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter
        initialEntries={['/signup?returnTo=%2Finvitations%2Faccept%3Ftoken%3Dsecure-token']}
      >
        <RegisterForm />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/^password$/i), 'SecurePassword123!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(registerInvitationMock).toHaveBeenCalledWith('secure-token', 'SecurePassword123!')
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', {
      replace: true,
    })
  })
})
