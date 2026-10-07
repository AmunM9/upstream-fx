/** Normalized RGBA, every channel in [0, 1]. */
export type Rgba = readonly [number, number, number, number]

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/
const NUMBER = String.raw`(\d+(?:\.\d+)?|\.\d+)`
const RGB_PATTERN = new RegExp(String.raw`^rgba?\(\s*${NUMBER}\s*,\s*${NUMBER}\s*,\s*${NUMBER}\s*(?:,\s*${NUMBER}\s*)?\)$`)

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

function parseHex(digits: string): Rgba {
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
  const channel = (index: number): number => parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255
  return [channel(0), channel(1), channel(2), full.length === 8 ? channel(3) : 1]
}

/**
 * Parses `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()` and `transparent`.
 * Returns `null` for anything else so callers can keep a known-good fallback.
 */
export function parseColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase()
  if (value === 'transparent') return [0, 0, 0, 0]

  const hex = HEX_PATTERN.exec(value)
  if (hex?.[1]) return parseHex(hex[1])

  const rgb = RGB_PATTERN.exec(value)
  if (rgb) {
    const channel = (group: string | undefined): number => clamp01(Number(group) / 255)
    const alpha = rgb[4] === undefined ? 1 : clamp01(Number(rgb[4]))
    return [channel(rgb[1]), channel(rgb[2]), channel(rgb[3]), alpha]
  }

  return null
}
