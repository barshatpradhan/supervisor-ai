// Writes out/voiceover-elevenlabs.txt, the voiceover script to paste into ElevenLabs, from the
// caption cues the video burns in (one paragraph per act). Run: npm run voiceover
import { mkdirSync, writeFileSync } from 'node:fs'
import { ACTS, CAPTIONS } from '../src/timeline.ts'
import { FPS } from '../src/theme.ts'

/** Gaps between cues at least this long (seconds) become an explicit ElevenLabs pause. */
const MIN_PAUSE = 0.3

const acts = Object.values(ACTS).map((act) => CAPTIONS.filter((cue) => cue.start >= act.from / FPS && cue.start < act.to / FPS))

let previous: (typeof CAPTIONS)[number] | undefined
const paragraphs = acts.filter((cues) => cues.length > 0).map((cues) => {
  let text = ''
  for (const cue of cues) {
    const gap = previous ? cue.start - previous.end : 0
    if (text) text += ' '
    if (gap >= MIN_PAUSE) text += `<break time="${gap.toFixed(1)}s" /> `
    text += cue.text
    previous = cue
  }
  return text
})

mkdirSync('out', { recursive: true })
writeFileSync('out/voiceover-elevenlabs.txt', `${paragraphs.join('\n\n')}\n`)

const words = CAPTIONS.reduce((sum, cue) => sum + cue.text.split(/\s+/).length, 0)
const spoken = CAPTIONS.reduce((sum, cue) => sum + cue.end - cue.start, 0)
console.log(`Wrote out/voiceover-elevenlabs.txt (${CAPTIONS.length} cues, ${words} words)`)
console.log(`Target pace: ${Math.round((words / spoken) * 60)} words per minute over ${spoken.toFixed(1)} s of speech; the whole read must fit in 60 s.`)
