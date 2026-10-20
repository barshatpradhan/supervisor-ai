import { UserRoundX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'

interface WrongAccountStateProps {
  currentEmail: string | null
  loginPath: string
  logoutToInvitedEmail: () => void
  maskedInvitedEmail: string
}

/** Signed in as someone else: switch to the invited account before accepting. */
export function WrongAccountState({ currentEmail, loginPath, logoutToInvitedEmail, maskedInvitedEmail }: WrongAccountStateProps) {
  return (
    <Card aria-labelledby="wrong-account-title" className="flex flex-col gap-4">
      <CardHeader
        icon={
          <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-pill bg-danger-bg text-danger-fg">
            <UserRoundX size={16} />
          </span>
        }
        id="wrong-account-title"
        title="This invitation belongs to a different email"
      />
      <dl className="m-0 grid gap-3 rounded-control border border-chart-grid bg-surface-inset p-4 sm:grid-cols-2">
        <div>
          <dt className="helper text-text-tertiary">Signed in as</dt>
          <dd className="body-strong m-0 break-words text-text-primary">{currentEmail ?? 'Another account'}</dd>
        </div>
        <div>
          <dt className="helper text-text-tertiary">Invitation sent to</dt>
          <dd className="body-strong m-0 break-words text-text-primary">{maskedInvitedEmail}</dd>
        </div>
      </dl>
      <p className="body m-0 text-text-secondary">Sign in with the invited email to accept.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={logoutToInvitedEmail}>Sign out and continue</Button>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-control border border-border-strong bg-surface-card px-4 text-sm font-semibold text-text-primary no-underline hover:bg-surface-muted"
          to={loginPath}
        >
          Open sign in
        </Link>
      </div>
    </Card>
  )
}
