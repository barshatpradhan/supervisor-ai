import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

/** The human-in-the-loop line. Show it once per AI region. */
export function AiNote({ children = 'AI suggestion. A person makes the final call.' }: { children?: ReactNode }) {
  return (
    <p className="helper m-0 inline-flex items-center gap-1.5 rounded-sm bg-ai-bg px-3 py-2 text-ai-fg">
      <Sparkles aria-hidden="true" size={14} />
      {children}
    </p>
  )
}
