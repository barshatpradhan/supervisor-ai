import type {
  BackendOrganizationMembershipRole,
  BackendPlatformRole,
} from '../../types/backend'

export type Permission =
  | 'admin:users:write'
  | 'employees:read'
  | 'invitations:manage'
  | 'projects:manage'
  | 'recommendations:manage'
  | 'tasks:manage'
  | 'tasks:progress:update'

const permissionRoles: Record<Permission, readonly BackendOrganizationMembershipRole[]> = {
  'admin:users:write': [],
  'employees:read': ['organization_admin', 'supervisor'],
  'invitations:manage': ['organization_admin'],
  'projects:manage': ['organization_admin', 'supervisor'],
  'recommendations:manage': ['organization_admin', 'supervisor'],
  'tasks:manage': ['organization_admin', 'supervisor'],
  'tasks:progress:update': ['organization_admin', 'supervisor', 'employee'],
}

export function hasPermission(input: {
  permission: Permission
  organizationRole: BackendOrganizationMembershipRole | null
  platformRole: BackendPlatformRole | null
}) {
  if (input.permission === 'admin:users:write') return input.platformRole === 'platform_admin'
  return input.organizationRole !== null && permissionRoles[input.permission].includes(input.organizationRole)
}
