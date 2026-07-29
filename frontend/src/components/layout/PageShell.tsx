import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog } from '../ui/Dialog'
import { Header } from './Header'
import type { NavigationItem } from './Sidebar'
import { Sidebar } from './Sidebar'

interface PageShellProps {
  actions?: ReactNode
  activeHref?: string
  children: ReactNode
  eyebrow?: string
  navigationItems: NavigationItem[]
  sidebarContent?: ReactNode
  title: string
}

export function PageShell({
  actions,
  activeHref,
  children,
  eyebrow,
  navigationItems,
  sidebarContent,
  title,
}: PageShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-page text-ink-900 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar activeHref={activeHref} className="hidden lg:block" items={navigationItems}>
        {sidebarContent}
      </Sidebar>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-3 lg:hidden">
          <span className="text-sm font-semibold text-text-primary">Workspace</span>
          <DialogPrimitive.Root onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
            <DialogPrimitive.Trigger asChild><Button aria-label="Open navigation" variant="ghost"><Menu aria-hidden="true" size={18} /></Button></DialogPrimitive.Trigger>
            <Dialog title="Navigation">
              <Sidebar activeHref={activeHref} items={navigationItems} onNavigate={() => setMobileNavOpen(false)}>{sidebarContent}</Sidebar>
            </Dialog>
          </DialogPrimitive.Root>
        </div>
        <Header actions={actions} eyebrow={eyebrow} title={title} />
        {children}
      </div>
    </div>
  )
}
