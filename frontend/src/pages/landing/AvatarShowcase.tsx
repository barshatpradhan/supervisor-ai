import { useEffect, useState } from 'react'
import { MessageSquare, Pause, Play } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Avatar as AvatarDisc } from '../../components/ui/avatar/Avatar'
import { ACCESSORIES, DISC_COLORS, PRESETS, SKIN_TONES, defaultConfig, formatAvatarId } from '../../components/ui/avatar/avatar-core'
import type { AvatarConfig } from '../../components/ui/avatar/avatar-core'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/** A 12-second looping "ad": three scenes of four beats each, built from the real avatar component. */
const BEAT_MS = 1000
const BEATS_PER_SCENE = 4
const scenes = [
  { title: 'Pick a character', caption: '12 illustrated characters, made for every team.' },
  { title: 'Make it yours', caption: 'Choose skin tone, background and an accessory.' },
  { title: 'See it everywhere', caption: 'Next to your name in every workspace.' },
] as const

const PICKER_PRESETS = [1, 2, 3, 5, 6, 7, 9, 11]
/** Scene 1 lands on Afro (preset 5) after browsing a few characters. */
const PICK_SEQUENCE = [2, 7, 11, 5]
/** Scene 2 customises it one choice per beat. */
const CUSTOMISE_SEQUENCE: AvatarConfig[] = [
  { ...defaultConfig(5) },
  { ...defaultConfig(5), skin: 3 },
  { ...defaultConfig(5), skin: 3, color: 1 },
  { ...defaultConfig(5), skin: 3, color: 1, accessory: 1 },
]
const FINAL = CUSTOMISE_SEQUENCE[CUSTOMISE_SEQUENCE.length - 1]
const FINAL_ID = formatAvatarId(FINAL)
const SAMPLE_NAME = 'Aisha Bello'

const swatchClass = (selected: boolean) =>
  ['inline-flex size-7 items-center justify-center rounded-pill border transition-all duration-300', selected ? 'scale-110 border-primary-600 ring-2 ring-primary-600/30' : 'border-border-default'].join(' ')

function PickScene({ beat }: { beat: number }) {
  const preset = PICK_SEQUENCE[beat]
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {PICKER_PRESETS.map((id) => (
        <span
          className={['flex items-center justify-center rounded-control border bg-surface-card p-1.5 transition-all duration-300', id === preset ? 'scale-105 border-primary-600 ring-2 ring-primary-600/30' : 'border-border-default'].join(' ')}
          key={id}
        >
          <AvatarDisc animated={false} decorative size={44} variant={formatAvatarId(defaultConfig(id))} />
        </span>
      ))}
    </div>
  )
}

function CustomiseScene({ beat }: { beat: number }) {
  const config = CUSTOMISE_SEQUENCE[beat]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="label text-text-secondary">Skin tone</span>
        <div className="flex flex-wrap gap-2">
          {SKIN_TONES.map((tone) => (
            <span className={swatchClass(config.skin === tone.id)} key={tone.id}><span className="size-5 rounded-pill" style={{ background: tone.base }} /></span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label text-text-secondary">Background</span>
        <div className="flex flex-wrap gap-2">
          {DISC_COLORS.map((color) => (
            <span className={swatchClass(config.color === color.id)} key={color.id}><span className="size-5 rounded-pill" style={{ background: color.mid }} /></span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label text-text-secondary">Accessory</span>
        <div className="flex flex-wrap gap-2">
          {ACCESSORIES.map((accessory) => (
            <span
              className={['helper inline-flex min-h-7 items-center rounded-control border px-2.5 font-medium transition-all duration-300', config.accessory === accessory.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-default text-text-secondary'].join(' ')}
              key={accessory.id}
            >
              {accessory.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const teammates = [
  { id: 'sample-marcus', name: 'Marcus Lee', task: 'Label printer integration' },
  { id: 'sample-lena', name: 'Lena Ortiz', task: 'Offline retry queue' },
]

function EverywhereScene({ beat }: { beat: number }) {
  const shown = (index: number) => ['transition-all duration-500', beat >= index ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'].join(' ')
  return (
    <div className="flex flex-col gap-2.5">
      <div className={`${shown(0)} flex items-center justify-between gap-3 rounded-control border border-border-default bg-surface-card px-3 py-2`}>
        <span className="helper font-medium text-text-tertiary">Header</span>
        <span className="flex items-center gap-2">
          <Avatar fallbackKey="sample-aisha" name={SAMPLE_NAME} size={32} variant={FINAL_ID} />
          <span className="body-strong text-text-primary">{SAMPLE_NAME}</span>
        </span>
      </div>
      <div className={`${shown(1)} flex items-center gap-3 rounded-control border border-border-default bg-surface-card px-3 py-2`}>
        <Avatar fallbackKey="sample-aisha" name={SAMPLE_NAME} size={28} variant={FINAL_ID} />
        <span className="min-w-0 flex-1">
          <span className="body-strong block truncate text-text-primary">v2 inventory endpoints</span>
          <span className="helper block truncate text-text-tertiary">Assigned to {SAMPLE_NAME}</span>
        </span>
      </div>
      <div className={`${shown(2)} flex items-center gap-3 rounded-control border border-border-default bg-surface-card px-3 py-2`}>
        <Avatar fallbackKey="sample-aisha" name={SAMPLE_NAME} size={28} variant={FINAL_ID} />
        <span className="min-w-0 flex-1">
          <span className="helper flex items-center gap-1 text-text-tertiary"><MessageSquare aria-hidden="true" size={12} /> {SAMPLE_NAME}</span>
          <span className="body block truncate text-text-primary">Batch sync is merged, ready for review.</span>
        </span>
      </div>
      {teammates.map((teammate) => (
        <div className={`${shown(3)} flex items-center gap-3 rounded-control border border-dashed border-border-default px-3 py-2`} key={teammate.id}>
          <Avatar fallbackKey={teammate.id} name={teammate.name} size={28} />
          <span className="min-w-0 flex-1">
            <span className="body-strong block truncate text-text-primary">{teammate.name}</span>
            <span className="helper block truncate text-text-tertiary">Initials until they pick one · {teammate.task}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The profile-picture feature as a short looping ad. Pausable, and a still final frame for anyone
 * who prefers reduced motion. Purely illustrative: nothing here talks to the API.
 */
export function AvatarShowcase() {
  const reducedMotion = usePrefersReducedMotion()
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const isStill = reducedMotion || paused

  useEffect(() => {
    if (isStill) return
    const timer = window.setInterval(() => setTick((value) => value + 1), BEAT_MS)
    return () => window.clearInterval(timer)
  }, [isStill])

  const total = scenes.length * BEATS_PER_SCENE
  const position = reducedMotion ? total - 1 : tick % total
  const sceneIndex = Math.floor(position / BEATS_PER_SCENE)
  const beat = position % BEATS_PER_SCENE
  const scene = scenes[sceneIndex]

  const preview =
    sceneIndex === 0 ? formatAvatarId(defaultConfig(PICK_SEQUENCE[beat]))
      : sceneIndex === 1 ? formatAvatarId(CUSTOMISE_SEQUENCE[beat])
        : FINAL_ID

  return (
    <figure aria-label="Profile pictures, shown as a short animation" className="m-0 flex flex-col gap-2">
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-canvas shadow-overlay">
        <div className="flex items-center gap-1.5 border-b border-border-default bg-surface-card px-4 py-2.5">
          {scenes.map((item, index) => (
            <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-pill bg-chart-track" key={item.title}>
              <span
                className="block h-full rounded-pill bg-primary-600 transition-[width] duration-1000 ease-linear"
                style={{ width: index < sceneIndex ? '100%' : index > sceneIndex ? '0%' : `${((beat + 1) / BEATS_PER_SCENE) * 100}%` }}
              />
            </span>
          ))}
          {!reducedMotion ? (
            <button
              aria-pressed={paused}
              className="helper ml-2 inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              onClick={() => setPaused((value) => !value)}
              type="button"
            >
              {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
              {paused ? 'Play' : 'Pause'}
            </button>
          ) : null}
        </div>

        <div className="grid min-h-[560px] gap-5 p-4 sm:min-h-[372px] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6 sm:p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-pill bg-surface-card p-2 shadow-card">
              <AvatarDisc animated={isStill ? false : 'profile'} key={isStill ? 'still' : preview} name={SAMPLE_NAME} size={112} variant={preview} />
            </div>
            <div className="text-center" key={`caption-${sceneIndex}`}>
              <p className="m-0 text-xl font-semibold tracking-tight text-text-primary motion-safe:animate-[ad-in_0.5s_ease-out]">{scene.title}</p>
              <p className="helper m-0 max-w-48 text-text-secondary">{scene.caption}</p>
            </div>
          </div>
          <div className="min-w-0" key={`scene-${sceneIndex}`}>
            <div className="motion-safe:animate-[ad-in_0.5s_ease-out]">
              {sceneIndex === 0 ? <PickScene beat={beat} /> : sceneIndex === 1 ? <CustomiseScene beat={beat} /> : <EverywhereScene beat={beat} />}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="helper text-text-tertiary">Sample people shown for illustration. {PRESETS.length} characters available.</figcaption>
    </figure>
  )
}
