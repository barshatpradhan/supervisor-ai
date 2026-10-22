import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, parseApiError } from '../../../lib/api/errors'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

const auth = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), registerInvitation: vi.fn(), requestPasswordReset: vi.fn() }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('../services/authService', () => ({ requestPasswordReset: auth.requestPasswordReset }))

const GENERIC = 'Too many attempts. Please wait a moment and try again.'
const rateLimited = (seconds: number) => new ApiError(GENERIC, { statusCode: 429, retryAfterSeconds: seconds })

function renderInRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  Object.values(auth).forEach((mock) => mock.mockReset())
})
afterEach(() => vi.useRealTimers())

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

describe('rate-limited auth forms', () => {
  it('login: shows the wait, announces it once, disables submit, then re-enables it', async () => {
    auth.login.mockRejectedValue(rateLimited(90))
    renderInRouter(<LoginForm />)
    const actor = user()

    await actor.type(screen.getByLabelText('Email'), 'a@example.com')
    await actor.type(screen.getByLabelText('Password'), 'wrong-password')
    await actor.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Please wait about 2 minutes before trying again.')
    expect(screen.getByText('1:30')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(screen.queryByText('Login failed')).not.toBeInTheDocument()

    await act(async () => { vi.advanceTimersByTime(30_000) })
    expect(screen.getByText('1:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()

    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You can try again now.')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('login: other errors still show the normal message', async () => {
    auth.login.mockRejectedValue(new ApiError('Invalid email or password.', { statusCode: 401 }))
    renderInRouter(<LoginForm />)
    const actor = user()

    await actor.type(screen.getByLabelText('Email'), 'a@example.com')
    await actor.type(screen.getByLabelText('Password'), 'wrong-password')
    await actor.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('forgot password: a 429 shows the wait and disables sending', async () => {
    auth.requestPasswordReset.mockRejectedValue(rateLimited(30))
    renderInRouter(<ForgotPasswordForm />)
    const actor = user()

    await actor.type(screen.getByLabelText('Email'), 'a@example.com')
    await actor.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait 30 seconds before trying again.')
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDisabled()
    await act(async () => { vi.advanceTimersByTime(30_000) })
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled()
  })

  it('register: a 429 shows the wait and disables account creation', async () => {
    auth.register.mockRejectedValue(rateLimited(3600))
    renderInRouter(<RegisterForm />)
    const actor = user()

    await actor.type(screen.getByLabelText('Email'), 'a@example.com')
    for (const field of screen.getAllByLabelText(/password/i)) await actor.type(field, 'a-strong-password')
    await actor.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait about 60 minutes before trying again.')
    expect(screen.getByText('60:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })
})

describe('parseApiError', () => {
  it('reads Retry-After from a 429 response', () => {
    const headers = new AxiosHeaders({ 'retry-after': '120' })
    const error = new AxiosError('Too many', 'ERR_BAD_REQUEST', undefined, undefined, {
      config: { headers },
      data: { success: false, message: GENERIC, error: GENERIC },
      headers: { 'retry-after': '120' },
      status: 429,
      statusText: 'Too Many Requests',
    })

    const parsed = parseApiError(error)
    expect(parsed.statusCode).toBe(429)
    expect(parsed.retryAfterSeconds).toBe(120)
    expect(parsed.message).toBe(GENERIC)
  })
})
