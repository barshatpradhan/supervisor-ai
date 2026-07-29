import type { OrganizationMembershipRole } from '../types/organization'

export function getRoleDashboardPath(role: OrganizationMembershipRole | null) {
  switch (role) {
    case 'organization_admin':
    case 'supervisor':
    case 'employee':
      return '/dashboard'
    default:
      return '/forbidden'
  }
}
