import { Card } from '../../../components/ui/Card'
import type { InvitationInspection } from '../types/invitation'
import {
  formatInvitationDate,
  getInvitationRoleLabel,
  getInvitationStatusLabel,
  getInvitationStatusTone,
} from '../utils/invitationPresentation'

interface InvitationSummaryCardProps {
  invitation: InvitationInspection
}

export function InvitationSummaryCard({ invitation }: InvitationSummaryCardProps) {
  return (
    <Card className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
          Invitation summary
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink-900">
          Join {invitation.organization.name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Review the organization and role before you continue.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Organization
          </dt>
          <dd className="mt-1 text-sm font-semibold text-ink-900">
            {invitation.organization.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Organization slug
          </dt>
          <dd className="mt-1 text-sm text-ink-700">{invitation.organization.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Invited role
          </dt>
          <dd className="mt-1 text-sm text-ink-700">{getInvitationRoleLabel(invitation.role)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Invited email
          </dt>
          <dd className="mt-1 text-sm text-ink-700">{invitation.invited_email}</dd>
        </div>
        {invitation.profile.full_name ? <div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Full name</dt><dd className="mt-1 text-sm text-ink-700">{invitation.profile.full_name}</dd></div> : null}
        {invitation.profile.job_title ? <div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Job title</dt><dd className="mt-1 text-sm text-ink-700">{invitation.profile.job_title}</dd></div> : null}
        {invitation.profile.department ? <div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Department</dt><dd className="mt-1 text-sm text-ink-700">{invitation.profile.department}</dd></div> : null}
        {invitation.profile.employment_type ? <div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Employment type</dt><dd className="mt-1 text-sm text-ink-700">{invitation.profile.employment_type === 'full_time' ? 'Full time' : 'Part time'}</dd></div> : null}
        {invitation.profile.weekly_capacity_hours !== null ? <div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Weekly capacity</dt><dd className="mt-1 text-sm text-ink-700">{invitation.profile.weekly_capacity_hours} hours</dd></div> : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Expires
          </dt>
          <dd className="mt-1 text-sm text-ink-700">{formatInvitationDate(invitation.expires_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Status
          </dt>
          <dd className="mt-1">
            <span
              className={[
                'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                getInvitationStatusTone(invitation.status),
              ].join(' ')}
            >
              {getInvitationStatusLabel(invitation.status)}
            </span>
          </dd>
        </div>
      </dl>
    </Card>
  )
}
