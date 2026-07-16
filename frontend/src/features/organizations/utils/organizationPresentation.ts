import type {
  CurrentUserOrganizationListItem,
  OrganizationMembershipRole,
} from '../types/organization'

export function getActiveOrganizations(organizations: CurrentUserOrganizationListItem[]) {
  return organizations.filter((entry) => entry.membership.status === 'active')
}

export function getInvitedOrganizations(organizations: CurrentUserOrganizationListItem[]) {
  return organizations.filter((entry) => entry.membership.status === 'invited')
}

export function getSuspendedOrganizations(organizations: CurrentUserOrganizationListItem[]) {
  return organizations.filter((entry) => entry.membership.status === 'suspended')
}

export function formatOrganizationRole(role: OrganizationMembershipRole) {
  switch (role) {
    case 'organization_admin':
      return 'Organization admin'
    case 'supervisor':
      return 'Supervisor'
    case 'employee':
      return 'Employee'
    default:
      return role
  }
}

export function slugifyOrganizationName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
