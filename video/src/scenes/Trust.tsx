import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { SupervisorLogo } from '../components/app.ts'
import { ChannelList } from '../components/chat.tsx'
import { PersonAvatar } from '../components/PersonAvatar.tsx'
import { Enter, Headline, Stage } from '../components/primitives.tsx'
import { AISHA, PROJECT_TASKS, SAM } from '../data/demo.ts'
import type { Person } from '../data/demo.ts'
import { AVATAR_SIZE, variantOn } from '../data/surfaces.ts'
import { COLORS, STAGGER, progress, sec } from '../theme.ts'

/** One side of the split: whose view it is (their own avatar, as their header shows it), channels, tasks. */
function View({ hiddenOpacity, label, viewer }: { hiddenOpacity: number; label: string; viewer: Person }) {
  const isEmployee = viewer.role === 'employee'
  return (
    <section className="flex flex-1 flex-col gap-4 rounded-card border border-border-default bg-surface-canvas p-4 shadow-overlay">
      <header className="flex items-center gap-3 rounded-control bg-surface-card px-3 py-2">
        <PersonAvatar name={viewer.name} size={AVATAR_SIZE.ownHeader} variant={variantOn('ownHeader', viewer.avatarVariant)} />
        <span className="flex flex-col">
          <span className="body-strong text-text-primary">{viewer.name}</span>
          <span className="helper text-text-tertiary">{label}</span>
        </span>
      </header>
      <div className="flex gap-4">
        <ChannelList active="scanner" hiddenOpacity={isEmployee ? hiddenOpacity : 1} viewer={isEmployee ? 'employee' : 'manager'} />
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-2 p-0">
          <li className="label px-1 text-text-tertiary">Tasks</li>
          {PROJECT_TASKS.map((task) => {
            const own = task.owner.id === viewer.id
            return (
              <li
                className="flex items-center gap-2 rounded-control border border-border-default bg-surface-card px-3 py-2"
                key={task.title}
                style={{ opacity: !isEmployee || own ? 1 : hiddenOpacity }}
              >
                <PersonAvatar name={task.owner.name} size={AVATAR_SIZE.taskBoard} variant={variantOn('taskBoard', task.owner.avatarVariant)} />
                <span className="body min-w-0 flex-1 truncate text-text-primary">{task.title}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Split() {
  const frame = useCurrentFrame()
  const fade = 1 - progress(frame, 24, 12)
  return (
    <div className="flex gap-6 pt-6">
      <Enter at={0} style={{ flex: 1, display: 'flex' }}><View hiddenOpacity={1} label="Manager view" viewer={SAM} /></Enter>
      <Enter at={STAGGER * 2} style={{ flex: 1, display: 'flex' }}><View hiddenOpacity={fade} label="Employee view" viewer={AISHA} /></Enter>
    </div>
  )
}

function TitleCard() {
  const frame = useCurrentFrame()
  const words = [['AI recommends.', 0], ['You decide.', 15]] as const
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 28, flexDirection: 'column' }}>
      <SupervisorLogo />
      <p className="m-0 flex gap-6 font-semibold tracking-tight" style={{ color: COLORS.ink, fontSize: 96 }}>
        {words.map(([word, at]) => (
          <span key={word} style={{ opacity: progress(frame, at, 9), transform: `translateY(${(1 - progress(frame, at, 9)) * 14}px)` }}>{word}</span>
        ))}
      </p>
    </AbsoluteFill>
  )
}

export function Trust() {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={sec(3.9)} layout="none">
        <Headline>Employees see only their own work</Headline>
        <Stage><Split /></Stage>
      </Sequence>
      <Sequence from={sec(3.9)} layout="none"><TitleCard /></Sequence>
    </AbsoluteFill>
  )
}
