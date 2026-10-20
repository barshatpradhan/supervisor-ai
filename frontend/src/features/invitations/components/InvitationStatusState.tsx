import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { buildAuthPathWithReturnTo } from '../utils/invitationNavigation'
import type { InvitationPublicStatus } from '../types/invitation'

interface InvitationStatusStateProps {
  onRetry?: () => void
  returnTo: string | null
  status: InvitationPublicStatus | 'invalid'
}

const copyByStatus: Record<InvitationStatusStateProps['status'], { description: string; kind: 'empty' | 'error'; title: string }> = {
  accepted: {
    description: 'This invitation has already been used. Sign in to open the workspace if you joined.',
    kind: 'empty',
    title: 'Invitation already accepted',
  },
  expired: {
    description: 'This invitation is past its expiry date. Ask an organization admin to send a new one.',
    kind: 'error',
    title: 'Invitation expired',
  },
  invalid: {
    description: 'This link is invalid, or a newer link has replaced it. Check your latest invitation email.',
    kind: 'error',
    title: 'Invitation not found',
  },
  pending: {
    description: 'This invitation is still pending.',
    kind: 'empty',
    title: 'Invitation pending',
  },
  revoked: {
    description: 'This invitation was withdrawn. Contact the organization admin if you still need access.',
    kind: 'error',
    title: 'Invitation revoked',
  },
}

/** A terminal state for the link: accepted, expired, revoked or not found. */
export function InvitationStatusState({ onRetry, returnTo, status }: InvitationStatusStateProps) {
  const copy = copyByStatus[status]

  return (
    <Card>
      <StateBlock
        action={
          <div className="flex flex-wrap justify-center gap-3">
            {onRetry ? <Button onClick={onRetry} variant="secondary">Check again</Button> : null}
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700"
              to={buildAuthPathWithReturnTo('/login', returnTo)}
            >
              Sign in
            </Link>
          </div>
        }
        kind={copy.kind}
        title={copy.title}
      >
        {copy.description}
      </StateBlock>
    </Card>
  )
}
