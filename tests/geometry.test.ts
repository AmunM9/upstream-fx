import { describe, expect, test } from 'vitest'
import {
  DOT_LAYOUT,
  LINE_LAYOUT,
  ORIGIN_OFFSET,
  STREAK_SEGMENTS,
  VERTICES_PER_STREAK,
  buildDotBuffer,
  buildLineBuffer,
  computeLayout,
  createRandom,
  createStreakSeeds,
} from '../src/core/geometry'

const floatsPer = (layout: readonly { size: number }[]): number => layout.reduce((sum, a) => sum + a.size, 0)

describe('createRandom', () => {
  test('is deterministic for the same seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  test('produces values in [0, 1)', () => {
    const random = createRandom(7)
    const values = Array.from({ length: 1000 }, random)
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true)
  })
})

describe('createStreakSeeds', () => {
  test('creates one frozen seed per streak with values in range', () => {
    const seeds = createStreakSeeds(50, createRandom(1))
    expect(seeds).toHaveLength(50)
    expect(Object.isFrozen(seeds)).toBe(true)
    for (const s of seeds) {
      expect(s.phase).toBeGreaterThanOrEqual(0)
      expect(s.phase).toBeLessThan(1)
      expect(s.speed).toBeGreaterThanOrEqual(0.5)
      expect(s.speed).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('buildLineBuffer', () => {
  test('emits two triangles per streak with interleaved attributes', () => {
    const seeds = createStreakSeeds(3, createRandom(3))
    const data = buildLineBuffer(seeds)
    expect(data).toHaveLength(3 * VERTICES_PER_STREAK * floatsPer(LINE_LAYOUT))
  })

  test('subdivides each streak along its length for a smooth fade', () => {
    const data = buildLineBuffer(createStreakSeeds(1, createRandom(9)))
    const stride = floatsPer(LINE_LAYOUT)
    const corners = Array.from({ length: VERTICES_PER_STREAK }, (_, i) => [data[i * stride + 3], data[i * stride + 4]])
    const along = [...new Set(corners.map(([a]) => a))].sort((x, y) => (x ?? 0) - (y ?? 0))
    expect(along).toHaveLength(STREAK_SEGMENTS + 1)
    expect(along[0]).toBe(0)
    expect(along.at(-1)).toBe(1)
    expect(new Set(corners.map(([, side]) => side))).toEqual(new Set([-1, 1]))
  })

  test('uses two triangles per segment', () => {
    expect(VERTICES_PER_STREAK).toBe(STREAK_SEGMENTS * 6)
  })

  test('repeats the streak seed across all of its vertices', () => {
    const [first, second] = createStreakSeeds(2, createRandom(5))
    if (!first || !second) throw new Error('expected two seeds')
    const data = buildLineBuffer([first, second])
    const stride = floatsPer(LINE_LAYOUT)
    for (let v = 0; v < VERTICES_PER_STREAK; v++) {
      expect(data[v * stride]).toBeCloseTo(first.seed)
      expect(data[(VERTICES_PER_STREAK + v) * stride]).toBeCloseTo(second.seed)
    }
  })
})

describe('buildDotBuffer', () => {
  test('emits one vertex per streak', () => {
    const seeds = createStreakSeeds(4, createRandom(4))
    expect(buildDotBuffer(seeds)).toHaveLength(4 * floatsPer(DOT_LAYOUT))
  })
})

describe('computeLayout', () => {
  test('places the origin centered just below the bottom edge', () => {
    const layout = computeLayout(800, 600)
    expect(layout.origin).toEqual([400, 600 + ORIGIN_OFFSET])
  })

  test('reach is the distance from the origin to the farthest top corner', () => {
    const { reach } = computeLayout(800, 600)
    expect(reach).toBeCloseTo(Math.hypot(400, 600 + ORIGIN_OFFSET))
  })
})
