import { CheckCircle2, Hash, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { CHANNELS, DIRECT_MESSAGES } from '../data/demo.ts'
import type { Person } from '../data/demo.ts'
import { AVATAR_SIZE, variantOn } from '../data/surfaces.ts'
import { TaskChip } from './app.ts'
import { PersonAvatar } from './PersonAvatar.tsx'

export type ChipData = Parameters<typeof TaskChip>[0]['chip']

/** Sidebar of channels and direct messages. `viewer` decides what is visible, as access rules do. */
export function ChannelList({ active, hiddenOpacity, viewer }: { active: string; hiddenOpacity?: number; viewer: 'manager' | 'employee' }) {
  // Rows Aisha can't see: fully shown for the manager, hidden for her (or mid-fade when given).
  const rowOpacity = (visibleToAisha: boolean) => (visibleToAisha ? 1 : hiddenOpacity ?? (viewer === 'employee' ? 0 : 1))
  return (
    <nav className="flex w-60 shrink-0 flex-col gap-4 rounded-card border border-border-default bg-surface-card p-3">
      <div className="flex flex-col gap-1">
        <span className="label px-2 text-text-tertiary">Channels</span>
        {CHANNELS.map((channel) => (
          <span
            className={['flex items-center gap-2 rounded-control px-2 py-1.5 text-sm', channel.id === active ? 'bg-primary-50 font-semibold text-primary-800' : 'text-text-primary'].join(' ')}
            key={channel.id}
            style={{ opacity: rowOpacity(channel.visibleToAisha) }}
          >
            <Hash aria-hidden="true" size={14} />
            {channel.title}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="label px-2 text-text-tertiary">Direct messages</span>
        {DIRECT_MESSAGES.map((dm) => {
          const title = viewer === 'employee' && dm.visibleToAisha ? 'Sam Carter' : dm.with.name
          return (
            <span
              className={['flex items-center gap-2 rounded-control px-2 py-1.5 text-sm', dm.id === active ? 'bg-primary-50 font-semibold text-primary-800' : 'text-text-primary'].join(' ')}
              key={dm.id}
              style={{ opacity: rowOpacity(dm.visibleToAisha) }}
            >
              {/* ConversationList passes the conversation title, never a variant. */}
              <PersonAvatar name={title} size={AVATAR_SIZE.conversationList} variant={variantOn('conversationList', null)} />
              {title}
            </span>
          )
        })}
      </div>
    </nav>
  )
}

/** One message as MessageItem lays it out: 32 px sender avatar, name, time, body, optional task chip. */
export function ChatMessage({ author, body, chip, children, time, onAsk, testId }: { author: Person; body: ReactNode; chip?: ChipData; children?: ReactNode; time: string; onAsk?: boolean; testId?: string }) {
  return (
    <div className="flex gap-3 py-2" data-msg={testId}>
      <PersonAvatar name={author.name} size={AVATAR_SIZE.messageSenders} variant={variantOn('messageSenders', author.avatarVariant)} />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-text-primary">{author.name}</span>
          <span className="text-xs text-text-tertiary">{time}</span>
        </p>
        <p className="m-0 mt-0.5 text-sm text-text-primary">{body}</p>
        {chip ? (
          <MemoryRouter>
            <TaskChip chip={chip} onAskForUpdate={onAsk ? () => {} : undefined} />
          </MemoryRouter>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export const Mention = ({ name }: { name: string }) => <span className="rounded px-0.5 font-semibold text-primary-700">@{name}</span>

/** The "Sent to … in a direct message." banner from MessageThread after Ask for update. */
export function SentBanner({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border-default bg-primary-50 px-4 py-2 text-sm text-primary-800" role="status">
      <CheckCircle2 aria-hidden="true" size={16} />
      <span className="flex-1">
        Sent to {name} in a direct message. <span className="font-semibold text-primary-700 underline">Open conversation</span>
      </span>
      <X aria-hidden="true" size={14} />
    </div>
  )
}

/** The thread panel: title bar, optional banner, messages. */
export function Thread({ banner, children, title }: { banner?: ReactNode; children: ReactNode; title: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border-default bg-surface-card">
      <header className="flex items-center gap-2 border-b border-border-default px-4 py-3">
        <h2 className="m-0 truncate text-base font-semibold text-text-primary">{title}</h2>
      </header>
      {banner}
      <div className="flex flex-col px-4 py-2">{children}</div>
    </section>
  )
}

/** The task's progress form (opened by "Update progress"): percentage, note and submit. */
export function ProgressForm({ note, percent, taskTitle }: { note: string; percent: number; taskTitle: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border-default bg-surface-card p-5 shadow-overlay" style={{ width: 460 }}>
      <div>
        <p className="section-title m-0 text-text-primary">Update progress</p>
        <p className="helper m-0 text-text-tertiary">{taskTitle}</p>
      </div>
      <label className="flex flex-col gap-2">
        <span className="label text-text-secondary">Progress</span>
        <span className="flex items-center gap-3">
          <span className="relative h-2 flex-1 rounded-pill bg-chart-track">
            <span className="absolute inset-y-0 left-0 rounded-pill bg-chart-1" style={{ width: `${percent}%` }} />
            <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-primary-600 bg-surface-card" style={{ left: `${percent}%` }} />
          </span>
          <span className="num-sm w-12 text-right text-text-primary">{Math.round(percent)}%</span>
        </span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="label text-text-secondary">Note</span>
        <span className="body rounded-control border border-border-default bg-surface-card px-3 py-2 text-text-primary">{note}</span>
      </label>
      <div className="flex justify-end">
        <span className="inline-flex min-h-10 items-center rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary" data-target="submit-progress">Save progress</span>
      </div>
    </section>
  )
}
