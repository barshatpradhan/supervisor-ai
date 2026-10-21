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
                  aria-label={item.badge ? `${item.label}, ${item.badge} unread` : undefined}
                  title={isRail ? item.label : undefined}
                  to={item.href}
                >
                  <span className="relative inline-flex">
                    <Icon aria-hidden="true" className={item.ai && !isActive ? 'text-ai-fg' : ''} size={18} />
                    {item.badge && isRail ? (
                      <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 size-2.5 rounded-pill bg-primary-600 ring-2 ring-surface-card xl:hidden" />
                    ) : null}
                  </span>
                  <span className={isRail ? 'sr-only xl:not-sr-only' : ''}>{item.label}</span>
                  {item.badge ? (
                    <span
                      aria-hidden="true"
                      className={[
                        'ml-auto min-w-5 rounded-pill bg-primary-600 px-1.5 text-center text-xs font-semibold leading-5 text-text-on-primary',
                        isRail ? 'hidden xl:inline-block' : 'inline-block',
                      ].join(' ')}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
