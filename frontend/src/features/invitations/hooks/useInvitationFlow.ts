import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../lib/api'
import { acceptInvitation, inspectInvitation } from '../services/invitationService'
import type { InvitationAcceptance, InvitationInspection } from '../types/invitation'

interface InvitationFlowState {
  error: ApiError | Error | null
  invitation: InvitationInspection | null
  isAccepting: boolean
  isLoading: boolean
}

const initialState: InvitationFlowState = {
  error: null,
  invitation: null,
  isAccepting: false,
  isLoading: false,
}

export function useInvitationFlow(token: string | null) {
  const [state, setState] = useState<InvitationFlowState>(() =>
    token
      ? { ...initialState, isLoading: true }
      : {
          error: new Error('Invitation token is missing.'),
          invitation: null,
          isAccepting: false,
          isLoading: false,
        },
  )

  const loadInvitation = useCallback(async () => {
    if (!token) {
      setState({
        error: new Error('Invitation token is missing.'),
        invitation: null,
        isAccepting: false,
        isLoading: false,
      })
      return null
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }))

    try {
      const invitation = await inspectInvitation(token)
      setState((current) => ({
        ...current,
        error: null,
        invitation,
        isLoading: false,
      }))
      return invitation
    } catch (caughtError) {
      const error =
        caughtError instanceof Error ? caughtError : new Error('Unable to load invitation.')

      setState((current) => ({
        ...current,
        error,
        invitation: null,
        isLoading: false,
      }))
      throw error
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadInvitation().catch(() => undefined)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadInvitation, token])

  const accept = useCallback(async (): Promise<InvitationAcceptance> => {
    if (!token) {
      throw new Error('Invitation token is missing.')
    }

    setState((current) => ({
      ...current,
      error: null,
      isAccepting: true,
    }))

    try {
      const acceptedInvitation = await acceptInvitation(token)
      setState((current) => ({
        ...current,
        isAccepting: false,
      }))

      return acceptedInvitation
    } catch (caughtError) {
      const error =
        caughtError instanceof Error
          ? caughtError
          : new Error('Unable to accept invitation.')

      setState((current) => ({
        ...current,
        error,
        isAccepting: false,
      }))
      throw error
    }
  }, [token])

  return {
    accept,
    error: state.error,
    invitation: state.invitation,
    isAccepting: state.isAccepting,
    isLoading: state.isLoading,
    reload: loadInvitation,
  }
}
