import { Avatar } from '../../components/ui/Avatar'
import { PRESETS, defaultConfig, formatAvatarId } from '../../components/ui/avatar/avatar-core'

/** Every pixel size the app renders avatars at, from list rows (22) to profile summaries (56). */
const SIZES = [22, 24, 28, 32, 36, 40, 48, 56]
const BACKGROUNDS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Canvas #f7f7f4', value: '#f7f7f4' },
]
const SAMPLES = [
  ...PRESETS.map((preset) => ({ key: `p${preset.id}`, name: preset.name, variant: formatAvatarId(defaultConfig(preset.id)) })),
  { key: 'initials-1', name: 'Ada Lovelace', variant: null },
  { key: 'initials-2', name: 'Grace', variant: null },
  { key: 'initials-3', name: 'kofi.mensah@example.test', variant: null },
  { key: 'unassigned', name: null, variant: null },
]

/**
 * Dev-only visual check (/dev/avatars, registered only in `vite dev`): every preset and the
 * initials fallback at each in-app size, on both page backgrounds. Not built into production.
 */
export function AvatarCheckPage() {
  return (
    <main className="flex flex-col gap-8 p-6 text-text-primary">
      <h1 className="page-title m-0">Avatar sizes</h1>
      {BACKGROUNDS.map((background) => (
        <section aria-label={background.label} className="overflow-x-auto rounded-card border border-border-default p-4" key={background.value} style={{ background: background.value }}>
          <h2 className="section-title m-0 mb-4">{background.label}</h2>
          <table className="border-separate border-spacing-x-4 border-spacing-y-2">
            <thead>
              <tr>
                <th className="label text-left text-text-secondary" scope="col">Sample</th>
                {SIZES.map((size) => <th className="label text-text-secondary" key={size} scope="col">{size}</th>)}
              </tr>
            </thead>
            <tbody>
              {SAMPLES.map((sample) => (
                <tr key={sample.key}>
                  <th className="body whitespace-nowrap text-left font-normal" scope="row">{sample.name ?? 'Unassigned'}{sample.variant ? ` · ${sample.variant}` : ''}</th>
                  {SIZES.map((size) => (
                    <td className="text-center align-middle" key={size}>
                      <Avatar fallbackKey={sample.key} name={sample.name} size={size} variant={sample.variant} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  )
}
