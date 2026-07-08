import { Link, NavLink } from 'react-router-dom'
import { SupervisorLogo } from '../ui/SupervisorLogo'

export interface NavigationItem {
  href: string
  label: string
}

interface SidebarProps {
  activeHref?: string
  items: NavigationItem[]
}

export function Sidebar({ activeHref = '/dashboard', items }: SidebarProps) {
  return (
    <aside className="border-b border-border-subtle bg-surface-card lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-5 p-4 lg:p-5">
        <Link
          className="rounded-md focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary-300"
          to="/dashboard"
        >
          <SupervisorLogo />
        </Link>

        <nav aria-label="Primary navigation">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {items.map((item) => {
              const isActive = item.href === activeHref

              return (
                <li key={item.href}>
                  <NavLink
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'flex min-h-10 items-center rounded-md px-3 text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300',
                      isActive
                        ? 'bg-glass-tinted text-primary-700 ring-1 ring-border-primary'
                        : 'text-ink-700 hover:bg-surface-muted hover:text-ink-900',
                    ].join(' ')}
                    to={item.href}
                  >
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
