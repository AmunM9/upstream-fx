import { describe, expect, test } from 'vitest'
import { parseColor } from '../src/core/color'

describe('parseColor', () => {
  test('parses 6-digit hex into normalized rgba', () => {
    expect(parseColor('#ff8000')).toEqual([1, 128 / 255, 0, 1])
  })

  test('parses 3-digit hex shorthand', () => {
    expect(parseColor('#0f0')).toEqual([0, 1, 0, 1])
  })

  test('parses 8-digit hex with alpha', () => {
    expect(parseColor('#00000080')).toEqual([0, 0, 0, 128 / 255])
  })

  test('parses rgb() and rgba() notation', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1])
    expect(parseColor('rgba(0, 0, 255, 0.5)')).toEqual([0, 0, 1, 0.5])
  })

  test('treats "transparent" as fully transparent black', () => {
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0])
  })

  test('is case and whitespace insensitive', () => {
    expect(parseColor('  #FFFFFF ')).toEqual([1, 1, 1, 1])
  })

  test('rejects malformed numbers instead of producing NaN channels', () => {
    expect(parseColor('rgb(1.2.3, 0, 0)')).toBeNull()
    expect(parseColor('rgb(., ., .)')).toBeNull()
    expect(parseColor('rgba(0, 0, 0, ..)')).toBeNull()
  })

  test('accepts decimals with or without a leading digit', () => {
    expect(parseColor('rgba(0, 0, 0, .5)')).toEqual([0, 0, 0, 0.5])
    expect(parseColor('rgb(127.5, 0, 0)')).toEqual([0.5, 0, 0, 1])
  })

  test('returns null for unsupported input', () => {
    expect(parseColor('not-a-color')).toBeNull()
    expect(parseColor('#12')).toBeNull()
    expect(parseColor('rgb(1,2)')).toBeNull()
  })
})
