import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('hides the password until the toggle is pressed, then hides it again', async () => {
    render(
      <label>
        Password
        <PasswordInput defaultValue="secret-value" />
      </label>,
    )

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('does not submit the surrounding form when toggled', async () => {
    let submitted = false
    render(
      <form onSubmit={(event) => { event.preventDefault(); submitted = true }}>
        <PasswordInput aria-label="Password" />
      </form>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(submitted).toBe(false)
  })
})
