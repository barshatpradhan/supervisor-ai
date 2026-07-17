import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { buildAuthPathWithReturnTo } from '../utils/invitationNavigation'
import type { InvitationPublicStatus } from '../types/invitation'

interface InvitationStatusStateProps {
  onRetry?: () => void
  returnTo: string | null
  status: InvitationPublicStatus | 'invalid'
}

const copyByStatus: Record<
  InvitationStatusStateProps['status'],
  {
    description: string
    title: string
  }
> = {
  accepted: {
    description:
      'This invitation has already been used. Sign in to open the organization workspace if you already joined.',
    title: 'Invitation already accepted',
  },
  expired: {
    description:
      'This invitation is past its expiration date. Ask an organization admin to resend a fresh link.',
    title: 'Invitation expired',
  },
  invalid: {
    description:
      'This invitation link is invalid or has already been replaced by a newer link.',
    title: 'Invitation not found',
  },
  pending: {
    description: 'This invitation is still pending.',
    title: 'Invitation pending',
  },
  revoked: {
    description:
      'This invitation has been revoked. Contact the organization admin if you still need access.',
    title: 'Invitation revoked',
  },
}

export function InvitationStatusState({
  onRetry,
  returnTo,
  status,
}: InvitationStatusStateProps) {
  const copy = copyByStatus[status]

  return (
    <Card className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
          Invitation status
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink-900">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">{copy.description}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="sm:w-auto"
          onClick={onRetry}
          type="button"
          variant="secondary"
        >
          {onRetry ? 'Check again' : 'Back to sign in'}
        </Button>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
          to={buildAuthPathWithReturnTo('/login', returnTo)}
        >
          Sign in
        </Link>
      </div>
    </Card>
  )
}
