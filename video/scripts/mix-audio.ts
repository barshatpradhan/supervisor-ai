// Builds public/audio/mix.mp3: the voiceover cut at its pauses, each line placed where its caption
// starts, over the music (public/audio/music.mp3, if present) extended to 60 s on its own beat
// grid and ducked under the voice, mastered to -14 LUFS / -1 dBTP, exactly 60 s. Run: npm run mix
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { CAPTIONS } from '../src/timeline.ts'

const VOICE = 'public/audio/voiceover.mp3'
const MUSIC = 'public/audio/music.mp3'
const OUT = 'public/audio/mix.mp3'
const LENGTH = 60
/** Shortest silence kept between two placed lines, in seconds. */
const MIN_GAP = 0.15

/**
 * Lines in the current take (ElevenLabs, Lauren): where each sits in voiceover.mp3, in seconds,
 * and the caption cue it starts with. Found with ffmpeg silencedetect; update after a new take.
 */
const LINES = [
  { from: 0.0, to: 2.17, cue: 'Staffing by spreadsheet and gut feel?' },
  { from: 2.64, to: 3.86, cue: 'Overloaded people.' },
  { from: 4.27, to: 5.88, cue: 'The wrong person on the task.' },
  { from: 6.5, to: 9.75, cue: 'Supervisor AI starts with your requirements document.' },
  { from: 10.44, to: 15.4, cue: 'AI reads it and pulls out the skills,' },
  { from: 15.99, to: 17.53, cue: 'It ranks the people who fit,' },
  { from: 17.86, to: 21.52, cue: 'scoring skill match, availability and past performance.' },
  { from: 22.02, to: 24.09, cue: "You see what matches, what's missing," },
  { from: 24.59, to: 26.35, cue: 'and assign in one click.' },
  { from: 26.87, to: 28.62, cue: 'The task lands on the board.' },
  { from: 29.2, to: 31.28, cue: 'Workload updates across the team,' },
  { from: 31.79, to: 34.58, cue: 'and progress comes from' },
  { from: 35.12, to: 36.97, cue: 'Discuss the work in project channels.' },
  { from: 37.53, to: 39.72, cue: 'Tag a task, ask for an update,' },
  { from: 40.17, to: 42.75, cue: 'and the assignee updates their progress.' },
  { from: 43.67, to: 46.85, cue: 'Employees see only their own tasks and channels.' },
  // The close is a little long for the last 7 s, so these play 6% faster (pitch kept).
  { from: 48.23, to: 50.5, cue: 'AI recommends. You decide.', tempo: 1.06 },
  { from: 51.0, to: 54.22, cue: 'Right person. Right project. Less guesswork.', tempo: 1.06 },
  { from: 54.6, to: 55.8, cue: 'Supervisor AI.', tempo: 1.06 },
] as { from: number; to: number; cue: string; tempo?: number }[]
/** A little air around each cut so no consonant is clipped. */
const HEAD = 0.05
const TAIL = 0.1

/**
 * The current music (ElevenLabs Music, "Upbeat, friendly mod #4"): 30 s at 120 BPM, first downbeat
 * at 0.24 s, a 13-bar body to 26.24 s, then its ending. Delayed 0.26 s its beats fall every 0.5 s
 * on the video's timeline; the body plays, repeats, its last two bars lead into the ending again,
 * and the ending lands at 60 s. Every cut sits on a bar line. Update after changing the track.
 */
const BED = [
  { from: 0, to: 26.24, at: 0.26 },
  { from: 0.24, to: 26.24, at: 26.5 },
  { from: 22.24, to: 26.24, at: 52.5 },
  { from: 26.24, to: 30.02, at: 56.5 },
]
/** Music level before ducking, and a dip where the voice is clearest so she sits on top. */
const MUSIC_GAIN = -13
const VOICE_POCKET = 'equalizer=f=2500:t=q:w=1.2:g=-4'

if (!existsSync(VOICE)) throw new Error(`Put the voiceover at ${VOICE} first.`)
const music = existsSync(MUSIC)

let previousEnd = 0
const placed = LINES.map((line) => {
  const cue = CAPTIONS.find((item) => item.text === line.cue)
  if (!cue) throw new Error(`No caption cue "${line.cue}" in src/timeline.ts`)
  const from = Math.max(0, line.from - HEAD)
  const source = line.to + TAIL - from
  const tempo = line.tempo ?? 1
  const length = source / tempo
  const at = Math.max(cue.start, previousEnd + MIN_GAP)
  previousEnd = at + length
  return { ...line, from, source, tempo, length, at, late: at - cue.start }
})
if (previousEnd > LENGTH) throw new Error(`The last line ends at ${previousEnd.toFixed(2)} s, past ${LENGTH} s.`)

const voiceChains = placed.map((line, index) => {
  const ms = Math.round(line.at * 1000)
  return `[0:a]atrim=start=${line.from}:duration=${line.source.toFixed(3)},asetpts=PTS-STARTPTS,atempo=${line.tempo},afade=t=in:d=0.02,afade=t=out:st=${(line.length - 0.06).toFixed(3)}:d=0.06,adelay=${ms}|${ms}[v${index}]`
})
// The lines are mixed onto LENGTH s of silence: amix alone starts its output at the first line,
// which drops the opening silence and shifts every line early.
const silence = `anullsrc=r=44100:cl=mono:d=${LENGTH}[silence]`
const voiceMix = `[silence]${placed.map((_, index) => `[v${index}]`).join('')}amix=inputs=${placed.length + 1}:duration=first:normalize=0,aformat=channel_layouts=stereo`

/** 15 ms fades at every cut, so the joins never click. */
const bedChains = BED.map((part, index) => {
  const length = part.to - part.from
  const ms = Math.round(part.at * 1000)
  return `[1:a]atrim=start=${part.from}:end=${part.to},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st=${(length - 0.015).toFixed(3)}:d=0.015,adelay=${ms}|${ms}[m${index}]`
})
const bed = [
  `anullsrc=r=48000:cl=stereo:d=${LENGTH}[bedsilence]`,
  ...bedChains,
  `[bedsilence]${BED.map((_, index) => `[m${index}]`).join('')}amix=inputs=${BED.length + 1}:duration=first:normalize=0,${VOICE_POCKET},volume=${MUSIC_GAIN}dB,afade=t=out:st=${LENGTH - 0.5}:d=0.5[bed]`,
]

/** Voice alone, or voice over the music bed, which ducks while she speaks. */
const graph = music
  ? [
      silence,
      ...voiceChains,
      `${voiceMix},asplit=2[voice][key]`,
      ...bed,
      '[bed][key]sidechaincompress=threshold=0.015:ratio=5:attack=20:release=400[ducked]',
      '[voice][ducked]amix=inputs=2:normalize=0[mixed]',
    ]
  : [silence, ...voiceChains, `${voiceMix}[mixed]`]

const inputs = ['-i', VOICE, ...(music ? ['-i', MUSIC] : [])]
/** Runs ffmpeg with the graph plus a final mastering filter; returns its log (stderr). */
function ffmpeg(master: string, out: string[]) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...inputs, '-filter_complex', `${graph.join(';')};[mixed]${master}[final]`, '-map', '[final]', ...out], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stderr
}

// Two passes: measure loudness, then apply one plain gain. (loudnorm itself is
// only used to measure: as a filter it drops the leading silence and shifts every line early.)
const TARGET_LUFS = -14
const PEAK_CEILING = -1
const stats = JSON.parse(/\{[^{}]*"input_i"[^{}]*\}/.exec(ffmpeg(`loudnorm=I=${TARGET_LUFS}:TP=${PEAK_CEILING}:print_format=json`, ['-f', 'null', '-']))![0])
// Speech peaks would cap the gain well short of the target, so a limiter (latency-compensated,
// so nothing moves in time) holds them under the ceiling instead.
const gain = TARGET_LUFS - Number(stats.input_i)
const ceiling = 10 ** ((PEAK_CEILING - 0.5) / 20)
ffmpeg(`volume=${gain.toFixed(2)}dB,alimiter=limit=${ceiling.toFixed(3)}:level=false:latency=1`, ['-t', String(LENGTH), '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', OUT])

for (const line of placed) console.log(`${line.at.toFixed(2).padStart(6)} s  ${line.late > 0.01 ? `(+${line.late.toFixed(2)} s) ` : ''}${line.cue}`)
console.log(`Wrote ${OUT} (${music ? 'voice over music' : 'voice only'}), last line ends at ${previousEnd.toFixed(2)} s`)
