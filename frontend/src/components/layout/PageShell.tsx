import type { ReactNode } from 'react'
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
  return (
    <div className="min-h-screen bg-surface-page text-ink-900 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar activeHref={activeHref} items={navigationItems}>
        {sidebarContent}
      </Sidebar>
      <div className="min-w-0">
        <Header actions={actions} eyebrow={eyebrow} title={title} />
        {children}
      </div>
    </div>
  )
}
