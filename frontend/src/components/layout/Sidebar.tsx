import { Link, NavLink } from 'react-router-dom'
import type { NavigationItem } from '../../config/navigation'
import { isNavigationItemActive } from '../../config/navigation'
import { SupervisorLogo } from '../ui/SupervisorLogo'

interface SidebarProps {
  activePath: string
  items: NavigationItem[]
  onNavigate?: () => void
  /** `rail` collapses to a 72px icon rail between 1024 and 1279px; `full` always shows labels. */
  variant?: 'rail' | 'full'
}

export function Sidebar({ activePath, items, onNavigate, variant = 'rail' }: SidebarProps) {
  const isRail = variant === 'rail'

  return (
    <div className="flex h-full flex-col gap-1 px-3 py-5 xl:px-4">
      <Link
        aria-label="Supervisor AI home"
        className={['mb-4 flex rounded-control px-2', isRail ? 'justify-center xl:justify-start' : ''].join(' ')}
        onClick={onNavigate}
        to="/dashboard"
      >
        {isRail ? (
          <>
            <SupervisorLogo className="xl:hidden" compact />
            <SupervisorLogo className="hidden xl:flex" />
          </>
        ) : (
          <SupervisorLogo />
        )}
      </Link>

      <nav aria-label="Main">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((item) => {
            const isActive = isNavigationItemActive(item.href, activePath)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <NavLink
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex min-h-10 items-center gap-2.5 rounded-control px-3 text-sm font-medium no-underline transition',
                    isRail ? 'justify-center xl:justify-start' : '',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-text-secondary hover:bg-primary-50 hover:text-text-primary',
                  ].join(' ')}
                  onClick={onNavigate}
                  title={isRail ? item.label : undefined}
                  to={item.href}
                >
                  <Icon aria-hidden="true" className={item.ai && !isActive ? 'text-ai-fg' : ''} size={18} />
                  <span className={isRail ? 'sr-only xl:not-sr-only' : ''}>{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
