import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { NavigationItem } from '../../config/navigation'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface PageShellProps {
  activePath: string
  children: ReactNode
  headerLeading?: ReactNode
  navigationItems: NavigationItem[]
  onSignOut: () => void
  userAvatarVariant?: string | null
  userEmail: string | null
  userId?: string | null
  userName?: string | null
}

/**
 * The page frame: a 232px sidebar (a 72px icon rail from 1024 to 1279px, a drawer below
 * 1024px), a 64px top bar and the canvas content area.
 */
export function PageShell({ activePath, children, headerLeading, navigationItems, onSignOut, userAvatarVariant = null, userEmail, userId = null, userName = null }: PageShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary lg:grid lg:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border-default bg-surface-card lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <Sidebar activePath={activePath} items={navigationItems} />
      </aside>

      <DialogPrimitive.Root onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-surface-overlay lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[min(85vw,280px)] overflow-y-auto border-r border-border-default bg-surface-card shadow-overlay focus:outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="absolute right-3 top-4 inline-flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-muted"
            >
              <X aria-hidden="true" size={18} />
            </DialogPrimitive.Close>
            <Sidebar activePath={activePath} items={navigationItems} onNavigate={() => setMobileNavOpen(false)} variant="full" />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-col">
        <Header leading={headerLeading} onOpenNavigation={() => setMobileNavOpen(true)} onSignOut={onSignOut} userAvatarVariant={userAvatarVariant} userEmail={userEmail} userId={userId} userName={userName} />
        {children}
      </div>
    </div>
  )
}
