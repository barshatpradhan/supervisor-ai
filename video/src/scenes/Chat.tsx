import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { AppFrame } from '../components/AppFrame.tsx'
import { ChannelList, ChatMessage, Mention, ProgressForm, SentBanner, Thread } from '../components/chat.tsx'
import type { ChipData } from '../components/chat.tsx'
import { Cursor, Enter, Stage, useCount } from '../components/primitives.tsx'
import { AISHA, MARCUS, NEW_TASK, PROGRESS_REQUEST_TEXT, SAM, TASK_PROGRESS } from '../data/demo.ts'
import { progress, sec } from '../theme.ts'

const chip = (percent: number): ChipData => ({
  accessible: true,
  taskId: NEW_TASK.id,
  title: NEW_TASK.title,
  status: 'in_progress',
  progressPercent: percent,
  assignee: { userId: AISHA.id, name: AISHA.name } as Extract<ChipData, { accessible: true }>['assignee'],
})

function ProjectChannel({ askAt, bannerFrom }: { askAt?: number; bannerFrom?: number }) {
  const frame = useCurrentFrame()
  return (
    <div className="relative flex h-full gap-4">
      <ChannelList active="scanner" viewer="manager" />
      <Thread banner={bannerFrom !== undefined && frame >= bannerFrom ? <Enter at={bannerFrom} lift={-8}><SentBanner name={AISHA.name} /></Enter> : undefined} title="# scanner-rollout">
        <ChatMessage author={MARCUS} body="Label printers are done. Moving to review." time="9:12" />
        <ChatMessage author={AISHA} body="Starting the inventory endpoints this week." chip={chip(TASK_PROGRESS.first)} onAsk testId="aisha-tag" time="9:20" />
      </Thread>
      {askAt !== undefined ? <Cursor appearAt={0} clickAt={askAt} target='[data-msg="aisha-tag"] button' /> : null}
    </div>
  )
}

function DirectMessage({ percent, showButton, clickAt }: { percent: number; showButton: boolean; clickAt?: number }) {
  return (
    <div className="relative flex h-full gap-4">
      <ChannelList active="dm-aisha" viewer="employee" />
      <Thread title="Sam Carter">
        <ChatMessage author={SAM} body={<><Mention name={AISHA.name} /> {PROGRESS_REQUEST_TEXT}</>} chip={chip(percent)} time="9:31">
          {showButton ? (
            <span className="mt-2 inline-flex min-h-8 items-center rounded-control bg-primary-600 px-3 text-sm font-semibold text-text-on-primary" data-target="update-progress">Update progress</span>
          ) : null}
        </ChatMessage>
      </Thread>
      {clickAt !== undefined ? <Cursor appearAt={0} clickAt={clickAt} target='[data-target="update-progress"]' /> : null}
    </div>
  )
}

function FormBeat() {
  const frame = useCurrentFrame()
  const percent = useCount(6, TASK_PROGRESS.first, TASK_PROGRESS.afterForm, 18)
  const submitAt = 40
  const closed = progress(frame, submitAt + 6, 8)
  const saved = frame >= submitAt + 6
  return (
    <div className="relative h-full">
      <DirectMessage percent={saved ? TASK_PROGRESS.afterForm : TASK_PROGRESS.first} showButton />
      <div className="absolute inset-0 flex items-start justify-center bg-surface-overlay pt-12" style={{ opacity: 1 - closed }}>
        <ProgressForm note={TASK_PROGRESS.note} percent={percent} taskTitle={NEW_TASK.title} />
      </div>
      <Cursor appearAt={20} clickAt={submitAt} from={{ x: 700, y: 300 }} target='[data-target="submit-progress"]' />
    </div>
  )
}

export function Chat() {
  return (
    <AbsoluteFill>
      <Stage>
        {/* 39.3-42.3: Sam's project channel. */}
        <Sequence durationInFrames={sec(3)} layout="none">
          <AppFrame title="Messages" viewer={SAM}><ProjectChannel /></AppFrame>
        </Sequence>
        {/* 42.3-44.4: Ask for update posts in a DM and says so; chat never changes task data. */}
        <Sequence durationInFrames={sec(2.1)} from={sec(3)} layout="none">
          <AppFrame title="Messages" viewer={SAM}><ProjectChannel askAt={34} bannerFrom={38} /></AppFrame>
        </Sequence>
        {/* 44.4-46.4: Aisha's DM: the request, the chip, and her Update progress button. */}
        <Sequence durationInFrames={sec(2)} from={sec(5.1)} layout="none">
          <AppFrame title="Messages" viewer={AISHA}><DirectMessage clickAt={38} percent={TASK_PROGRESS.first} showButton /></AppFrame>
        </Sequence>
        {/* 46.4-49.1: the progress form is what changes the task; the chip then reads 60%. */}
        <Sequence from={sec(7.1)} layout="none">
          <AppFrame title="Messages" viewer={AISHA}><FormBeat /></AppFrame>
        </Sequence>
      </Stage>
    </AbsoluteFill>
  )
}
