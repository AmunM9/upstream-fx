import { describe, expect, test } from 'vitest'
import { approach } from '../src/core/motion'

describe('approach', () => {
  test('moves toward the target without overshooting', () => {
    const next = approach(0, 10, 8, 1 / 60)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(10)
  })

  test('is frame-rate independent', () => {
    const oneStep = approach(0, 1, 6, 1 / 30)
    const twoSteps = approach(approach(0, 1, 6, 1 / 60), 1, 6, 1 / 60)
    expect(oneStep).toBeCloseTo(twoSteps, 10)
  })

  test('returns the current value when no time passes', () => {
    expect(approach(3, 9, 6, 0)).toBe(3)
  })
})
