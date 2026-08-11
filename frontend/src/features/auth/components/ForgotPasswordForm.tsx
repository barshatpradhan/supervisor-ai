import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { requestPasswordReset } from '../../../services/auth/authService'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() })
      setIsSubmitted(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send a reset email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <p aria-live="polite" className="mt-6 rounded-md bg-primary-50 p-4 text-sm leading-6 text-primary-800">If an account exists for that email, you’ll receive a password reset link shortly. Check your inbox and spam folder.</p>
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-ink-600">Enter the email address for your account and we’ll send you a secure password reset link.</p>
      {error ? <ErrorState message={error} title="Could not send reset email" /> : null}
      <label className="grid gap-2 text-sm font-semibold text-ink-800">Email<input autoComplete="email" className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></label>
      <Button className="mt-2" disabled={isSubmitting} type="submit">{isSubmitting ? 'Sending reset link...' : 'Send reset link'}</Button>
    </form>
  )
}
