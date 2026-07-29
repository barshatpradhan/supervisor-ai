import type { NavigationItem } from '../components/layout/Sidebar'
import { hasPermission } from '../lib/permissions'
import type { BackendOrganizationMembershipRole, BackendPlatformRole } from '../types/backend'

interface NavigationDefinition extends NavigationItem {
  permission?: Parameters<typeof hasPermission>[0]['permission']
}

const navigation: readonly NavigationDefinition[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects', permission: 'projects:manage' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/employees', label: 'Employees', permission: 'employees:read' },
  { href: '/ai-recommendations', label: 'AI Recommendations', permission: 'recommendations:manage' },
  { href: '/organization/invitations', label: 'Invitations', permission: 'invitations:manage' },
  { href: '/profile', label: 'Profile' },
  { href: '/admin/users/new', label: 'New user', permission: 'admin:users:write' },
]

export function getNavigationItems(input: {
  organizationRole: BackendOrganizationMembershipRole | null
  platformRole: BackendPlatformRole | null
}) {
  return navigation.filter((item) => !item.permission || hasPermission({
    permission: item.permission,
    organizationRole: input.organizationRole,
    platformRole: input.platformRole,
  }))
}
