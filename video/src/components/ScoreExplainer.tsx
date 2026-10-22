import { Sparkles } from 'lucide-react'
import { useCurrentFrame } from 'remotion'
import type { RECOMMENDATIONS } from '../data/demo.ts'
import { STAGGER, mix, progress } from '../theme.ts'
import { RadialScore } from './app.ts'
import { PersonAvatar } from './PersonAvatar.tsx'
import { AVATAR_SIZE, variantOn } from '../data/surfaces.ts'

/**
 * "How the score is built": a video-only explainer of the stored score breakdown. Each factor's
 * value, its weight and its contribution; the contributions add up to the match score.
 */
export function ScoreExplainer({ entry }: { entry: (typeof RECOMMENDATIONS)[number] }) {
  const frame = useCurrentFrame()
  const total = entry.breakdown.reduce((sum, part) => sum + part.contribution, 0)
  const sumAt = 12 + entry.breakdown.length * STAGGER * 3 + 18
  const shownTotal = mix(progress(frame, sumAt, 18), 0, total)

  return (
    <section className="flex flex-col gap-5 rounded-card border border-ai-border bg-surface-card p-6 shadow-overlay" style={{ width: 860 }}>
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PersonAvatar name={entry.person.name} size={AVATAR_SIZE.recommendations} variant={variantOn('recommendations', entry.person.avatarVariant)} />
          <div>
            <p className="section-title m-0 flex items-center gap-2 text-text-primary">
              <Sparkles aria-hidden="true" className="text-ai-fg" size={16} />
              How the score is built
            </p>
            <p className="helper m-0 text-text-tertiary">{entry.person.name} · weights 50 / 15 / 15 / 10 / 5 / 5</p>
          </div>
        </div>
        <RadialScore color="chart-ai" label="Match score" size={72} value={shownTotal} />
      </header>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {entry.breakdown.map((part, index) => {
          const at = 12 + index * STAGGER * 3
          const p = progress(frame, at, 15)
          return (
            <li className="grid items-center gap-4" key={part.key} style={{ gridTemplateColumns: '170px 1fr 64px 70px 80px', opacity: progress(frame, at - 4, 8) }}>
              <span className="body text-text-primary">{part.label}</span>
              <span className="relative h-2.5 rounded-pill bg-chart-track">
                <span className="absolute inset-y-0 left-0 rounded-pill bg-chart-ai" style={{ width: `${(part.score ?? 0) * p}%` }} />
              </span>
              <span className="num-sm text-right text-text-primary">{Math.round((part.score ?? 0) * p)}</span>
              <span className="num-sm text-right text-text-tertiary">× {part.weight}%</span>
              <span className="num-sm text-right font-semibold text-ai-fg">+{(part.contribution * p).toFixed(2)}</span>
            </li>
          )
        })}
      </ul>
      <footer className="flex items-center justify-between border-t border-chart-grid pt-4" style={{ opacity: progress(frame, sumAt - 4, 8) }}>
        <span className="label text-text-secondary">Match score</span>
        <span className="text-2xl font-semibold text-text-primary" style={{ fontFamily: 'var(--font-mono)' }}>{shownTotal.toFixed(2)}</span>
      </footer>
    </section>
  )
}
