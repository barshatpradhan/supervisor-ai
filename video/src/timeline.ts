import { sec } from './theme.ts'

/** Act boundaries in frames (30 fps). Every boundary sits on a beat of the 120 BPM track. */
export const ACTS = {
  problem: { from: 0, to: sec(7) },
  document: { from: sec(7), to: sec(17) },
  ranking: { from: sec(17), to: sec(29.4) },
  track: { from: sec(29.4), to: sec(39.3) },
  chat: { from: sec(39.3), to: sec(49.1) },
  trust: { from: sec(49.1), to: sec(55) },
  cta: { from: sec(55), to: sec(60) },
} as const

export interface Cue {
  start: number
  end: number
  text: string
}

/** Burned-in captions; the same cues export as captions.srt (npm run srt). Times in seconds. */
export const CAPTIONS: Cue[] = [
  { start: 0.3, end: 2.6, text: 'Staffing by spreadsheet and gut feel?' },
  { start: 2.7, end: 4.0, text: 'Overloaded people.' },
  { start: 4.1, end: 7.0, text: 'The wrong person on the task.' },
  { start: 7.4, end: 10.7, text: 'Supervisor AI starts with your requirements document.' },
  { start: 10.9, end: 14.7, text: 'AI reads it and pulls out the skills,' },
  { start: 14.8, end: 17.0, text: 'complexity, and estimated hours.' },
  { start: 17.3, end: 20.2, text: 'It ranks the people who fit,' },
  { start: 20.4, end: 23.8, text: 'scoring skill match, availability and past performance.' },
  { start: 24.0, end: 26.9, text: "You see what matches, what's missing," },
  { start: 27.0, end: 29.3, text: 'and assign in one click.' },
  { start: 29.5, end: 32.4, text: 'The task lands on the board.' },
  { start: 32.5, end: 34.9, text: 'Workload updates across the team,' },
  { start: 35.1, end: 37.2, text: 'and progress comes from' },
  { start: 37.2, end: 39.3, text: 'the people doing the work.' },
  { start: 39.4, end: 42.3, text: 'Discuss the work in project channels.' },
  { start: 42.4, end: 45.7, text: 'Tag a task, ask for an update,' },
  { start: 45.8, end: 48.9, text: 'and the assignee updates their progress.' },
  { start: 49.1, end: 52.4, text: 'Employees see only their own tasks and channels.' },
  { start: 52.5, end: 55.0, text: 'AI recommends. You decide.' },
  { start: 55.0, end: 58.1, text: 'Right person. Right project. Less guesswork.' },
  { start: 58.3, end: 60.0, text: 'Supervisor AI.' },
]
