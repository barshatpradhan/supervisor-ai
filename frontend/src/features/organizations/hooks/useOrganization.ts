import { useContext } from 'react'
import { OrganizationContext } from './organizationContext'

export function useOrganization() {
  const context = useContext(OrganizationContext)

  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider.')
  }

  return context
}
