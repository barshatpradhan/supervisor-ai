import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { getPostAuthDestination } from '../../invitations/utils/invitationNavigation'
import { useAuth } from '../hooks/useAuth'

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

interface RegisterFormProps {
  helperText?: string
}

export function RegisterForm({ helperText }: RegisterFormProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { register, registerInvitation } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const invitationToken = new URLSearchParams(location.search)
    .get('returnTo')
    ?.match(/[?&]token=([^&]+)/)?.[1]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords must match before you continue.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      if (invitationToken) {
        await registerInvitation(decodeURIComponent(invitationToken), password)
        navigate('/dashboard', { replace: true })
      } else {
        await register({ email, password })
        navigate(getPostAuthDestination(location.search), { replace: true })
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      {error ? <ErrorState message={error} title="Registration failed" /> : null}

      {helperText ? <p className="text-sm leading-6 text-ink-600">{helperText}</p> : null}

      {!invitationToken ? (
        <label className="grid gap-2 text-sm font-semibold text-ink-800">
          Email
          <input
            autoComplete="email"
            className={inputClassName}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-semibold text-ink-800">
        Password
        <input
          autoComplete="new-password"
          className={inputClassName}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
          type="password"
          value={password}
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-ink-800">
        Confirm password
        <input
          autoComplete="new-password"
          className={inputClassName}
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      <Button className="mt-2" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}
