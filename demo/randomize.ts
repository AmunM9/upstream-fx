import type { UpstreamOptions } from '../src/core/options'

type NumericKey = 'count' | 'speed' | 'length' | 'spread' | 'coneRatio' | 'lineWidth' | 'dotSize' | 'intensity' | 'repelRadius' | 'repelSoftness'

export type RandomLook = Pick<UpstreamOptions, NumericKey | 'background' | 'baseColor' | 'accentColor'>

/**
 * Curated ranges: narrower than the sliders, because the slider extremes
 * (a 50-streak field, 2000 px streaks, a 300 px gap) rarely look good together.
 */
export const RANDOM_RANGES: Readonly<Record<NumericKey, readonly [number, number]>> = {
  count: [400, 1800],
  speed: [35, 180],
  length: [140, 420],
  spread: [18, 70],
  coneRatio: [0.35, 0.85],
  lineWidth: [0.7, 1.8],
  dotSize: [1.2, 3.6],
  intensity: [0.7, 1.15],
  repelRadius: [45, 130],
  repelSoftness: [0.25, 0.9],
}

const PURE_BLACK_CHANCE = 0.5

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = saturation * Math.min(lightness, 1 - lightness)
  const channel = (n: number): string => {
    const k = (n + hue / 30) % 12
    const value = lightness - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

const round = (value: number, decimals: number): number => Number(value.toFixed(decimals))

/**
 * A random but coherent look: every color comes from one hue (a bright head,
 * a very dark tail of the same hue, a near-black background) and every number
 * stays inside RANDOM_RANGES. Behavior flags (interactive, paused) are left alone.
 */
export function randomOptions(random: () => number): RandomLook {
  const between = ([min, max]: readonly [number, number]): number => min + random() * (max - min)
  const hue = random() * 360
  const numbers = Object.fromEntries(
    (Object.keys(RANDOM_RANGES) as NumericKey[]).map((key) => {
      const value = between(RANDOM_RANGES[key])
      return [key, key === 'count' ? Math.round(value) : round(value, 2)]
    }),
  ) as Pick<UpstreamOptions, NumericKey>
  const background = random() < PURE_BLACK_CHANCE ? '#000000' : hslToHex(hue, 0.35, between([0.005, 0.02]))
  return {
    ...numbers,
    accentColor: hslToHex(hue, between([0.65, 0.95]), between([0.62, 0.74])),
    baseColor: hslToHex(hue, 0.5, between([0.025, 0.05])),
    background,
  }
}
