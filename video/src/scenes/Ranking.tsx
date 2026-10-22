import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { AppFrame } from '../components/AppFrame.tsx'
import { RecommendationCard, StatusBadge } from '../components/app.ts'
import { Cursor, Headline, Stage } from '../components/primitives.tsx'
import { ScoreExplainer } from '../components/ScoreExplainer.tsx'
import { PROJECT, RECOMMENDATIONS, SAM, toBackendRecommendation } from '../data/demo.ts'
import { STAGGER, mix, progress, sec } from '../theme.ts'

const noop = () => {}
const AISHA_ID = RECOMMENDATIONS[0].person.id
const MARCUS_ENTRY = RECOMMENDATIONS.find((entry) => entry.person.name === 'Marcus Lee')!

/** The app's real RecommendationCard for each candidate, in a two-column grid. */
function CardGrid({ assigned = false, countFrom, focus }: { assigned?: boolean; countFrom?: number; focus?: (id: string) => number }) {
  const frame = useCurrentFrame()
  return (
    <div className="grid grid-cols-2 gap-4">
      {RECOMMENDATIONS.map((entry, index) => {
        const enter = countFrom === undefined ? 1 : progress(frame, countFrom + index * STAGGER, 12)
        const score = countFrom === undefined ? entry.score : mix(progress(frame, countFrom + 6 + index * STAGGER, 18), 0, entry.score)
        const isAssigned = assigned && entry.person.id === AISHA_ID
        return (
          <div
            className="relative"
            data-card={entry.person.id}
            key={entry.person.id}
            style={{ opacity: enter * (focus ? focus(entry.person.id) : 1), transform: `translateY(${(1 - enter) * 14}px)` }}
          >
            <RecommendationCard onAssign={isAssigned ? undefined : noop} rec={toBackendRecommendation(entry, score)} showNote={entry.rank === 1} />
            {isAssigned ? (
              <span className="absolute bottom-4 right-4"><StatusBadge label="Assigned" status="completed" /></span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function Ranking() {
  const onlyAisha = (id: string) => (id === AISHA_ID ? 1 : 0.25)
  return (
    <AbsoluteFill>
      <Stage>
        <AppFrame title={`${PROJECT} · AI recommendations`} viewer={SAM}>
          <div className="relative h-full overflow-hidden">
            {/* 17.0-20.3: the real cards, scores counting up. */}
            <Sequence durationInFrames={sec(3.3)} layout="none"><CardGrid countFrom={0} /></Sequence>
            {/* 20.3-23.9: how Aisha's score is built, over the dimmed cards. */}
            <Sequence durationInFrames={sec(3.6)} from={sec(3.3)} layout="none">
              <div style={{ opacity: 0.2 }}><CardGrid /></div>
              <div className="absolute inset-0 flex items-start justify-center pt-10"><ScoreExplainer entry={RECOMMENDATIONS[0]} /></div>
            </Sequence>
            {/* 23.9-26.9: what matches (Aisha) and what's missing (Marcus: PostgreSQL). */}
            <Sequence durationInFrames={sec(3)} from={sec(6.9)} layout="none">
              <MatchFocus />
            </Sequence>
            {/* 26.9-29.4: a person assigns. */}
            <Sequence from={sec(9.9)} layout="none">
              <AssignBeat focus={onlyAisha} />
            </Sequence>
          </div>
        </AppFrame>
      </Stage>
      <Sequence durationInFrames={sec(3.3)} layout="none"><Headline tone="ai">Ranked by fit, with reasons</Headline></Sequence>
      <Sequence durationInFrames={sec(3.6)} from={sec(3.3)} layout="none"><Headline tone="ai">Skills, availability and performance, scored</Headline></Sequence>
      <Sequence durationInFrames={sec(3)} from={sec(6.9)} layout="none"><Headline tone="ai">See what matches and what's missing</Headline></Sequence>
      <Sequence from={sec(9.9)} layout="none"><Headline>Assign in one click</Headline></Sequence>
    </AbsoluteFill>
  )
}

function MatchFocus() {
  const frame = useCurrentFrame()
  const toMarcus = progress(frame, sec(1.4), 12)
  const focus = (id: string) => (id === AISHA_ID ? mix(toMarcus, 1, 0.35) : id === MARCUS_ENTRY.person.id ? mix(toMarcus, 0.25, 1) : 0.25)
  return <CardGrid focus={focus} />
}

function AssignBeat({ focus }: { focus: (id: string) => number }) {
  const frame = useCurrentFrame()
  const clickAt = 26
  return (
    <>
      <CardGrid assigned={frame >= clickAt + 2} focus={focus} />
      <Cursor appearAt={0} clickAt={clickAt} target={`[data-card="${AISHA_ID}"] footer button`} />
    </>
  )
}
