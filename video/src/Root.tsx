import { Composition } from 'remotion'
import { Master16x9 } from './Master.tsx'
import { DURATION, FPS, HEIGHT, WIDTH } from './theme.ts'

/** Compositions. Vertical9x16 and Cut15 come next and reuse the same scenes and data. */
export function RemotionRoot() {
  return <Composition component={Master16x9} durationInFrames={DURATION} fps={FPS} height={HEIGHT} id="Master16x9" width={WIDTH} />
}
