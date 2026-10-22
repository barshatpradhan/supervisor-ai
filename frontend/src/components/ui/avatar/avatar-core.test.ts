import { describe, expect, it } from 'vitest'
import {
  PRESETS,
  fallbackColorFor,
  formatAvatarId,
  initialsFor,
  isAccessoryAllowed,
  normalizeConfig,
  parseAvatarId,
  renderLayers,
  tierFor,
} from './avatar-core'

describe('avatar ID', () => {
  it('parses and formats the stored form', () => {
    expect(parseAvatarId('p03-s4-c2-a1')).toEqual({ preset: 3, skin: 4, color: 2, accessory: 1 })
    expect(formatAvatarId({ preset: 3, skin: 4, color: 2, accessory: 1 })).toBe('p03-s4-c2-a1')
    expect(formatAvatarId({ preset: 12, skin: 6, color: 6, accessory: 3 })).toBe('p12-s6-c6-a3')
  })

  it('reads missing or invalid IDs as no avatar', () => {
    for (const id of [null, undefined, '', 'p13-s1-c1-a0', 'p01-s7-c1-a0', 'P01-S1-C1-A0', '<svg/>']) {
      expect(parseAvatarId(id)).toBeNull()
    }
  })

  it('drops earrings for presets that cover the ears', () => {
    expect(PRESETS[2].coversEars).toBe(true)
    expect(isAccessoryAllowed(3, 3)).toBe(false)
    expect(isAccessoryAllowed(3, 1)).toBe(true)
    expect(parseAvatarId('p03-s4-c2-a3')?.accessory).toBe(0)
    expect(normalizeConfig({ preset: 99, skin: -1, color: 3.6, accessory: 3 })).toEqual({ preset: 12, skin: 1, color: 4, accessory: 3 })
  })
})

describe('initials and fallback colour', () => {
  it('takes first and last initials, from names or emails', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL')
    expect(initialsFor('Ada King Lovelace')).toBe('AL')
    expect(initialsFor('Grace')).toBe('G')
    expect(initialsFor('kofi.mensah@example.test')).toBe('KM')
    expect(initialsFor('Ada Lovelace', 1)).toBe('A')
    expect(initialsFor('  ')).toBe('')
    expect(initialsFor(null)).toBe('')
  })

  it('picks a stable colour per key', () => {
    expect(fallbackColorFor('user-1')).toBe(fallbackColorFor('user-1'))
    for (const key of ['a', 'b', 'user-1', '', null]) {
      expect(fallbackColorFor(key)).toBeGreaterThanOrEqual(1)
      expect(fallbackColorFor(key)).toBeLessThanOrEqual(6)
    }
  })
})

describe('rendering', () => {
  it('chooses the detail tier from any pixel size', () => {
    expect([22, 24, 28, 40, 48, 64, 128].map(tierFor)).toEqual(['xs', 'xs', 'sm', 'sm', 'md', 'md', 'lg'])
  })

  it('renders every preset without script or event-handler markup', () => {
    for (const preset of PRESETS) {
      const layers = renderLayers({ preset: preset.id, ...preset.defaults }, 40, 'uid')
      const markup = [layers.disc, layers.body, layers.face, layers.hand ?? ''].join('')
      expect(markup).not.toMatch(/<script|\son\w+=/i)
    }
  })
})
