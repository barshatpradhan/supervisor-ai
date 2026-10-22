import { LogOut, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

interface HeaderProps {
  leading?: ReactNode
  onOpenNavigation: () => void
  onSignOut: () => void
  /** The signed-in user's chosen avatar ID; null shows initials. */
  userAvatarVariant?: string | null
  userEmail: string | null
  /** App user ID: keeps the initials colour stable across renames. */
  userId?: string | null
  /** Profile name; the avatar and label fall back to the email until it loads. */
  userName?: string | null
}

/** The 64px top bar: workspace switcher on the left, the signed-in user on the right. */
export function Header({ leading, onOpenNavigation, onSignOut, userAvatarVariant = null, userEmail, userId = null, userName = null }: HeaderProps) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border-default bg-surface-card px-4 py-3 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button aria-label="Open navigation" className="min-h-11 min-w-11 px-0 lg:hidden" onClick={onOpenNavigation} variant="ghost">
          <Menu aria-hidden="true" size={20} />
        </Button>
        {leading}
      </div>
      <div className="flex items-center gap-3">
        <Avatar fallbackKey={userId} name={userName ?? userEmail} size={36} variant={userAvatarVariant} />
        {userName || userEmail ? (
          <span className="hidden min-w-0 flex-col md:flex">
            <span className="body-strong max-w-56 truncate text-text-primary">{userName ?? userEmail}</span>
            {userName && userEmail ? <span className="helper max-w-56 truncate text-text-tertiary">{userEmail}</span> : null}
          </span>
        ) : null}
        <Button className="gap-2" onClick={onSignOut} variant="secondary">
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </Button>
      </div>
    </header>
  )
}
