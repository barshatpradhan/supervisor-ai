import type { CSSProperties } from 'react'
import { loadFont } from '@remotion/google-fonts/InstrumentSans'

/**
 * Header typeface: Instrument Sans (SIL Open Font License 1.1), loaded once here through
 * @remotion/google-fonts. loadFont holds the render (delayRender) until the faces are in;
 * Master16x9 also waits on `headerFontReady` before mounting any scene.
 * The recreated app UI and captions stay in Inter, numbers in JetBrains Mono.
 */
const { fontFamily, waitUntilDone } = loadFont('normal', { weights: ['700'], subsets: ['latin'] })

export const headerFontReady = waitUntilDone()

export const HEADER = {
  fontFamily,
  weight: 700,
  lineHeight: 1.08,
  /** px on the 1080p frame, with tracking that tightens as the size grows. */
  scale: {
    scene: { fontSize: 40, letterSpacing: '-0.012em' },
    tagline: { fontSize: 54, letterSpacing: '-0.018em' },
    title: { fontSize: 96, letterSpacing: '-0.025em' },
  },
} as const

/** Inline style for a header of the given size. */
export function headerStyle(size: keyof typeof HEADER.scale): CSSProperties {
  return { fontFamily: HEADER.fontFamily, fontWeight: HEADER.weight, lineHeight: HEADER.lineHeight, ...HEADER.scale[size] }
}
