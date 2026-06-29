import type { ReactNode } from 'react'

interface HeaderProps {
  actions?: ReactNode
  eyebrow?: string
  title: string
}

export function Header({ actions, eyebrow, title }: HeaderProps) {
  return (
    <header className="border-b border-border-subtle bg-glass-subtle backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-normal text-brand-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-normal text-ink-900 sm:text-3xl">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
