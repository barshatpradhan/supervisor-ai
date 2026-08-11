import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { confirmPasswordReset } from '../../../services/auth/authService'

interface ResetPasswordFormProps {
  accessToken: string | null
}

export function ResetPasswordForm({ accessToken }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(accessToken ? null : 'This reset link is invalid or has expired. Please request a new one.')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    if (password !== confirmPassword) {
      setError('Passwords must match.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await confirmPasswordReset(accessToken, { password })
      setIsSubmitted(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reset password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <p aria-live="polite" className="mt-6 rounded-md bg-primary-50 p-4 text-sm leading-6 text-primary-800">Your password has been reset. You can now sign in with your new password.</p>
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-ink-600">Choose a new password with at least 8 characters.</p>
      {error ? <ErrorState message={error} title="Could not reset password" /> : null}
      <label className="grid gap-2 text-sm font-semibold text-ink-800">New password<input autoComplete="new-password" className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200" disabled={!accessToken || isSubmitting} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
      <label className="grid gap-2 text-sm font-semibold text-ink-800">Confirm new password<input autoComplete="new-password" className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200" disabled={!accessToken || isSubmitting} minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} /></label>
      <Button className="mt-2" disabled={!accessToken || isSubmitting} type="submit">{isSubmitting ? 'Resetting password...' : 'Reset password'}</Button>
    </form>
  )
}
