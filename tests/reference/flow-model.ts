/**
 * Reference model of the pointer repulsion in src/core/shaders.ts, written in
 * TypeScript so its geometric properties can be unit-tested. Keep it in sync
 * with `gapPush` / `repel` in the shader.
 *
 * Streaks never bend: each one slides aside rigidly. How far it slides depends
 * on the distance from the pointer to the bright part of the streak near its
 * head (tails fade to transparent). A streak returns to its place as soon as
 * its head has passed, so the gap closes right behind the cursor in a short,
 * rounded tail instead of a lane as long as the streaks.
 */

export type Vec2 = readonly [number, number]

export interface Streak {
  readonly head: Vec2
  /** Unit vector from tail to head. */
  readonly dir: Vec2
  readonly length: number
}

const MIN_BAND_RATIO = 0.5
const MAX_BAND_RATIO = 4
/** Share of the streak, measured from its head, that feels the pointer. */
export const HEAD_WINDOW = 0.3
const BISECTION_STEPS = 16
/** Streaks exactly on the pointer still need a side to go to. */
export const AXIS_EPSILON = 0.5

export function bandWidth(radius: number, softness: number): number {
  return radius * (MIN_BAND_RATIO + (MAX_BAND_RATIO - MIN_BAND_RATIO) * softness)
}

function gapProfile(r: number, radius: number, band: number): number {
  const t = Math.min(1, Math.max(0, (r - radius) / band))
  return 1 - (1 - t) * (1 - t)
}

/**
 * Distance a streak at distance `d` from the pointer ends up at. Solves l·S(l) = d.
 * S is 0 inside the gap and eases to 1 across the band, so nothing stays inside
 * the gap, order is preserved, and the band spreads streaks out instead of
 * stacking them on the rim.
 */
export function pushedDistance(d: number, radius: number, softness: number): number {
  if (radius < 0.5) return d
  const band = bandWidth(radius, softness)
  const outer = radius + band
  const target = Math.max(d, AXIS_EPSILON)
  if (target >= outer) return target
  let lo = target
  let hi = outer
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2
    if (mid * gapProfile(mid, radius, band) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Point of the streak's sensitive part (its head back to HEAD_WINDOW of its length) closest to the pointer. */
export function sensitivePoint(streak: Streak, pointer: Vec2): Vec2 {
  const reach = streak.length * HEAD_WINDOW
  const [hx, hy] = streak.head
  const [dx, dy] = streak.dir
  const back = Math.min(reach, Math.max(0, (hx - pointer[0]) * dx + (hy - pointer[1]) * dy))
  return [hx - dx * back, hy - dy * back]
}

/** Rigid offset applied to every vertex of the streak. */
export function repelOffset(streak: Streak, pointer: Vec2, radius: number, softness: number): Vec2 {
  const [px, py] = sensitivePoint(streak, pointer)
  const ax = px - pointer[0]
  const ay = py - pointer[1]
  const d = Math.hypot(ax, ay)
  const push = Math.max(0, pushedDistance(d, radius, softness) - d)
  if (d < 1e-3) return [-streak.dir[1] * push, streak.dir[0] * push]
  return [(ax / d) * push, (ay / d) * push]
}
