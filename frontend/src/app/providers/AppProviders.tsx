import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { NotificationProvider } from '../../components/shared/notifications/NotificationProvider'
import { NotificationViewport } from '../../components/shared/notifications/NotificationViewport'
import { AuthProvider } from '../../features/auth/components/AuthProvider'
import { OrganizationProvider } from '../../features/organizations/components/OrganizationProvider'
import { QueryProvider } from './QueryProvider'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <QueryProvider>
        <NotificationProvider>
          <AuthProvider>
            <OrganizationProvider>{children}</OrganizationProvider>
          </AuthProvider>
          <NotificationViewport />
        </NotificationProvider>
      </QueryProvider>
    </BrowserRouter>
  )
}
