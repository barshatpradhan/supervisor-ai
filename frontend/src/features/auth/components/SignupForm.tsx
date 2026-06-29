import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

export function SignupForm() {
  const navigate = useNavigate()
  const { signupUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await signupUser({ email, password })
      navigate('/dashboard')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to create account.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      {error ? <ErrorState message={error} title="Signup failed" /> : null}

      <label className="grid gap-2 text-sm font-semibold text-ink-800">
        Email
        <input
          autoComplete="email"
          className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-200"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-ink-800">
        Password
        <input
          autoComplete="new-password"
          className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-200"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
          type="password"
          value={password}
        />
      </label>

      <Button className="mt-2" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}
