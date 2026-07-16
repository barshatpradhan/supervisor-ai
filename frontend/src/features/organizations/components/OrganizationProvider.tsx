import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { OrganizationContext } from '../hooks/organizationContext'
import { listCurrentUserOrganizations } from '../services/organizationService'
import type {
  CurrentUserOrganizationListItem,
  OrganizationContextValue,
} from '../types/organization'
import {
  getStoredOrganizationId,
  clearStoredOrganizationId,
  storeOrganizationId,
} from '../utils/organizationStorage'
import { getActiveOrganizations } from '../utils/organizationPresentation'
import { setActiveOrganizationId as setRequestContextOrganizationId } from '../utils/organizationRequestContext'

interface OrganizationProviderProps {
  children: ReactNode
}

function resolveSelectedOrganizationId(
  organizations: CurrentUserOrganizationListItem[],
  preferredOrganizationId: string | null,
) {
  const activeOrganizations = getActiveOrganizations(organizations)

  if (activeOrganizations.length === 1) {
    return activeOrganizations[0]?.organization.id ?? null
  }

  if (
    preferredOrganizationId &&
    activeOrganizations.some((entry) => entry.organization.id === preferredOrganizationId)
  ) {
    return preferredOrganizationId
  }

  return null
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [organizations, setOrganizations] = useState<CurrentUserOrganizationListItem[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearOrganization = useCallback(() => {
    setOrganizations([])
    setSelectedOrganizationId(null)
    setError(null)
    setRequestContextOrganizationId(null)
    clearStoredOrganizationId()
  }, [])

  const selectOrganization = useCallback((organizationId: string | null) => {
    setSelectedOrganizationId(organizationId)
    setRequestContextOrganizationId(organizationId)

    if (organizationId) {
      storeOrganizationId(organizationId)
      return
    }

    clearStoredOrganizationId()
  }, [])

  const refreshOrganizations = useCallback(async () => {
    const nextOrganizations = await listCurrentUserOrganizations()
    const preferredOrganizationId = selectedOrganizationId ?? getStoredOrganizationId()
    const nextSelectedOrganizationId = resolveSelectedOrganizationId(
      nextOrganizations,
      preferredOrganizationId,
    )

    setOrganizations(nextOrganizations)
    setError(null)
    selectOrganization(nextSelectedOrganizationId)

    return nextOrganizations
  }, [selectOrganization, selectedOrganizationId])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!isAuthenticated) {
      Promise.resolve().then(() => {
        clearOrganization()
      })
      return
    }

    let isMounted = true
    Promise.resolve().then(() => {
      if (isMounted) {
        setIsLoading(true)
      }
    })

    void listCurrentUserOrganizations()
      .then((nextOrganizations) => {
        if (!isMounted) {
          return
        }

        const preferredOrganizationId = getStoredOrganizationId()
        const nextSelectedOrganizationId = resolveSelectedOrganizationId(
          nextOrganizations,
          preferredOrganizationId,
        )

        setOrganizations(nextOrganizations)
        setError(null)
        selectOrganization(nextSelectedOrganizationId)
      })
      .catch((caughtError) => {
        if (!isMounted) {
          return
        }

        clearOrganization()
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load your organizations.',
        )
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [clearOrganization, isAuthenticated, isAuthLoading, selectOrganization])

  const activeEntry = useMemo(
    () =>
      organizations.find(
        (entry) =>
          entry.organization.id === selectedOrganizationId &&
          entry.membership.status === 'active',
      ) ?? null,
    [organizations, selectedOrganizationId],
  )

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeMembership: activeEntry?.membership ?? null,
      activeOrganization: activeEntry?.organization ?? null,
      activeRole: activeEntry?.membership.role ?? null,
      isLoading: isAuthLoading || (isAuthenticated && isLoading),
      error,
      selectOrganization,
      refreshOrganizations,
      clearOrganization,
    }),
    [
      activeEntry,
      clearOrganization,
      error,
      isAuthenticated,
      isAuthLoading,
      isLoading,
      organizations,
      refreshOrganizations,
      selectOrganization,
    ],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}
