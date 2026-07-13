# Supervisor AI - Color System

This frontend now uses a monday/Vibe-inspired color model:

1. A small set of raw palette values
2. Purpose-first aliases for UI behavior
3. Surface and text tokens for the single light theme
4. Tailwind-exposed token names for implementation

The goal is not "pick a pretty color." The goal is predictable behavior: the same kind of UI state should look the same everywhere.

## Source Direction

The update is based on the public monday/Vibe references you linked plus monday's published guidance on purpose naming.

Two signals matter most:

- monday's live marketing/design tokens use a vivid purple primary and product-specific accent families
- monday engineering recommends mapping behavior to tokens instead of styling directly from raw color names

That is the pattern adopted here.

## 1. Core Palette

### Primary

Primary is the main interaction color. It replaces the older blue-led system.

| Token | Value | Role |
| --- | --- | --- |
| `primary.50` | `#F5F4FF` | soft tint |
| `primary.100` | `#ECEBFF` | selected backgrounds |
| `primary.200` | `#D8D6FF` | focus halos, soft borders |
| `primary.300` | `#B8B3FF` | soft focus and selection support |
| `primary.400` | `#8E89FF` | strong accent support |
| `primary.500` | `#6161FF` | brand expression |
| `primary.600` | `#4B4DE6` | interactive default |
| `primary.700` | `#393CC2` | hover / pressed text-safe |
| `primary.800` | `#2F3198` | active / deep accent |
| `primary.900` | `#23255F` | strongest contrast |

### Supporting accents

These are not free-for-all UI colors. They exist to support status, categorization, and reserved moments.

| Family | 100 | 500 | 700 | Primary use |
| --- | --- | --- | --- | --- |
| Lime | `#EEF9D9` | `#9CD326` | `#5F8611` | secondary data accents |
| Green | `#DCF8EA` | `#00CA72` | `#037F4C` | success |
| Yellow | `#FFF4CC` | `#FFCB00` | `#8F6D00` | warning |
| Orange | `#FFEEDB` | `#FDAB3D` | `#B66D0C` | urgency without failure |
| Red | `#FFE3E8` | `#E2445C` | `#BB3354` | danger / destructive states |
| Sky | `#E6F7FF` | `#66CCFF` | `#1279B0` | informational support |
| Lilac | `#F1E6FF` | `#A25DDC` | `#784BD1` | AI-specific accents |

## 2. Product Neutrals

The neutral scale is based on monday-style product grays rather than blue-gray branding.

| Token | Value |
| --- | --- |
| `neutral.0` | `#FFFFFF` |
| `neutral.25` | `#F9FAFF` |
| `neutral.50` | `#F6F7FB` |
| `neutral.100` | `#F3F5FB` |
| `neutral.200` | `#E4E6F1` |
| `neutral.300` | `#D0D4E4` |
| `neutral.400` | `#CACBCD` |
| `neutral.500` | `#7C7B7B` |
| `neutral.600` | `#676879` |
| `neutral.700` | `#535768` |
| `neutral.800` | `#323338` |
| `neutral.900` | `#181B34` |

Usage rule:

- `neutral.800` is the default body text color
- `neutral.600` is secondary/supporting copy
- `neutral.200` and `neutral.300` are the default border range

## 3. Purpose Tokens

Components should prefer these aliases instead of hardcoding palette families.

### Semantic aliases

| Token | Maps to |
| --- | --- |
| `success.bg` | `green.100` |
| `success.fg` | `green.500` |
| `success.text` | `green.700` |
| `warning.bg` | `yellow.100` |
| `warning.fg` | `yellow.500` |
| `warning.text` | `yellow.700` |
| `error.bg` | `red.100` |
| `error.fg` | `red.500` |
| `error.text` | `red.700` |
| `info.bg` | `sky.100` |
| `info.fg` | `primary.600` |
| `info.text` | `primary.700` |
| `ai.bg` | `lilac.100` |
| `ai.fg` | `lilac.500` |
| `ai.text` | `lilac.700` |

### Surface aliases

| Token | Light |
| --- | --- |
| `surface.canvas` | `neutral.50` |
| `surface.canvas.alt` | `neutral.100` |
| `surface.card` | `neutral.0` |
| `surface.card.alt` | `neutral.25` |
| `surface.elevated` | `neutral.0` |

### Text aliases

| Token | Light |
| --- | --- |
| `text.primary` | `neutral.800` |
| `text.secondary` | `neutral.600` |
| `text.tertiary` | `neutral.500` |
| `text.disabled` | `neutral.400` |
| `text.link` | `primary.600` |
| `text.on-primary` | `#FFFFFF` |

### Border aliases

| Token | Light |
| --- | --- |
| `border.default` | `#DCDFEC` |
| `border.strong` | `neutral.300` |
| `border.primary` | `primary.200` |

## 4. Theme Policy

This website is intentionally light-only.

- no automatic `prefers-color-scheme` switching
- no dark token override layer
- all UI colors resolve to the light theme values in `tokens.css`

## 5. Implementation Notes

The live token file is `src/styles/tokens.css`.

It now exposes:

- raw CSS custom properties for palette and purpose aliases
- Tailwind v4 `@theme` values for `primary-*`, `ink-*`, semantic tokens, surfaces, borders, and shadows
- compatibility `brand-*` exports so older utilities do not break during migration

## 6. Rules

- Use `primary.*` for interactive emphasis, not random accent colors.
- Use semantic tokens for status UI.
- Use `lilac.*` only for AI-specific moments.
- Use neutral surfaces for most layout and reading contexts.
- Prefer purpose aliases in components; raw palette tokens are for the token layer.
