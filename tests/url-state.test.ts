import { describe, expect, test } from 'vitest'
import { DEFAULT_OPTIONS, resolveOptions } from '../src/core/options'
import { optionsFromQuery, optionsToQuery } from '../demo/url-state'

describe('url state', () => {
  test('round-trips changed options through the query string', () => {
    const options = resolveOptions({ speed: 120, accentColor: '#ff00aa', interactive: false })
    expect(optionsFromQuery(optionsToQuery(options))).toEqual(options)
  })

  test('serializes nothing for the defaults', () => {
    expect(optionsToQuery(DEFAULT_OPTIONS)).toBe('')
  })

  test('ignores unknown keys and invalid values', () => {
    const options = optionsFromQuery('?speed=abc&count=200&evil=<script>&accentColor=javascript:alert(1)')
    expect(options.speed).toBe(DEFAULT_OPTIONS.speed)
    expect(options.count).toBe(200)
    expect(options.accentColor).toBe(DEFAULT_OPTIONS.accentColor)
    expect(options).not.toHaveProperty('evil')
  })

  test('clamps out-of-range numbers from hand-edited links', () => {
    expect(optionsFromQuery('?count=99999999').count).toBe(4000)
  })
})
