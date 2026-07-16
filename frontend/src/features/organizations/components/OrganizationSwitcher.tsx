import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../hooks/useOrganization'
import {
  formatOrganizationRole,
  getActiveOrganizations,
  getInvitedOrganizations,
  getSuspendedOrganizations,
} from '../utils/organizationPresentation'

function getButtonClassName(isSelected: boolean) {
  return [
    'w-full rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300',
    isSelected
      ? 'border-primary-200 bg-primary-50 text-primary-700'
      : 'border-border-subtle bg-surface-card-alt text-ink-700 hover:bg-surface-muted',
  ].join(' ')
}

export function OrganizationSwitcher() {
  const navigate = useNavigate()
  const {
    activeMembership,
    activeOrganization,
    isLoading,
    organizations,
    selectOrganization,
  } = useOrganization()

  const activeOrganizations = getActiveOrganizations(organizations)
  const invitedOrganizations = getInvitedOrganizations(organizations)
  const suspendedOrganizations = getSuspendedOrganizations(organizations)

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-3 text-sm text-ink-600">
        Loading organizations...
      </div>
    )
  }

  return (
    <section className="grid gap-3 rounded-lg border border-border-subtle bg-surface-card-alt p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">
          Active organization
        </p>
        <p className="mt-1 text-sm font-semibold text-ink-900">
          {activeOrganization?.name ?? 'Select organization'}
        </p>
        <p className="mt-1 text-xs text-ink-600">
          {activeMembership ? formatOrganizationRole(activeMembership.role) : 'No active membership'}
        </p>
      </div>

      {activeOrganizations.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Switch workspace
          </p>
          {activeOrganizations.map((entry) => {
            const isSelected = activeOrganization?.id === entry.organization.id

            return (
              <button
                key={entry.organization.id}
                className={getButtonClassName(isSelected)}
                onClick={() => {
                  selectOrganization(entry.organization.id)
                  navigate('/dashboard')
                }}
                type="button"
              >
                <span className="block font-semibold">{entry.organization.name}</span>
                <span className="mt-1 block text-xs text-ink-600">
                  {formatOrganizationRole(entry.membership.role)}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {invitedOrganizations.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-warning-text">
            Pending invitations
          </p>
          {invitedOrganizations.map((entry) => (
            <div
              key={entry.membership.id}
              className="rounded-md border border-warning-fg/30 bg-warning-bg/50 px-3 py-2 text-sm"
            >
              <span className="block font-semibold text-ink-900">{entry.organization.name}</span>
              <span className="mt-1 block text-xs text-ink-700">
                {formatOrganizationRole(entry.membership.role)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {suspendedOrganizations.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-danger-700">
            Suspended
          </p>
          {suspendedOrganizations.map((entry) => (
            <div
              key={entry.membership.id}
              className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm"
            >
              <span className="block font-semibold text-ink-900">{entry.organization.name}</span>
              <span className="mt-1 block text-xs text-danger-700">
                {formatOrganizationRole(entry.membership.role)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
