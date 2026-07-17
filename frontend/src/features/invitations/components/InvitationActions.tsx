import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'

interface InvitationActionsProps {
  acceptLabel?: string
  isAccepting?: boolean
  loginPath: string
  onAccept?: () => void
  registerPath: string
  showAcceptAction?: boolean
  showAuthActions?: boolean
}

export function InvitationActions({
  acceptLabel = 'Accept invitation',
  isAccepting = false,
  loginPath,
  onAccept,
  registerPath,
  showAcceptAction = false,
  showAuthActions = false,
}: InvitationActionsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {showAcceptAction && onAccept ? (
        <Button disabled={isAccepting} onClick={onAccept} type="button">
          {isAccepting ? 'Accepting...' : acceptLabel}
        </Button>
      ) : null}

      {showAuthActions ? (
        <>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] shadow-sm transition hover:bg-primary-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            to={loginPath}
          >
            Sign in
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            to={registerPath}
          >
            Create account
          </Link>
        </>
      ) : null}
    </div>
  )
}
