import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

const navigateMock = vi.fn()
const loginMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    loginMock.mockReset()
  })

  it('returns invited users to the invitation path after sign in', async () => {
    loginMock.mockResolvedValue({
      user: { platformRole: null },
    })

    render(
      <MemoryRouter
        initialEntries={['/login?returnTo=%2Finvitations%2Faccept%3Ftoken%3Dsecure-token']}
      >
        <LoginForm />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByLabelText(/email/i), 'invitee@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePassword123!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(loginMock).toHaveBeenCalledWith({
      email: 'invitee@example.com',
      password: 'SecurePassword123!',
    })
    expect(navigateMock).toHaveBeenCalledWith('/invitations/accept?token=secure-token', {
      replace: true,
    })
  })

  it('sends platform administrators to platform administration by default', async () => {
    loginMock.mockResolvedValue({
      user: { platformRole: 'platform_admin' },
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginForm />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePassword123!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(navigateMock).toHaveBeenCalledWith('/platform-admin', { replace: true })
  })
})
