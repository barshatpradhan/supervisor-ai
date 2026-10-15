import { Check, Sparkles, X } from 'lucide-react'
import type { ReactNode } from 'react'

type ChipTone = 'neutral' | 'ai' | 'match' | 'missing'

const toneClasses: Record<ChipTone, string> = {
  ai: 'bg-ai-bg text-ai-fg',
  match: 'bg-success-bg text-success-fg',
  missing: 'border border-border-strong bg-surface-card text-text-secondary',
  neutral: 'bg-surface-muted text-text-primary',
}

/** A small label for skills and roles. */
export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: ChipTone }) {
  return (
    <span className={`label inline-flex items-center gap-1 rounded-sm px-2.5 py-1 ${toneClasses[tone]}`}>
      {tone === 'match' ? <Check aria-hidden="true" size={13} /> : null}
      {tone === 'missing' ? <X aria-hidden="true" size={13} /> : null}
      {children}
    </span>
  )
}

/** The small violet tag that marks a title as AI output. */
export function AiBadge({ children = 'AI' }: { children?: ReactNode }) {
  return (
    <span className="helper inline-flex items-center gap-1 rounded-sm bg-ai-bg px-2 py-0.5 font-medium text-ai-fg">
      <Sparkles aria-hidden="true" size={12} />
      {children}
    </span>
  )
}
