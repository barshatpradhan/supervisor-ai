import { AbsoluteFill, spring, useCurrentFrame } from 'remotion'
import { COLORS, FPS } from '../theme.ts'

/** Accent colours for the side shapes only; the app UI keeps its own tokens. */
const ACCENTS = { primary: COLORS.primary, ai: COLORS.ai, amber: '#f2a541', teal: '#2bb5a0', coral: '#ef6f6c' }

type Kind = 'circle' | 'ring' | 'triangle' | 'square' | 'plus' | 'dots'

interface Shape {
  kind: Kind
  /** Centre on the 1920 x 1080 frame, kept in the side margins outside the app stage. */
  x: number
  y: number
  size: number
  color: string
  /** Seconds per float cycle, float distance in px, spin in degrees per second. */
  period: number
  drift: number
  spin: number
  /** Frame the shape pops in. */
  at: number
}

const SHAPES: Shape[] = [
  { kind: 'circle', x: 92, y: 150, size: 54, color: ACCENTS.amber, period: 4.2, drift: 14, spin: 0, at: 4 },
  { kind: 'triangle', x: 150, y: 380, size: 62, color: ACCENTS.ai, period: 5.1, drift: 18, spin: 14, at: 8 },
  { kind: 'plus', x: 70, y: 590, size: 40, color: ACCENTS.teal, period: 3.6, drift: 12, spin: -22, at: 12 },
  { kind: 'ring', x: 140, y: 800, size: 70, color: ACCENTS.primary, period: 4.8, drift: 16, spin: 0, at: 16 },
  { kind: 'dots', x: 64, y: 920, size: 56, color: ACCENTS.coral, period: 6, drift: 8, spin: 0, at: 20 },
  { kind: 'square', x: 1830, y: 130, size: 46, color: ACCENTS.coral, period: 4.5, drift: 14, spin: 18, at: 6 },
  { kind: 'ring', x: 1770, y: 330, size: 58, color: ACCENTS.amber, period: 5.4, drift: 16, spin: 0, at: 10 },
  { kind: 'circle', x: 1852, y: 540, size: 34, color: ACCENTS.ai, period: 3.9, drift: 12, spin: 0, at: 14 },
  { kind: 'triangle', x: 1790, y: 740, size: 56, color: ACCENTS.teal, period: 4.7, drift: 18, spin: -12, at: 18 },
  { kind: 'plus', x: 1856, y: 900, size: 44, color: ACCENTS.primary, period: 5.2, drift: 10, spin: 26, at: 22 },
]

function Glyph({ kind, size, color }: { kind: Kind; size: number; color: string }) {
  const s = size
  switch (kind) {
    case 'circle':
      return <circle cx={s / 2} cy={s / 2} fill={color} r={s / 2} />
    case 'ring':
      return <circle cx={s / 2} cy={s / 2} fill="none" r={s / 2 - s * 0.09} stroke={color} strokeWidth={s * 0.18} />
    case 'triangle':
      return <path d={`M ${s / 2} ${s * 0.06} L ${s * 0.96} ${s * 0.9} L ${s * 0.04} ${s * 0.9} Z`} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={s * 0.08} />
    case 'square':
      return <rect fill={color} height={s * 0.84} rx={s * 0.18} width={s * 0.84} x={s * 0.08} y={s * 0.08} />
    case 'plus':
      return <path d={`M ${s / 2} ${s * 0.1} V ${s * 0.9} M ${s * 0.1} ${s / 2} H ${s * 0.9}`} stroke={color} strokeLinecap="round" strokeWidth={s * 0.24} />
    case 'dots':
      return <>{[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => <circle cx={s * (0.17 + col * 0.33)} cy={s * (0.17 + row * 0.33)} fill={color} key={`${row}${col}`} r={s * 0.08} />))}</>
  }
}

/**
 * Colourful geometric shapes floating in the side margins for the whole video. They pop in one
 * by one over the first second, then bob and spin gently. Drawn behind the scenes and captions.
 */
export function SideShapes() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {SHAPES.map((shape, index) => {
        const pop = spring({ frame: frame - shape.at, fps: FPS, config: { damping: 9, stiffness: 140, mass: 0.7 } })
        const t = frame / FPS
        const bob = Math.sin((t / shape.period) * 2 * Math.PI + index) * shape.drift
        return (
          <svg
            height={shape.size}
            key={index}
            style={{
              position: 'absolute', left: shape.x - shape.size / 2, top: shape.y - shape.size / 2, overflow: 'visible', opacity: 0.85,
              transform: `translateY(${bob}px) rotate(${t * shape.spin}deg) scale(${pop})`,
            }}
            width={shape.size}
          >
            <Glyph color={shape.color} kind={shape.kind} size={shape.size} />
          </svg>
        )
      })}
    </AbsoluteFill>
  )
}
