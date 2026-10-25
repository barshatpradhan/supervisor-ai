import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import { getFriendlyApiErrorMessage } from '../../../lib/api'
import { queryKeys } from '../../../lib/api/queryKeys'
import type { BackendOrganizationMembershipRole } from '../../../types/backend'
import { listUnassignableOpenTasks, previewRoleChange } from '../services/teamAdminService'

/** What changing one member to `role` would do. Loaded only while the dialog is open. */
export function useRoleChangePreview(
  organizationId: string,
  membershipId: string | null,
  role: BackendOrganizationMembershipRole | null,
) {
  return useQuery({
    enabled: Boolean(membershipId && role),
    queryFn: () => previewRoleChange(organizationId, membershipId as string, role as BackendOrganizationMembershipRole),
    queryKey: queryKeys.team.rolePreview(organizationId, membershipId ?? '', role ?? ''),
    retry: false,
    staleTime: 0,
  })
}

/** Open tasks whose assignee can no longer be assigned work (admins only). */
export function useUnassignableOpenTasks(organizationId: string) {
  return useQuery({
    queryFn: () => listUnassignableOpenTasks(organizationId),
    queryKey: queryKeys.team.unassignableTasks(organizationId),
    staleTime: 30_000,
  })
}

/**
 * Runs one admin change, then refreshes everything it can affect: members, teams, the tasks list
 * above, and (through onChanged) the page's workload directory. Success and errors are announced.
 */
export function useTeamAdminActions(organizationId: string, onChanged?: () => void) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const [pending, setPending] = useState(false)

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      setPending(true)
      try {
        await action()
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.team.list(organizationId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.team.teams(organizationId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.team.unassignableTasks(organizationId) }),
        ])
        onChanged?.()
        notifications.success({ title: success })
        return true
      } catch (error) {
        notifications.error({ title: 'That change was not saved', message: getFriendlyApiErrorMessage(error) })
        return false
      } finally {
        setPending(false)
      }
    },
    [notifications, onChanged, organizationId, queryClient],
  )

  return { pending, run }
}
