import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { EMOJI_GROUPS } from '../utils/emoji'

interface EmojiPickerProps {
  /** Accessible name of the button that opens the picker, e.g. "Insert emoji". */
  label: string
  onSelect: (emoji: string) => void
  children: ReactNode
  align?: 'start' | 'end'
  buttonClassName?: string
}

/** The curated native emoji set in a small popover. Escape or a click outside closes it. */
export function EmojiPicker({ align = 'start', buttonClassName = '', children, label, onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className={[
          'inline-flex size-9 items-center justify-center rounded-control text-text-secondary transition hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          buttonClassName,
        ].join(' ')}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        title={label}
        type="button"
      >
        {children}
      </button>
      {open ? (
        <div
          aria-label="Emoji"
          className={[
            'absolute bottom-full z-30 mb-2 max-h-72 w-72 overflow-y-auto rounded-card border border-border-default bg-surface-card p-2 shadow-overlay',
            align === 'end' ? 'right-0' : 'left-0',
          ].join(' ')}
          id={panelId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              close()
            }
          }}
          role="dialog"
        >
          {EMOJI_GROUPS.map((group) => (
            <div className="mb-2" key={group.label} role="group" aria-label={group.label}>
              <p className="label m-0 px-1 pb-1 text-text-tertiary">{group.label}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {group.emoji.map((option) => (
                  <button
                    aria-label={option.name}
                    className="inline-flex size-8 items-center justify-center rounded-control text-lg hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-focus-ring"
                    key={option.char}
                    onClick={() => {
                      onSelect(option.char)
                      close()
                    }}
                    title={option.name}
                    type="button"
                  >
                    <span aria-hidden="true">{option.char}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
