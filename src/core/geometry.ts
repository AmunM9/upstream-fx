import type { AttributeLayout } from './gl'

/** Distance in CSS px between the bottom edge and the fan origin. */
export const ORIGIN_OFFSET = 50

/** Segments along each streak, so the tail-to-head fade follows its curve instead of a straight ramp. */
export const STREAK_SEGMENTS = 4

/** Two triangles per segment. */
export const VERTICES_PER_STREAK = STREAK_SEGMENTS * 6

const MIN_SPEED = 0.5
const SPEED_RANGE = 1

export const DOT_LAYOUT: readonly AttributeLayout[] = [
  { name: 'a_seed', size: 1 },
  { name: 'a_phase', size: 1 },
  { name: 'a_speed', size: 1 },
]

export const LINE_LAYOUT: readonly AttributeLayout[] = [...DOT_LAYOUT, { name: 'a_corner', size: 2 }]

/** [along, side] for each vertex of one segment quad: along 0 = segment start, 1 = segment end. */
const SEGMENT_CORNERS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, -1],
  [0, 1],
  [0, 1],
  [1, -1],
  [1, 1],
]

/** [along, side] for every vertex of a streak, along running 0 (tail) to 1 (head). */
const STREAK_CORNERS: readonly (readonly [number, number])[] = Array.from({ length: STREAK_SEGMENTS }, (_, segment) =>
  SEGMENT_CORNERS.map(([t, side]) => [(segment + t) / STREAK_SEGMENTS, side] as const),
).flat()

export interface StreakSeed {
  /** Stable identity used by the shader hash. */
  readonly seed: number
  /** Initial progress along the path, in [0, 1). Spreads streaks out on first frame. */
  readonly phase: number
  /** Speed multiplier in [0.5, 1.5]. */
  readonly speed: number
}

export interface Layout {
  readonly origin: readonly [number, number]
  /** Distance from the origin to the farthest visible point. */
  readonly reach: number
}

/** Small seeded PRNG (mulberry32), so a given seed always yields the same field. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createStreakSeeds(count: number, random: () => number): readonly StreakSeed[] {
  const seeds = Array.from({ length: count }, (_, index) =>
    Object.freeze({
      seed: index + random(),
      phase: random(),
      speed: MIN_SPEED + random() * SPEED_RANGE,
    }),
  )
  return Object.freeze(seeds)
}

export function buildLineBuffer(seeds: readonly StreakSeed[]): Float32Array {
  // Filled in place: with thousands of streaks, flatMap would allocate millions of temporary arrays.
  const stride = LINE_LAYOUT.reduce((sum, attribute) => sum + attribute.size, 0)
  const data = new Float32Array(seeds.length * VERTICES_PER_STREAK * stride)
  seeds.forEach(({ seed, phase, speed }, streak) => {
    STREAK_CORNERS.forEach(([along, side], vertex) => {
      data.set([seed, phase, speed, along, side], (streak * VERTICES_PER_STREAK + vertex) * stride)
    })
  })
  return data
}

export function buildDotBuffer(seeds: readonly StreakSeed[]): Float32Array {
  return Float32Array.from(seeds.flatMap(({ seed, phase, speed }) => [seed, phase, speed]))
}

export function computeLayout(width: number, height: number): Layout {
  const origin: [number, number] = [width / 2, height + ORIGIN_OFFSET]
  return { origin, reach: Math.hypot(width / 2, origin[1]) }
}
