/**
 * Chart colors are design tokens. Charts take a token name ('chart-1', 'status-blocked')
 * and resolve it to the CSS variable Tailwind generates from tokens.css.
 */
export type ColorToken = string

export function tokenColor(token: ColorToken) {
  return `var(--color-${token})`
}

export interface Datum {
  color?: ColorToken
  name: string
  value: number
}
