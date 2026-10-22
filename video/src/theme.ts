import { Easing, interpolate } from 'remotion'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080
export const DURATION = 60 * FPS

/** One easing curve for every move in the video: cubic-bezier(0.22, 1, 0.36, 1). */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1)
/** List stagger: 2 frames = 67 ms. */
export const STAGGER = 2
/** Standard entrance: 12 frames = 0.4 s. */
export const ENTER = 12

export const sec = (seconds: number) => Math.round(seconds * FPS)

/** 0 -> 1 over [start, start + duration], eased and clamped. */
export function progress(frame: number, start: number, duration = ENTER) {
  return interpolate(frame, [start, start + duration], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
}

export const mix = (p: number, from: number, to: number) => from + (to - from) * p

export const COLORS = {
  canvas: '#f7f7f4',
  card: '#ffffff',
  primary: '#4157ad',
  ai: '#784bd1',
  ink: '#16182a',
  captionPlate: 'rgba(22, 24, 42, 0.85)',
}

/** The app is drawn at 1240 x 700 CSS px and scaled up so interface text reads on a 1080p frame. */
export const STAGE = { width: 1240, height: 700, scale: 1.2, top: 112 }
