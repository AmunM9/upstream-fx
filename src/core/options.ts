import { parseColor } from './color'

export interface UpstreamOptions {
  /** Canvas clear color. Any CSS hex/rgb color or `transparent`. */
  readonly background: string
  /** Color of streaks close to the origin (start of the ramp). */
  readonly baseColor: string
  /** Color of streaks far from the origin and of the head dots. */
  readonly accentColor: string
  /** Number of streaks. */
  readonly count: number
  /** Average travel speed in CSS px per second. */
  readonly speed: number
  /** Maximum streak length in CSS px. */
  readonly length: number
  /** Half-angle of the dense central cone, in degrees. */
  readonly spread: number
  /** Share of streaks kept inside the central cone (0–1). The rest fill the upper half. */
  readonly coneRatio: number
  /** Width of a streak at its head, in CSS px. */
  readonly lineWidth: number
  /** Diameter of the head dot, in CSS px. 0 hides the dots. */
  readonly dotSize: number
  /** Radius of the gap opened around the pointer, in CSS px. */
  readonly repelRadius: number
  /**
   * How far the disturbance spreads beyond the gap (0–1). 0 = streaks hug the rim
   * tightly; 1 = they part gently across a wide band and stay well spaced.
   */
  readonly repelSoftness: number
  /** Global brightness multiplier. */
  readonly intensity: number
  /** Disable to ignore the pointer entirely. */
  readonly interactive: boolean
  /** Freeze the animation on the current frame. */
  readonly paused: boolean
}

export type UpstreamOptionsInput = { readonly [K in keyof UpstreamOptions]?: UpstreamOptions[K] | undefined }

export const DEFAULT_OPTIONS: UpstreamOptions = Object.freeze({
  background: '#000000',
  baseColor: '#03110d',
  accentColor: '#25d39b',
  count: 900,
  speed: 70,
  length: 240,
  spread: 42,
  coneRatio: 0.62,
  lineWidth: 1.2,
  dotSize: 2.6,
  repelRadius: 70,
  repelSoftness: 0.6,
  intensity: 0.85,
  interactive: true,
  paused: false,
})

type NumericKey = { [K in keyof UpstreamOptions]: UpstreamOptions[K] extends number ? K : never }[keyof UpstreamOptions]
type ColorKey = 'background' | 'baseColor' | 'accentColor'
type FlagKey = 'interactive' | 'paused'

/** Valid range per numeric option: [min, max, isInteger]. */
const NUMERIC_RANGES: Readonly<Record<NumericKey, readonly [number, number, boolean]>> = {
  count: [1, 4000, true],
  speed: [0, 2000, false],
  length: [1, 2000, false],
  spread: [0, 90, false],
  coneRatio: [0, 1, false],
  lineWidth: [0.25, 12, false],
  dotSize: [0, 24, false],
  repelRadius: [0, 1000, false],
  repelSoftness: [0, 1, false],
  intensity: [0, 4, false],
}

const COLOR_KEYS: readonly ColorKey[] = ['background', 'baseColor', 'accentColor']
const FLAG_KEYS: readonly FlagKey[] = ['interactive', 'paused']

function resolveNumber(key: NumericKey, value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const [min, max, isInteger] = NUMERIC_RANGES[key]
  const clamped = Math.min(max, Math.max(min, value))
  return isInteger ? Math.round(clamped) : clamped
}

/**
 * Merges `input` over `base` (defaults when omitted), validating every field.
 * Invalid values keep the base value instead of throwing, because options often
 * come straight from UI controls or HTML attributes. Never mutates its inputs.
 */
export function resolveOptions(input: UpstreamOptionsInput = {}, base: UpstreamOptions = DEFAULT_OPTIONS): UpstreamOptions {
  const numbers = Object.fromEntries(
    (Object.keys(NUMERIC_RANGES) as NumericKey[]).map((key) => [key, resolveNumber(key, input[key], base[key])]),
  )
  const colors = Object.fromEntries(
    COLOR_KEYS.map((key) => {
      const value = input[key]
      return [key, typeof value === 'string' && parseColor(value) ? value : base[key]]
    }),
  )
  const flags = Object.fromEntries(
    FLAG_KEYS.map((key) => {
      const value = input[key]
      return [key, typeof value === 'boolean' ? value : base[key]]
    }),
  )
  return Object.freeze({ ...base, ...numbers, ...colors, ...flags } as UpstreamOptions)
}

const TRUE_FLAGS: ReadonlySet<string> = new Set(['', 'true', '1'])
const FALSE_FLAGS: ReadonlySet<string> = new Set(['false', '0'])

/**
 * Parses an option from text (HTML attributes, URL query strings). Returns
 * `undefined` for blank numbers and unknown flag words so the caller keeps its
 * current value; range and color validation still happen in `resolveOptions`.
 */
export function parseOptionValue(key: keyof UpstreamOptions, raw: string): string | number | boolean | undefined {
  const reference = DEFAULT_OPTIONS[key]
  const text = raw.trim()
  if (typeof reference === 'number') return text === '' ? undefined : Number(text)
  if (typeof reference === 'boolean') {
    if (TRUE_FLAGS.has(text)) return true
    return FALSE_FLAGS.has(text) ? false : undefined
  }
  return raw
}

/** True when GPU buffers must be regenerated (as opposed to only updating uniforms). */
export function needsRebuild(previous: UpstreamOptions, next: UpstreamOptions): boolean {
  return previous.count !== next.count
}

/** Shallow equality, used to skip redundant updates from re-rendering adapters. */
export function optionsEqual(a: UpstreamOptions, b: UpstreamOptions): boolean {
  return (Object.keys(a) as (keyof UpstreamOptions)[]).every((key) => a[key] === b[key])
}
