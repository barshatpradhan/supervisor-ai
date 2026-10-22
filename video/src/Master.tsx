import { useEffect, useState } from 'react'
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, getStaticFiles, staticFile } from 'remotion'
import { Captions } from './components/primitives.tsx'
import { Chat } from './scenes/Chat.tsx'
import { Cta } from './scenes/Cta.tsx'
import { DocumentScene } from './scenes/Document.tsx'
import { Problem } from './scenes/Problem.tsx'
import { Ranking } from './scenes/Ranking.tsx'
import { Track } from './scenes/Track.tsx'
import { Trust } from './scenes/Trust.tsx'
import { COLORS } from './theme.ts'
import { headerFontReady } from './typography.ts'
import { ACTS } from './timeline.ts'
import './styles.css'

const FONT_FACES = ['400 16px Inter', '500 16px Inter', '600 16px Inter', '700 16px Inter', '400 16px "JetBrains Mono"', '500 16px "JetBrains Mono"', '600 16px "JetBrains Mono"']

/**
 * Load Inter, JetBrains Mono and the header font before anything is laid out, so text metrics
 * (and the cursor, which measures real buttons) are final in every frame.
 */
function useFontsReady() {
  const [handle] = useState(() => delayRender('Loading fonts'))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void Promise.all([headerFontReady, ...FONT_FACES.map((face) => document.fonts.load(face))])
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true)
        continueRender(handle)
      })
  }, [handle])
  return ready
}

/**
 * The one soundtrack: music and voiceover already mixed, at public/audio/mix.mp3 (see README).
 * Left out when the file isn't there, so silent previews and renders still work.
 */
const MIX_FILE = 'audio/mix.mp3'
const hasMix = () => getStaticFiles().some((file) => file.name.replaceAll('\\', '/') === MIX_FILE)

const scenes = [
  [ACTS.problem, Problem],
  [ACTS.document, DocumentScene],
  [ACTS.ranking, Ranking],
  [ACTS.track, Track],
  [ACTS.chat, Chat],
  [ACTS.trust, Trust],
  [ACTS.cta, Cta],
] as const

/** The 60-second 16:9 master, with the mixed soundtrack when public/audio/mix.mp3 exists. */
export function Master16x9() {
  const fontsReady = useFontsReady()
  return (
    <AbsoluteFill className="video-root" style={{ background: COLORS.canvas, fontFamily: 'var(--font-sans)' }}>
      {fontsReady && scenes.map(([act, Scene]) => (
        <Sequence durationInFrames={act.to - act.from} from={act.from} key={act.from} name={Scene.name}>
          <Scene />
        </Sequence>
      ))}
      <Captions />
      {hasMix() ? <Audio src={staticFile(MIX_FILE)} /> : null}
    </AbsoluteFill>
  )
}
