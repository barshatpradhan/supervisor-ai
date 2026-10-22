import { FileText, Sparkles } from 'lucide-react'
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { AppFrame } from '../components/AppFrame.tsx'
import { Chip, StatusBadge } from '../components/app.ts'
import { Enter, Headline, Stage, useCount } from '../components/primitives.tsx'
import { ANALYSIS, DOCUMENT, PROJECT, SAM } from '../data/demo.ts'
import { STAGGER, progress, sec } from '../theme.ts'

function UploadCard() {
  const frame = useCurrentFrame()
  const drop = progress(frame, 0, 12)
  const fill = progress(frame, 14, 36)
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border-default bg-surface-card p-6 shadow-card" style={{ width: 620 }}>
      <p className="section-title m-0 text-text-primary">Project documents</p>
      <div className="flex items-center gap-3 rounded-control border border-dashed border-border-strong bg-surface-inset p-4" style={{ opacity: drop, transform: `translateY(${(1 - drop) * -40}px)` }}>
        <FileText aria-hidden="true" className="text-text-secondary" size={20} />
        <div className="min-w-0 flex-1">
          <p className="body-strong m-0 truncate text-text-primary">{DOCUMENT.name}</p>
          <p className="helper m-0 text-text-tertiary">{DOCUMENT.size}</p>
        </div>
        <StatusBadge status={fill < 1 ? 'pending' : 'extracted'} />
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-chart-track">
        <div className="h-full rounded-pill bg-chart-1" style={{ width: `${fill * 100}%` }} />
      </div>
    </section>
  )
}

function AnalysisCard({ showDetails }: { showDetails: boolean }) {
  const frame = useCurrentFrame()
  const hours = useCount(0, 0, ANALYSIS.estimatedHours, 24)
  const skills = [
    ...ANALYSIS.requiredSkills.map((skill) => ({ skill, tone: 'ai' as const })),
    ...ANALYSIS.preferredSkills.map((skill) => ({ skill, tone: 'neutral' as const })),
  ]
  return (
    <section className="flex flex-col gap-4 rounded-card border border-ai-border bg-surface-card p-6 shadow-overlay" style={{ width: 720 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-pill bg-ai-bg text-ai-fg"><Sparkles size={16} /></span>
          <div>
            <p className="section-title m-0 text-text-primary">AI analysis</p>
            <p className="helper m-0 text-text-tertiary">From {DOCUMENT.name}</p>
          </div>
        </div>
        {showDetails ? <span className="stat-md text-text-primary">{Math.round(hours)}h</span> : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className="label text-text-secondary">Required and preferred skills</span>
        <div className="flex flex-wrap gap-2">
          {skills.map(({ skill, tone }, index) => (
            <span key={skill} style={{ opacity: progress(frame, showDetails ? 0 : 10 + index * STAGGER * 2, 8), transform: `scale(${0.9 + 0.1 * progress(frame, showDetails ? 0 : 10 + index * STAGGER * 2, 10)})`, display: 'inline-block' }}>
              <Chip tone={tone}>{skill}</Chip>
            </span>
          ))}
        </div>
      </div>
      {showDetails ? (
        <Enter at={4}>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2"><Chip tone="ai">{ANALYSIS.complexity}</Chip><Chip tone="ai">{ANALYSIS.estimatedHours}h estimated</Chip></div>
            <p className="body m-0 text-text-primary">{ANALYSIS.summary}</p>
          </div>
        </Enter>
      ) : null}
    </section>
  )
}

export function DocumentScene() {
  return (
    <AbsoluteFill>
      <Stage>
        <AppFrame title={PROJECT} viewer={SAM}>
          <Sequence durationInFrames={sec(3.8)} layout="none">
            <div className="flex justify-center pt-16"><UploadCard /></div>
          </Sequence>
          <Sequence durationInFrames={sec(3.8)} from={sec(3.8)} layout="none">
            <Enter at={0} style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><AnalysisCard showDetails={false} /></Enter>
          </Sequence>
          <Sequence from={sec(7.6)} layout="none">
            <div className="flex justify-center pt-10"><AnalysisCard showDetails /></div>
          </Sequence>
        </AppFrame>
      </Stage>
      <Sequence durationInFrames={sec(3.8)} layout="none"><Headline>Drop in the requirements document</Headline></Sequence>
      <Sequence durationInFrames={sec(3.8)} from={sec(3.8)} layout="none"><Headline tone="ai">AI extracts the skills</Headline></Sequence>
      <Sequence from={sec(7.6)} layout="none"><Headline tone="ai">Complexity, hours and a short summary</Headline></Sequence>
    </AbsoluteFill>
  )
}
