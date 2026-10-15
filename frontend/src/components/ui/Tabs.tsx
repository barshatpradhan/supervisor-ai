import { Sparkles } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useRef } from 'react'

export interface TabItem<TId extends string> {
  ai?: boolean
  count?: number
  id: TId
  label: string
}

interface TabsProps<TId extends string> {
  idPrefix: string
  label: string
  onChange: (id: TId) => void
  tabs: readonly TabItem<TId>[]
  value: TId
}

/** Underline tabs. AI tabs carry the sparkles icon and an ai-fg underline. */
export function Tabs<TId extends string>({ idPrefix, label, onChange, tabs, value }: TabsProps<TId>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const nextIndex = (index + step + tabs.length) % tabs.length
    onChange(tabs[nextIndex].id)
    refs.current[nextIndex]?.focus()
  }

  return (
    <div className="overflow-x-auto overflow-y-hidden border-b border-border-default">
      <div aria-label={label} className="flex min-w-max gap-1" role="tablist">
        {tabs.map((tab, index) => {
          const selected = tab.id === value
          return (
            <button
              aria-controls={`${idPrefix}-panel`}
              aria-selected={selected}
              className={[
                'label -mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 transition',
                selected
                  ? tab.ai ? 'border-ai-fg text-ai-fg' : 'border-primary-600 text-primary-700'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              ].join(' ')}
              id={`${idPrefix}-tab-${tab.id}`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(element) => { refs.current[index] = element }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.ai ? <Sparkles aria-hidden="true" className={selected ? '' : 'text-ai-fg'} size={14} /> : null}
              {tab.label}
              {typeof tab.count === 'number' ? <span className="num-xs text-text-tertiary">{tab.count}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
