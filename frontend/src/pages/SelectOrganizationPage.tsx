import { OrganizationAccessState } from '../features/organizations/components/OrganizationAccessState'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useOrganization } from '../features/organizations/hooks/useOrganization'

export function SelectOrganizationPage() {
  const { onboarding } = useAuth()
  const { activeOrganization, organizations, refreshOrganizations, selectOrganization } = useOrganization()

  return <OrganizationAccessState activeOrganizationId={activeOrganization?.id ?? null} canCreateOrganization={Boolean(onboarding?.requiresOrganizationCreation && !onboarding.hasPendingInvitations)} organizations={organizations} onRefresh={refreshOrganizations} onSelectOrganization={selectOrganization} />
}
