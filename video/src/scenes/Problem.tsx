import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { Chip, StatusBadge } from '../components/app.ts'
import { Enter, PopHeadline, Stage, useCount } from '../components/primitives.tsx'
import { COLORS, STAGGER, sec } from '../theme.ts'

/** The world before the product: a spreadsheet, overload, the wrong owner. Not app UI. */
const SHEET = [
  ['Aisha Bello', 'Inventory API', '??', '45h'],
  ['Lena Ortiz', 'Retry queue, Dock app', 'Lena?', '52h'],
  ['Marcus Lee', 'Label printers', 'ask Sam', '38h'],
  ['Daniel Kim', '—', '', '20h'],
  ['Tom Reyes', 'Offline sync', 'wrong team?', '26h'],
  ['(unassigned)', 'Scanner QA', '??', '—'],
]

function Spreadsheet() {
  const frame = useCurrentFrame()
  const zoom = interpolate(frame, [0, sec(2.6)], [1, 1.04], { extrapolateRight: 'clamp' })
  return (
    <div className="overflow-hidden rounded-card border border-border-strong bg-surface-card shadow-overlay" style={{ transform: `scale(${zoom})`, filter: 'saturate(0.6)' }}>
      <div className="border-b border-border-default bg-surface-muted px-4 py-2 text-sm font-semibold text-text-secondary">Q3 staffing.xlsx</div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-inset text-left text-text-secondary">
            {['Person', 'Working on', 'Notes', 'This week'].map((head) => <th className="border border-border-default px-3 py-2 font-semibold" key={head}>{head}</th>)}
          </tr>
        </thead>
        <tbody>
          {SHEET.map((row, index) => (
            <tr key={row[0]} style={{ opacity: interpolate(frame, [index * STAGGER, index * STAGGER + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              {row.map((cell, column) => (
                <td
                  className={['border border-border-default px-3 py-2', column === 3 && parseInt(cell) > 40 ? 'bg-danger-bg text-danger-fg' : 'text-text-primary', cell.includes('?') ? 'italic text-text-tertiary' : ''].join(' ')}
                  key={column}
                >
                  {column === 1 && index === 4 ? <span className="line-through">{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OverloadBars() {
  // Spreadsheet-world numbers: the app itself caps workload at 100%.
  const bars = [['Lena', 124], ['Aisha', 112], ['Tom', 96]] as const
  return (
    <div className="flex flex-col gap-5 rounded-card border border-border-default bg-surface-card p-8 shadow-overlay">
      {bars.map(([name, value], index) => <OverloadBar index={index} key={name} name={name} value={value} />)}
    </div>
  )
}

function OverloadBar({ index, name, value }: { index: number; name: string; value: number }) {
  const shown = useCount(index * STAGGER, 0, value, 15)
  return (
    <div className="flex items-center gap-4">
      <span className="body w-20 text-text-primary">{name}</span>
      <span className="relative h-4 flex-1 rounded-pill bg-chart-track">
        <span className="absolute inset-y-0 left-0 rounded-pill bg-danger-fg" style={{ width: `${Math.min(100, shown / 1.3)}%`, opacity: 0.85 }} />
      </span>
      <span className="num-sm w-16 text-right text-danger-fg">{Math.round(shown)}%</span>
    </div>
  )
}

function WrongOwner() {
  const frame = useCurrentFrame()
  const grey = interpolate(frame, [sec(1.6), sec(2.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <article className="flex flex-col gap-4 rounded-card border border-border-default bg-surface-card p-6 shadow-overlay" style={{ width: 520, filter: `grayscale(${grey})` }}>
      <div className="flex items-center justify-between">
        <span className="section-title text-text-primary">Offline sync</span>
        <StatusBadge status="blocked" />
      </div>
      <span className="body text-text-secondary">Owner: Tom Reyes (picked from the sheet)</span>
      <div className="flex gap-2"><Chip tone="missing">Offline sync</Chip><Chip tone="missing">Node.js</Chip></div>
    </article>
  )
}

export function Problem() {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={sec(2.6)} layout="none">
        <PopHeadline lines={[['Staffing', 'by', ['spreadsheet', COLORS.accentText.tool]], ['and', ['gut', COLORS.accentText.problem], ['feel?', COLORS.accentText.problem]]]} />
        <Stage><Enter at={0} style={{ paddingTop: 110 }}><Spreadsheet /></Enter></Stage>
      </Sequence>
      <Sequence durationInFrames={sec(1.4)} from={sec(2.6)} layout="none">
        <PopHeadline lines={[['Some', 'people', 'are'], [['overloaded', COLORS.accentText.problem]]]} />
        <Stage><Enter at={0} style={{ paddingTop: 230, paddingInline: 220 }}><OverloadBars /></Enter></Stage>
      </Sequence>
      <Sequence durationInFrames={sec(3)} from={sec(4)} layout="none">
        <PopHeadline lines={[[['Wrong', COLORS.accentText.problem], ['person', COLORS.accentText.problem]], ['on', 'the', 'task']]} />
        <Stage><Enter at={0} style={{ display: 'flex', justifyContent: 'center', paddingTop: 230 }}><WrongOwner /></Enter></Stage>
      </Sequence>
    </AbsoluteFill>
  )
}
