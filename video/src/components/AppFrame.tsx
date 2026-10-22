import type { ReactNode } from 'react'
import type { Person } from '../data/demo.ts'
import { variantOn } from '../data/surfaces.ts'
import { Header } from './app.ts'

const noop = () => {}

/** The app shell as the viewer sees it: the real Header (with the viewer's own avatar) over a page. */
export function AppFrame({ children, title, viewer }: { children: ReactNode; title: string; viewer: Person }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border-default bg-surface-canvas shadow-overlay">
      <Header
        leading={<span className="section-title text-text-primary">{title}</span>}
        onOpenNavigation={noop}
        onSignOut={noop}
        userAvatarVariant={variantOn('ownHeader', viewer.avatarVariant)}
        userEmail={viewer.email}
        userId={viewer.id}
        userName={viewer.name}
      />
      <div className="relative min-h-0 flex-1 p-6">{children}</div>
    </div>
  )
}
