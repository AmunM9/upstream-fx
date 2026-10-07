import { describe, expect, test } from 'vitest'
import { parseColor } from '../src/core/color'
import { createRandom } from '../src/core/geometry'
import { resolveOptions } from '../src/core/options'
import { RANDOM_RANGES, randomOptions } from '../demo/randomize'

const luminance = (hex: string): number => {
  const [r = 0, g = 0, b = 0] = parseColor(hex) ?? []
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('randomOptions', () => {
  test('is deterministic for a given random source', () => {
    expect(randomOptions(createRandom(7))).toEqual(randomOptions(createRandom(7)))
  })

  test('produces different looks for different seeds', () => {
    expect(randomOptions(createRandom(1))).not.toEqual(randomOptions(createRandom(2)))
  })

  test('keeps every number inside its curated range', () => {
    for (let seed = 0; seed < 200; seed++) {
      const options = randomOptions(createRandom(seed))
      for (const [key, [min, max]] of Object.entries(RANDOM_RANGES)) {
        const value = options[key as keyof typeof options] as number
        expect(value).toBeGreaterThanOrEqual(min)
        expect(value).toBeLessThanOrEqual(max)
      }
      expect(Number.isInteger(options.count)).toBe(true)
    }
  })

  test('picks valid, legible colors: bright heads over dark tails and a near-black background', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { accentColor, baseColor, background } = randomOptions(createRandom(seed))
      for (const color of [accentColor, baseColor, background]) expect(color).toMatch(/^#[0-9a-f]{6}$/)
      expect(luminance(accentColor)).toBeGreaterThan(0.2)
      expect(luminance(baseColor)).toBeLessThan(0.08)
      expect(luminance(background)).toBeLessThan(0.03)
    }
  })

  test('never touches behavior flags, only the look', () => {
    const options = randomOptions(createRandom(3))
    expect(options).not.toHaveProperty('interactive')
    expect(options).not.toHaveProperty('paused')
  })

  test('always passes the public validation unchanged', () => {
    const options = randomOptions(createRandom(11))
    expect(resolveOptions(options)).toMatchObject(options)
  })
})
