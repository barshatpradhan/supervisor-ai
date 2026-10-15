import type { LucideIcon } from 'lucide-react'
import {
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { hasPermission } from '../lib/permissions'
import type { BackendOrganizationMembershipRole, BackendPlatformRole } from '../types/backend'

export interface NavigationItem {
  ai?: boolean
  href: string
  icon: LucideIcon
  label: string
}

interface NavigationDefinition extends NavigationItem {
  permission?: Parameters<typeof hasPermission>[0]['permission']
}

const navigation: readonly NavigationDefinition[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderKanban, label: 'Projects', permission: 'projects:manage' },
  { href: '/tasks', icon: ListChecks, label: 'Tasks' },
  { ai: true, href: '/ai-recommendations', icon: Sparkles, label: 'AI Recommendations', permission: 'recommendations:manage' },
  { href: '/organization/invitations', icon: Mail, label: 'Invitations', permission: 'invitations:manage' },
  { href: '/profile', icon: UserRound, label: 'Profile' },
  { href: '/platform-admin', icon: ShieldCheck, label: 'Platform', permission: 'admin:users:write' },
  { href: '/admin/users/new', icon: UserPlus, label: 'New user', permission: 'admin:users:write' },
]

export function getNavigationItems(input: {
  organizationRole: BackendOrganizationMembershipRole | null
  platformRole: BackendPlatformRole | null
}): NavigationItem[] {
  const permittedItems = navigation.filter((item) => !item.permission || hasPermission({
    permission: item.permission,
    organizationRole: input.organizationRole,
    platformRole: input.platformRole,
  }))

  // Team sits after Tasks. Admins and supervisors reach it at different paths.
  const teamHref =
    input.organizationRole === 'organization_admin'
      ? '/team'
      : input.organizationRole === 'supervisor'
        ? '/employees'
        : null

  if (!teamHref) {
    return permittedItems
  }

  const tasksIndex = permittedItems.findIndex((item) => item.href === '/tasks')
  return [
    ...permittedItems.slice(0, tasksIndex + 1),
    { href: teamHref, icon: Users, label: 'Team' },
    ...permittedItems.slice(tasksIndex + 1),
  ]
}

/** Whether a nav item should show as current for a path, including nested pages. */
export function isNavigationItemActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
