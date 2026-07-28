import { Navigate, Outlet } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../hooks/useOrganization'
import type { OrganizationMembershipRole } from '../types/organization'
import { getActiveOrganizations } from '../utils/organizationPresentation'
import { OrganizationAccessState } from './OrganizationAccessState'

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

  if (
    activeOrganizations.length === 0 ||
    !activeOrganization ||
    !activeMembership ||
    !activeMembershipRole
  ) {
    return (
      <OrganizationAccessState
        activeOrganizationId={activeOrganization?.id ?? null}
        canCreateOrganization={Boolean(
          onboarding?.requiresOrganizationCreation && !onboarding.hasPendingInvitations,
        )}
        organizations={organizations}
        onRefresh={refreshOrganizations}
        onSelectOrganization={selectOrganization}
      />
    )
  }

  if (allowedRoles && !allowedRoles.includes(activeMembershipRole)) {
    return <Navigate replace to="/forbidden" />
  }

  return <Outlet key={activeOrganization.id} />
}
