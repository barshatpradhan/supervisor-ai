import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { SupervisorLogo } from '../components/app.ts'
import { COLORS, progress, sec } from '../theme.ts'
import { headerStyle } from '../typography.ts'

export const TAGLINE = 'Staff projects with AI you can check.'
export const CTA = 'Create your organization'
/** Replace before rendering the final cut. */
export const WEBSITE_URL = '[PLACEHOLDER: website URL]'

function Payoff() {
  const frame = useCurrentFrame()
  const lines = ['Right person.', 'Right project.', 'Less guesswork.']
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="flex flex-col items-center gap-2">
        {lines.map((line, index) => {
          const p = progress(frame, index * 9, 12)
          return <p className="m-0" key={line} style={{ color: COLORS.ink, ...headerStyle('title'), opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>{line}</p>
        })}
      </div>
    </AbsoluteFill>
  )
}

function EndCard() {
  const p = progress(useCurrentFrame(), 0, 12)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: p }}>
      <div className="flex flex-col items-center gap-7" style={{ transform: `scale(${0.98 + 0.02 * p})` }}>
        <div style={{ transform: 'scale(2.4)' }}><SupervisorLogo /></div>
        <p className="m-0 mt-6" style={{ color: COLORS.ink, ...headerStyle('tagline') }}>{TAGLINE}</p>
        <span className="inline-flex items-center rounded-control font-semibold" style={{ background: COLORS.primary, color: '#fff', fontSize: 34, padding: '18px 34px' }}>{CTA}</span>
        <p className="m-0" style={{ color: '#4a4a44', fontSize: 30, fontFamily: 'var(--font-mono)' }}>{WEBSITE_URL}</p>
      </div>
    </AbsoluteFill>
  )
}

export function Cta() {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={sec(3.2)} layout="none"><Payoff /></Sequence>
      <Sequence from={sec(3.2)} layout="none"><EndCard /></Sequence>
    </AbsoluteFill>
  )
}
