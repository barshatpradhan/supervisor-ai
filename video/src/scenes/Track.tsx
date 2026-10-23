import { AbsoluteFill, Sequence } from 'remotion'
import { AppFrame } from '../components/AppFrame.tsx'
import { Stage, useCount } from '../components/primitives.tsx'
import { ProjectProgress, TaskBoard, WorkloadList } from '../components/work.tsx'
import type { BoardCard } from '../components/work.tsx'
import { AISHA, BOARD_COUNTS, DANIEL, LENA, MARCUS, NEW_TASK, PROJECT, PROJECT_PROGRESS, SAM, TASK_PROGRESS, TOM, workloadOf } from '../data/demo.ts'
import { sec } from '../theme.ts'

const projectCards = (extra: Partial<Record<string, Partial<BoardCard>>> = {}): BoardCard[] => [
  { id: 'qa', title: 'Scanner QA pass', hours: 8, owner: TOM, column: 'todo', row: 0, ...extra.qa },
  { id: 'retry', title: 'Offline retry queue', hours: 16, owner: LENA, column: 'in_progress', row: 0, ...extra.retry },
  { id: 'label', title: 'Label printer integration', hours: 12, owner: MARCUS, column: 'review', row: 0, ...extra.label },
  { id: 'device', title: 'Device configuration', hours: 6, owner: DANIEL, column: 'completed', row: 0, ...extra.device },
  { id: 'v2', title: NEW_TASK.title, hours: NEW_TASK.hours, owner: AISHA, column: 'todo', row: 1, highlight: true, ...extra.v2 },
]

function AishaStarts() {
  const progressValue = useCount(14, 0, TASK_PROGRESS.first, 12)
  const cards: BoardCard[] = [
    { id: 'own', title: 'Inventory sync fixes', hours: 12, owner: AISHA, column: 'in_progress', row: 0 },
    { id: 'v2', title: NEW_TASK.title, hours: NEW_TASK.hours, owner: AISHA, column: 'in_progress', fromColumn: 'todo', movedAt: 26, row: 1, progress: progressValue, highlight: true },
  ]
  return <TaskBoard cards={cards} counts={{ todo: progressValue > 0.5 ? 0 : 1, in_progress: progressValue > 0.5 ? 2 : 1, review: 0, completed: 0 }} />
}

export function Track() {
  const aisha = workloadOf(AISHA)
  const aishaAfter = workloadOf(AISHA, NEW_TASK.hours)
  return (
    <AbsoluteFill>
      <Stage>
        {/* 29.4-32.4: the task lands on the board (Sam's view). */}
        <Sequence durationInFrames={sec(3)} layout="none">
          <AppFrame title="Tasks" viewer={SAM}>
            <TaskBoard cards={projectCards({ v2: { movedAt: 6 } })} counts={BOARD_COUNTS.assigned} />
          </AppFrame>
        </Sequence>
        {/* 32.4-35.0: workload updates. */}
        <Sequence durationInFrames={sec(2.6)} from={sec(3)} layout="none">
          <AppFrame title="Team" viewer={SAM}>
            <WorkloadList
              rows={[
                { person: AISHA, from: aisha.workload, to: aishaAfter.workload, changeAt: 8 },
                { person: LENA, from: workloadOf(LENA).workload, to: workloadOf(LENA).workload },
                { person: MARCUS, from: workloadOf(MARCUS).workload, to: workloadOf(MARCUS).workload },
                { person: DANIEL, from: workloadOf(DANIEL).workload, to: workloadOf(DANIEL).workload },
                { person: TOM, from: workloadOf(TOM).workload, to: workloadOf(TOM).workload },
              ]}
            />
          </AppFrame>
        </Sequence>
        {/* 35.0-37.1: Aisha reports 25% on her own task (her view); the project bar does not move. */}
        <Sequence durationInFrames={sec(2.1)} from={sec(5.6)} layout="none">
          <AppFrame title="My tasks" viewer={AISHA}>
            <AishaStarts />
          </AppFrame>
        </Sequence>
        {/* 37.1-39.3: a task completes, so project progress moves (completed hours only). */}
        <Sequence from={sec(7.7)} layout="none">
          <AppFrame title="Dashboard" viewer={SAM}>
            <div className="flex flex-col gap-5">
              <TaskBoard
                cards={[{ id: 'label', title: 'Label printer integration', hours: 12, owner: MARCUS, column: 'completed', fromColumn: 'review', movedAt: 8, row: 0 }]}
                counts={BOARD_COUNTS.labelPrinterDone}
                height={200}
              />
              <ProjectProgress
                changeAt={14}
                doneAfter={PROJECT_PROGRESS.tasksDoneAfter}
                doneBefore={PROJECT_PROGRESS.tasksDoneBefore}
                from={PROJECT_PROGRESS.afterAssignment}
                title={PROJECT}
                to={PROJECT_PROGRESS.afterLabelPrinter}
                total={PROJECT_PROGRESS.totalTasks}
              />
            </div>
          </AppFrame>
        </Sequence>
      </Stage>
    </AbsoluteFill>
  )
}
