import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

interface WrongAccountStateProps {
  currentEmail: string | null
  loginPath: string
  logoutToInvitedEmail: () => void
  maskedInvitedEmail: string
}

export function WrongAccountState({
  currentEmail,
  loginPath,
  logoutToInvitedEmail,
  maskedInvitedEmail,
}: WrongAccountStateProps) {
  return (
    <Card className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-danger-700">
          Wrong account
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink-900">
          This invitation belongs to a different email
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          You are signed in as {currentEmail ?? 'another account'}, but this invitation was sent
          to {maskedInvitedEmail}. Sign in with the invited email before accepting.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={logoutToInvitedEmail} type="button">
          Sign out and continue
        </Button>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
          to={loginPath}
        >
          Open sign in
        </Link>
      </div>
    </Card>
  )
}
