import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion'
import { CAPTIONS } from '../timeline.ts'
import { COLORS, ENTER, FPS, STAGE, WIDTH, mix, progress } from '../theme.ts'
import { headerStyle } from '../typography.ts'

/** Fades and lifts its children in at `at` (frames, relative to the enclosing Sequence). */
export function Enter({ at, children, className, duration = ENTER, lift = 12, style }: { at: number; children: ReactNode; className?: string; duration?: number; lift?: number; style?: CSSProperties }) {
  const p = progress(useCurrentFrame(), at, duration)
  return (
    <div className={className} style={{ opacity: p, transform: `translateY(${(1 - p) * lift}px) scale(${0.98 + 0.02 * p})`, ...style }}>
      {children}
    </div>
  )
}

/** Fades its children out from `at`. */
export function Exit({ at, children, duration = ENTER, style }: { at: number; children: ReactNode; duration?: number; style?: CSSProperties }) {
  const p = progress(useCurrentFrame(), at, duration)
  return <div style={{ opacity: 1 - p, ...style }}>{children}</div>
}

/** A number that counts from `from` to `to` over `duration` frames starting at `at`. */
export function useCount(at: number, from: number, to: number, duration = 18) {
  return mix(progress(useCurrentFrame(), at, duration), from, to)
}

/** Frames between one word and the next in a PopHeadline. */
const WORD_STEP = 3

/** Sideways swing and tilt per word, cycled so neighbours never come in the same way. */
const SWINGS = [
  { x: -28, r: -9 },
  { x: 24, r: 7 },
  { x: 0, r: -5 },
  { x: 30, r: 10 },
]

/** A word, or a word with its accent colour. */
export type HeadlineWord = string | readonly [string, string]

/**
 * Two-line header above the stage. Its words pop in one by one in reading order, each with its
 * own swing and tilt, and key words carry an accent colour. The one place the video uses a spring
 * instead of EASE: the small overshoot is the point. Every word is readable within about half a
 * second, so even a 1.4 s beat holds the full header for longer than 0.8 s.
 */
export function PopHeadline({ lines }: { lines: readonly (readonly HeadlineWord[])[] }) {
  const frame = useCurrentFrame()
  let order = 0
  return (
    <div style={{ position: 'absolute', top: 34, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', ...headerStyle('tagline') }}>
      {lines.map((line, lineIndex) => (
        <p className="m-0 flex" key={lineIndex} style={{ gap: '0.2em' }}>
          {line.map((word) => {
            const [text, color] = typeof word === 'string' ? [word, COLORS.ink] : word
            const index = order++
            const swing = SWINGS[index % SWINGS.length]
            // The first line drops in from above and the second rises from below, so no word crosses the other line.
            const from = { ...swing, y: lineIndex === 0 ? -46 : 46 }
            const s = spring({ frame: frame - index * WORD_STEP, fps: FPS, config: { damping: 10, stiffness: 170, mass: 0.6 } })
            return (
              <span
                key={index}
                style={{ display: 'inline-block', color, opacity: Math.min(1, s * 2), transform: `translate(${(1 - s) * from.x}px, ${(1 - s) * from.y}px) rotate(${(1 - s) * from.r}deg) scale(${0.6 + 0.4 * s})` }}
              >
                {text}
              </span>
            )
          })}
        </p>
      ))}
    </div>
  )
}

/** The app canvas: a 1240 x 700 CSS-px viewport scaled up and centred on the 1080p frame. */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: (WIDTH - STAGE.width * STAGE.scale) / 2,
        top: STAGE.top,
        width: STAGE.width,
        height: STAGE.height,
        transform: `scale(${STAGE.scale})`,
        transformOrigin: 'top left',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
    </div>
  )
}

/** Burned-in caption for the current frame; white on a dark plate (contrast above 12:1). */
export function Captions() {
  const frame = useCurrentFrame()
  const seconds = frame / FPS
  const cue = CAPTIONS.find((item) => seconds >= item.start && seconds < item.end)
  if (!cue) return null
  const fade = interpolate(frame, [cue.start * FPS, cue.start * FPS + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 26 }}>
      <span style={{ background: COLORS.captionPlate, color: '#fff', fontSize: 40, fontWeight: 600, lineHeight: 1.25, padding: '10px 26px', borderRadius: 10, opacity: fade, maxWidth: 1500, textAlign: 'center' }}>
        {cue.text}
      </span>
    </AbsoluteFill>
  )
}

/**
 * A pointer that glides to the element matching `target` (a CSS selector inside the same Stage)
 * and clicks it at `clickAt`. It measures the real element, so it lands on the app's own buttons.
 */
export function Cursor({ appearAt, clickAt, from = { x: 1120, y: 660 }, target }: { appearAt: number; clickAt: number; from?: { x: number; y: number }; target: string }) {
  const frame = useCurrentFrame()
  const ref = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const layer = ref.current?.parentElement
    const element = layer?.querySelector(target)
    if (!layer || !element) return
    const box = layer.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    const scale = box.width / layer.offsetWidth
    const next = { x: (rect.left + rect.width / 2 - box.left) / scale, y: (rect.top + rect.height / 2 - box.top) / scale }
    setPoint((current) => (current && Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5 ? current : next))
  })

  const visible = frame >= appearAt && point
  const travel = progress(frame, appearAt, Math.max(1, clickAt - appearAt - 3))
  const x = point ? mix(travel, from.x, point.x) : from.x
  const y = point ? mix(travel, from.y, point.y) : from.y
  const pressed = frame >= clickAt && frame < clickAt + 5
  const ring = frame >= clickAt ? progress(frame, clickAt, 10) : 0

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, opacity: visible ? 1 : 0 }}>
      {ring > 0 && ring < 1 ? (
        <span style={{ position: 'absolute', left: x - 18, top: y - 18, width: 36, height: 36, borderRadius: 9999, border: `2px solid ${COLORS.primary}`, opacity: 1 - ring, transform: `scale(${0.6 + ring * 0.8})` }} />
      ) : null}
      <svg height="26" style={{ position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${pressed ? 0.88 : 1})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.25))' }} viewBox="0 0 20 26" width="20">
        <path d="M2 1.5 L2 21 L7.2 16.2 L10.6 24 L14 22.5 L10.7 14.9 L17.6 14.9 Z" fill="#16182a" stroke="#fff" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    </div>
  )
}
