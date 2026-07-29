import { Navigate, Outlet } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { useOrganization } from '../hooks/useOrganization'
import type { OrganizationMembershipRole } from '../types/organization'
import { getActiveOrganizations } from '../utils/organizationPresentation'

interface OrganizationRouteProps {
  allowedRoles?: OrganizationMembershipRole[]
}

export function OrganizationRoute({ allowedRoles }: OrganizationRouteProps) {
  const { onboarding } = useAuth()
  const {
    activeMembership,
    activeOrganization,
    activeMembershipRole,
    error,
    isLoading,
    organizations,
    refreshOrganizations,
    selectOrganization,
  } = useOrganization()

  if (isLoading) {
    return <LoadingState label="Loading your organizations..." />
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void refreshOrganizations()
        }}
        title="Unable to load organization access"
      />
    )
  }

  const activeOrganizations = getActiveOrganizations(organizations)

  if (activeOrganizations.length === 0) {
    return <OrganizationAccessState activeOrganizationId={activeOrganization?.id ?? null} canCreateOrganization={Boolean(onboarding?.requiresOrganizationCreation && !onboarding.hasPendingInvitations)} organizations={organizations} onRefresh={refreshOrganizations} onSelectOrganization={selectOrganization} />
  }

  if (
    !activeOrganization ||
    !activeMembership ||
    !activeMembershipRole
  ) {
    return <Navigate replace to="/select-organization" />
  }

  if (allowedRoles && !allowedRoles.includes(activeMembershipRole)) {
    return <Navigate replace to="/forbidden" />
  }

  return <Outlet key={activeOrganization.id} />
}
import { useAuth } from '../../auth/hooks/useAuth'
import { OrganizationAccessState } from './OrganizationAccessState'
