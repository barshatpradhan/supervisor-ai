import { LogOut, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

interface HeaderProps {
  leading?: ReactNode
  onOpenNavigation: () => void
  onSignOut: () => void
  userEmail: string | null
}

/** The 64px top bar: workspace switcher on the left, the signed-in user on the right. */
export function Header({ leading, onOpenNavigation, onSignOut, userEmail }: HeaderProps) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border-default bg-surface-card px-4 py-3 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button aria-label="Open navigation" className="min-h-11 min-w-11 px-0 lg:hidden" onClick={onOpenNavigation} variant="ghost">
          <Menu aria-hidden="true" size={20} />
        </Button>
        {leading}
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={userEmail} size={36} />
        {userEmail ? <span className="body hidden max-w-56 truncate text-text-secondary md:inline">{userEmail}</span> : null}
        <Button className="gap-2" onClick={onSignOut} variant="secondary">
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </Button>
      </div>
    </header>
  )
}
