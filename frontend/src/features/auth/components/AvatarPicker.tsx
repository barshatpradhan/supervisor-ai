import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { Avatar } from '../../../components/ui/avatar/Avatar'
import {
  ACCESSORIES,
  DISC_COLORS,
  PRESETS,
  SKIN_TONES,
  defaultConfig,
  formatAvatarId,
  isAccessoryAllowed,
  normalizeConfig,
  parseAvatarId,
} from '../../../components/ui/avatar/avatar-core'
import type { AvatarConfig } from '../../../components/ui/avatar/avatar-core'
import { rateLimitRetryAfter } from '../../../lib/api/errors'
import { useAuth } from '../hooks/useAuth'

interface AvatarPickerProps {
  /** Name shown on the initials disc and in labels. */
  name: string | null
}

const optionClass =
  'relative inline-flex cursor-pointer items-center justify-center rounded-control border border-border-default bg-surface-card has-[:checked]:border-primary-600 has-[:checked]:ring-2 has-[:checked]:ring-primary-600/30 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-600 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40'

function OptionGroup({ children, legend, hint }: { children: ReactNode; legend: string; hint?: string }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="label mb-2 p-0 text-text-secondary">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint ? <p className="helper m-0 text-text-tertiary">{hint}</p> : null}
    </fieldset>
  )
}

/**
 * Profile picture chooser: a preset, then skin tone, disc colour and accessory. Nothing is saved
 * until Save; "Use my initials" clears the choice. The avatar is the same in every workspace.
 */
export function AvatarPicker({ name }: AvatarPickerProps) {
  const { updateAvatar, user } = useAuth()
  const saved = user?.avatarVariant ?? null
  const savedConfig = parseAvatarId(saved)
  const [draft, setDraft] = useState<AvatarConfig | null>(savedConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const draftId = draft ? formatAvatarId(draft) : null
  const isDirty = draftId !== (savedConfig ? formatAvatarId(savedConfig) : null)
  const config = draft ?? defaultConfig(1)

  function choose(next: Partial<AvatarConfig>) {
    setNotice(null)
    setDraft(normalizeConfig({ ...config, ...next }))
  }

  async function save(variant: string | null) {
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      await updateAvatar(variant)
      setDraft(parseAvatarId(variant))
      setNotice(variant ? 'Profile picture saved.' : 'Showing your initials.')
    } catch (caughtError) {
      const retryAfter = rateLimitRetryAfter(caughtError)
      setError(
        retryAfter
          ? `Too many changes in a short time. Try again in ${Math.ceil(retryAfter / 60)} min.`
          : caughtError instanceof Error ? caughtError.message : 'Your profile picture could not be saved.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card aria-labelledby="avatar-picker-title" className="flex flex-col gap-5">
      <CardHeader helper="Shown next to your name in every workspace." id="avatar-picker-title" title="Profile picture" />
      {error ? <StateBlock compact kind="error" title="Your profile picture could not be saved">{error}</StateBlock> : null}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-2 md:w-40">
          <Avatar animated="profile" fallbackKey={user?.id} key={draftId ?? 'initials'} name={name ?? user?.email} size={128} variant={draftId} />
          <span className="helper text-text-tertiary">{draft ? 'Preview' : 'Your initials'}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <OptionGroup legend="Character">
            {PRESETS.map((preset) => (
              <label className={`${optionClass} p-1`} key={preset.id} title={preset.name}>
                <input
                  aria-label={`${preset.name}: ${preset.description}`}
                  checked={draft?.preset === preset.id}
                  className="sr-only"
                  name="avatar-preset"
                  onChange={() => { setNotice(null); setDraft(draft ? normalizeConfig({ ...draft, preset: preset.id }) : defaultConfig(preset.id)) }}
                  type="radio"
                />
                <Avatar animated={false} decorative size={48} variant={formatAvatarId(draft ? { ...draft, preset: preset.id } : defaultConfig(preset.id))} />
              </label>
            ))}
          </OptionGroup>

          <OptionGroup legend="Skin tone">
            {SKIN_TONES.map((tone) => (
              <label className={`${optionClass} size-9 rounded-pill`} key={tone.id} title={tone.name}>
                <input aria-label={tone.name} checked={draft?.skin === tone.id} className="sr-only" disabled={!draft} name="avatar-skin" onChange={() => choose({ skin: tone.id })} type="radio" />
                <span aria-hidden="true" className="size-6 rounded-pill" style={{ background: tone.base }} />
              </label>
            ))}
          </OptionGroup>

          <OptionGroup legend="Background">
            {DISC_COLORS.map((color) => (
              <label className={`${optionClass} size-9 rounded-pill`} key={color.id} title={color.name}>
                <input aria-label={color.name} checked={draft?.color === color.id} className="sr-only" disabled={!draft} name="avatar-color" onChange={() => choose({ color: color.id })} type="radio" />
                <span aria-hidden="true" className="size-6 rounded-pill border border-black/5" style={{ background: color.mid }} />
              </label>
            ))}
          </OptionGroup>

          <OptionGroup
            hint={draft && !isAccessoryAllowed(draft.preset, 3) ? 'Earrings aren’t available with this character because the ears are covered.' : undefined}
            legend="Accessory"
          >
            {ACCESSORIES.map((accessory) => (
              <label className={`${optionClass} body min-h-9 px-3`} key={accessory.id}>
                <input
                  checked={draft?.accessory === accessory.id}
                  className="sr-only"
                  disabled={!draft || !isAccessoryAllowed(draft.preset, accessory.id)}
                  name="avatar-accessory"
                  onChange={() => choose({ accessory: accessory.id })}
                  type="radio"
                />
                {accessory.name}
              </label>
            ))}
          </OptionGroup>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-chart-grid pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span aria-live="polite" className="helper text-text-tertiary">
          {notice ?? (isDirty ? 'You have unsaved changes.' : draft ? '' : 'Choose a character to replace your initials.')}
        </span>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {saved ? <Button disabled={isSaving} onClick={() => { void save(null) }} variant="ghost">Use my initials</Button> : null}
          <Button disabled={!isDirty || isSaving} onClick={() => { setError(null); setNotice(null); setDraft(savedConfig) }} variant="secondary">Cancel</Button>
          <Button disabled={!isDirty || isSaving || !draftId} onClick={() => { void save(draftId) }}>{isSaving ? 'Saving…' : 'Save picture'}</Button>
        </div>
      </div>
    </Card>
  )
}
