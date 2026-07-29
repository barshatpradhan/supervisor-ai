import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PendingInvitationItem } from '../types/invitation'
import {
  listOrganizationInvitations,
  resendOrganizationInvitation,
  revokeOrganizationInvitation,
} from '../services/invitationService'
import { deriveInvitationStatus } from '../utils/invitationPresentation'

interface PendingInvitationsState {
  error: string | null
  invitations: PendingInvitationItem[]
  isLoading: boolean
  mutatingInvitationId: string | null
}

export function usePendingInvitations(
  organizationId: string | null,
  enabled: boolean,
  refreshKey = 0,
) {
  const [state, setState] = useState<PendingInvitationsState>({
    error: null,
    invitations: [],
    isLoading: false,
    mutatingInvitationId: null,
  })

  const loadInvitations = useCallback(async () => {
    if (!organizationId || !enabled) {
      setState({
        error: null,
        invitations: [],
        isLoading: false,
        mutatingInvitationId: null,
      })
      return []
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }))

    try {
      const invitations = await listOrganizationInvitations(organizationId)
      const pendingInvitations: PendingInvitationItem[] = invitations
        .map((invitation): PendingInvitationItem => ({
          ...invitation,
          derivedStatus: deriveInvitationStatus(invitation),
        }))
        .filter((invitation) => invitation.derivedStatus === 'pending')

      setState((current) => ({
        ...current,
        error: null,
        invitations: pendingInvitations,
        isLoading: false,
      }))

      return pendingInvitations
    } catch (caughtError) {
      setState((current) => ({
        ...current,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load pending invitations.',
        invitations: [],
        isLoading: false,
      }))

      return []
    }
  }, [enabled, organizationId])

  useEffect(() => {
    void loadInvitations()
  }, [loadInvitations, refreshKey])

  const resend = useCallback(
    async (invitationId: string) => {
      if (!organizationId) {
        throw new Error('Organization context is required to resend invitations.')
      }

      setState((current) => ({
        ...current,
        mutatingInvitationId: invitationId,
      }))

      try {
        const result = await resendOrganizationInvitation(organizationId, invitationId)
        await loadInvitations()
        return result
      } finally {
        setState((current) => ({
          ...current,
          mutatingInvitationId: null,
        }))
      }
    },
    [loadInvitations, organizationId],
  )

  const revoke = useCallback(
    async (invitationId: string) => {
      if (!organizationId) {
        throw new Error('Organization context is required to revoke invitations.')
      }

      setState((current) => ({
        ...current,
        mutatingInvitationId: invitationId,
      }))

      try {
        const result = await revokeOrganizationInvitation(organizationId, invitationId)
        await loadInvitations()
        return result
      } finally {
        setState((current) => ({
          ...current,
          mutatingInvitationId: null,
        }))
      }
    },
    [loadInvitations, organizationId],
  )

  return useMemo(
    () => ({
      error: state.error,
      invitations: state.invitations,
      isLoading: state.isLoading,
      mutatingInvitationId: state.mutatingInvitationId,
      refresh: loadInvitations,
      resend,
      revoke,
    }),
    [loadInvitations, resend, revoke, state.error, state.invitations, state.isLoading, state.mutatingInvitationId],
  )
}
