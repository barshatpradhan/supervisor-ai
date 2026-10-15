import type { KeyboardEvent } from 'react'
import { useRef } from 'react'

interface SegmentedProps<TValue extends string> {
  label: string
  onChange: (value: TValue) => void
  options: readonly { id: TValue; label: string }[]
  value: TValue
}

/** A two- or three-option switch, built as a radio group with arrow-key support. */
export function Segmented<TValue extends string>({ label, onChange, options, value }: SegmentedProps<TValue>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const nextIndex = (index + step + options.length) % options.length
    onChange(options[nextIndex].id)
    refs.current[nextIndex]?.focus()
  }

  return (
    <div aria-label={label} className="inline-flex gap-0.5 rounded-control border border-border-strong bg-surface-muted p-[3px]" role="radiogroup">
      {options.map((option, index) => {
        const checked = option.id === value
        return (
          <button
            aria-checked={checked}
            className={[
              'label min-h-9 rounded-sm px-3.5 transition',
              checked ? 'bg-surface-card text-text-primary shadow-card' : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
            key={option.id}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => { refs.current[index] = element }}
            role="radio"
            tabIndex={checked ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
