import { useCallback, useState } from 'react'
import { createOrganizationInvitation } from '../services/invitationService'
import type {
  CreateOrganizationInvitationRequest,
  OrganizationInvitationMutationResponse,
} from '../types/invitation'

interface CreateInvitationState {
  error: string | null
  isSubmitting: boolean
}

export function useCreateInvitation(organizationId: string | null) {
  const [state, setState] = useState<CreateInvitationState>({
    error: null,
    isSubmitting: false,
  })

  const createInvitation = useCallback(
    async (
      request: CreateOrganizationInvitationRequest,
    ): Promise<OrganizationInvitationMutationResponse> => {
      if (!organizationId) {
        throw new Error('Organization context is required to invite members.')
      }

      setState({
        error: null,
        isSubmitting: true,
      })

      try {
        const result = await createOrganizationInvitation(organizationId, request)
        setState({
          error: null,
          isSubmitting: false,
        })
        return result
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to create the invitation.'

        setState({
          error: message,
          isSubmitting: false,
        })
        throw new Error(message, { cause: caughtError })
      }
    },
    [organizationId],
  )

  const clearError = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
    }))
  }, [])

  return {
    clearError,
    createInvitation,
    error: state.error,
    isSubmitting: state.isSubmitting,
  }
}
