import { createContext } from 'react'
import type { OrganizationContextValue } from '../types/organization'

export const OrganizationContext = createContext<OrganizationContextValue | null>(null)
