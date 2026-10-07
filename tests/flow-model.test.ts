import { describe, expect, test } from 'vitest'
import { HEAD_WINDOW, bandWidth, pushedDistance, repelOffset, type Streak, type Vec2 } from './reference/flow-model'

const RADIUS = 70
const SOFTNESS = 0.6
const POINTER: Vec2 = [0, 0]
const UP: Vec2 = [0, -1] // screen space: y grows downward

/** A vertical streak `length` long whose head sits `headAbove` px above the pointer, `lateral` px to the side. */
function streakAt(lateral: number, headAbove: number, length = 240): Streak {
  return { head: [lateral, -headAbove], dir: UP, length }
}

const magnitude = ([x, y]: Vec2): number => Math.hypot(x, y)

describe('pushedDistance', () => {
  test('moves streaks out of the gap and leaves far ones alone', () => {
    expect(pushedDistance(0, RADIUS, SOFTNESS)).toBeGreaterThanOrEqual(RADIUS - 0.05)
    const outer = RADIUS + bandWidth(RADIUS, SOFTNESS)
    expect(pushedDistance(outer + 5, RADIUS, SOFTNESS)).toBe(outer + 5)
  })

  test('preserves order, so streaks never cross', () => {
    const distances = Array.from({ length: 80 }, (_, i) => i * 4)
    const pushed = distances.map((d) => pushedDistance(d, RADIUS, 0.2))
    pushed.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(pushed[i] ?? 0))
  })

  test('softness spreads streaks next to the rim instead of stacking them', () => {
    const rimSpacing = (softness: number): number => pushedDistance(8, RADIUS, softness) - pushedDistance(0, RADIUS, softness)
    expect(rimSpacing(1)).toBeGreaterThan(rimSpacing(0) * 4)
  })

  test('is disabled with a zero radius', () => {
    expect(pushedDistance(12, 0, SOFTNESS)).toBe(12)
  })
})

describe('repelOffset', () => {
  test('streaks slide aside rigidly: one offset for the whole streak, always away from the pointer', () => {
    const [x] = repelOffset(streakAt(20, 60), POINTER, RADIUS, SOFTNESS)
    expect(x).toBeGreaterThan(0)
    const [left] = repelOffset(streakAt(-20, 60), POINTER, RADIUS, SOFTNESS)
    expect(left).toBeLessThan(0)
  })

  test('heads still below the pointer are held back, so streaks split progressively as they arrive', () => {
    const near = magnitude(repelOffset(streakAt(5, -RADIUS * 0.5), POINTER, RADIUS, SOFTNESS))
    const far = magnitude(repelOffset(streakAt(5, -RADIUS * 2.5), POINTER, RADIUS, SOFTNESS))
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
  })

  test('a streak returns to its place soon after its head has passed, even though its tail still passes by', () => {
    const tight = 0
    const passed = RADIUS + bandWidth(RADIUS, tight) + 240 * HEAD_WINDOW + 10
    expect(passed).toBeLessThan(240) // the tail is still alongside the pointer
    expect(magnitude(repelOffset(streakAt(5, passed), POINTER, RADIUS, tight))).toBe(0)
  })

  test('the gap closes behind the cursor in a tail shorter than the streaks themselves', () => {
    // A lane would stay open for at least the full streak length (240 px) above the cursor.
    const heights = Array.from({ length: 120 }, (_, i) => i * 5)
    const pushed = heights.filter((h) => magnitude(repelOffset(streakAt(5, h), POINTER, RADIUS, SOFTNESS)) > RADIUS * 0.5)
    expect(Math.max(0, ...pushed)).toBeLessThan(240)
  })

  test('the bright head part never enters the gap', () => {
    for (let lateral = -60; lateral <= 60; lateral += 10) {
      for (let above = -150; above <= 300; above += 15) {
        const streak = streakAt(lateral, above)
        const [ox, oy] = repelOffset(streak, POINTER, RADIUS, SOFTNESS)
        const window = streak.length * HEAD_WINDOW
        for (let back = 0; back <= window; back += 6) {
          const point: Vec2 = [streak.head[0] + ox, streak.head[1] + oy + back]
          expect(magnitude(point)).toBeGreaterThanOrEqual(RADIUS - 1)
        }
      }
    }
  })
})
