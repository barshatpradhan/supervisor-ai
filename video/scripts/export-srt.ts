// Writes out/captions.srt from the caption cues the video burns in. Run: npm run srt
import { mkdirSync, writeFileSync } from 'node:fs'
import { CAPTIONS } from '../src/timeline.ts'

const stamp = (seconds: number) => {
  const ms = Math.round(seconds * 1000)
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
}

const srt = CAPTIONS.map((cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join('\n')
mkdirSync('out', { recursive: true })
writeFileSync('out/captions.srt', srt)
console.log(`Wrote out/captions.srt (${CAPTIONS.length} cues)`)
