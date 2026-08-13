import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '../../../components/shared/LoadingState'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../../organizations/hooks/useOrganization'

/**
 * Keeps platform administration separate from tenant dashboards. A platform
 * administrator may still open a tenant dashboard after selecting one of their
 * own organization memberships.
 */
export function DashboardEntryRoute() {
  const { platformRole } = useAuth()
  const { activeMembership, activeOrganization, isLoading } = useOrganization()

  if (isLoading) {
    return <LoadingState label="Loading your workspace..." />
  }

  if (platformRole === 'platform_admin' && (!activeOrganization || !activeMembership)) {
    return <Navigate replace to="/platform-admin" />
  }

  return <Outlet />
}
