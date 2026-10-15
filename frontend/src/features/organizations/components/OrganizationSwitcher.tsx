import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../hooks/useOrganization'
import { formatOrganizationRole, getActiveOrganizations } from '../utils/organizationPresentation'

/**
 * The workspace control in the top bar. With one organization it names it; with several it
 * becomes a select. Pending and suspended memberships live on the Select organization page.
 */
export function OrganizationSwitcher() {
  const navigate = useNavigate()
  const { activeMembership, activeOrganization, isLoading, organizations, selectOrganization } = useOrganization()
  const activeOrganizations = getActiveOrganizations(organizations)
  const roleLabel = activeMembership ? formatOrganizationRole(activeMembership.role) : null

  if (isLoading) {
    return <span className="helper text-text-tertiary">Loading workspace…</span>
  }

  if (activeOrganizations.length > 1) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <label className="sr-only" htmlFor="workspace-switcher">Workspace</label>
        <select
          className="body-strong min-h-10 max-w-64 truncate rounded-control border border-border-strong bg-surface-card px-3 text-text-primary"
          id="workspace-switcher"
          onChange={(event) => {
            selectOrganization(event.target.value)
            navigate('/dashboard')
          }}
          value={activeOrganization?.id ?? ''}
        >
          {activeOrganization ? null : <option value="">Select a workspace</option>}
          {activeOrganizations.map((entry) => (
            <option key={entry.organization.id} value={entry.organization.id}>{entry.organization.name}</option>
          ))}
        </select>
        {roleLabel ? <span className="helper hidden text-text-tertiary sm:inline">{roleLabel}</span> : null}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <span className="body-strong truncate text-text-primary">{activeOrganization?.name ?? 'No workspace selected'}</span>
      {roleLabel ? <span className="helper text-text-tertiary">{roleLabel}</span> : null}
    </div>
  )
}
