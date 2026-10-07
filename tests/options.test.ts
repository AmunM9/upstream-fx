import { describe, expect, test } from 'vitest'
import { DEFAULT_OPTIONS, needsRebuild, parseOptionValue, resolveOptions } from '../src/core/options'

describe('resolveOptions', () => {
  test('returns defaults when given nothing', () => {
    expect(resolveOptions()).toEqual(DEFAULT_OPTIONS)
  })

  test('merges overrides without mutating the base', () => {
    const base = resolveOptions()
    const next = resolveOptions({ speed: 120 }, base)
    expect(next.speed).toBe(120)
    expect(base.speed).toBe(DEFAULT_OPTIONS.speed)
  })

  test('returns a frozen object', () => {
    expect(Object.isFrozen(resolveOptions())).toBe(true)
  })

  test('clamps numeric options into their valid range', () => {
    const resolved = resolveOptions({ count: 999_999, coneRatio: -3, lineWidth: 0 })
    expect(resolved.count).toBe(4000)
    expect(resolved.coneRatio).toBe(0)
    expect(resolved.lineWidth).toBe(0.25)
  })

  test('clamps repelSoftness between tight (0) and loose (1)', () => {
    expect(resolveOptions({ repelSoftness: 3 }).repelSoftness).toBe(1)
    expect(resolveOptions({ repelSoftness: -1 }).repelSoftness).toBe(0)
  })

  test('defaults to a loose circle the size of a cursor halo', () => {
    expect(DEFAULT_OPTIONS.repelSoftness).toBe(0.6)
    expect(DEFAULT_OPTIONS.repelRadius).toBe(70)
  })

  test('has no repulsion shape option: the gap is always round', () => {
    expect(DEFAULT_OPTIONS).not.toHaveProperty('repelShape')
  })

  test('rounds count to an integer', () => {
    expect(resolveOptions({ count: 12.7 }).count).toBe(13)
  })

  test('keeps the previous value for non-finite numbers', () => {
    expect(resolveOptions({ speed: Number.NaN }).speed).toBe(DEFAULT_OPTIONS.speed)
  })

  test('keeps the previous color when a color is invalid', () => {
    expect(resolveOptions({ accentColor: 'nope' }).accentColor).toBe(DEFAULT_OPTIONS.accentColor)
  })

  test('ignores undefined values so React props can be passed through', () => {
    expect(resolveOptions({ speed: undefined }).speed).toBe(DEFAULT_OPTIONS.speed)
  })

  test('accepts boolean flags', () => {
    expect(resolveOptions({ interactive: false }).interactive).toBe(false)
  })
})

describe('needsRebuild', () => {
  test('is true only when the streak count changes', () => {
    const a = resolveOptions()
    expect(needsRebuild(a, resolveOptions({ count: a.count + 1 }))).toBe(true)
    expect(needsRebuild(a, resolveOptions({ speed: 1 }))).toBe(false)
  })
})

describe('parseOptionValue', () => {
  test('parses numbers and treats blank strings as missing', () => {
    expect(parseOptionValue('speed', '42.5')).toBe(42.5)
    expect(parseOptionValue('speed', '')).toBeUndefined()
    expect(parseOptionValue('speed', '  ')).toBeUndefined()
  })

  test('parses flags: presence, true and 1 are on; false and 0 are off', () => {
    expect(parseOptionValue('paused', '')).toBe(true)
    expect(parseOptionValue('paused', 'true')).toBe(true)
    expect(parseOptionValue('paused', '1')).toBe(true)
    expect(parseOptionValue('interactive', 'false')).toBe(false)
    expect(parseOptionValue('interactive', '0')).toBe(false)
    expect(parseOptionValue('interactive', 'maybe')).toBeUndefined()
  })

  test('passes colors through for later validation', () => {
    expect(parseOptionValue('accentColor', '#fff')).toBe('#fff')
  })
})
