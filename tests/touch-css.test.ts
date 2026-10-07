/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('../demo/styles.css', import.meta.url), 'utf8').replace(/\s+/g, ' ')

/** Declarations of the first rule whose selector list contains `selector`. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.#[\]()]/g, '\\$&')
  // The selector must stand alone in a selector list: `pre` must not match `.preset`.
  const match = new RegExp(`(?:^|[},])([^{}@]*?(?:^|[\\s,])${escaped}(?=[\\s,{])[^{}]*)\\{([^}]*)\\}`).exec(css)
  return match?.[2] ?? ''
}

describe('playground touch contract (phones)', () => {
  test('dragging on the effect never scrolls, zooms or refreshes the page', () => {
    expect(rule('#field')).toMatch(/touch-action: none/)
    expect(rule('.masthead')).toMatch(/touch-action: none/)
    expect(rule('html')).toMatch(/overscroll-behavior: none/)
  })

  test('long-pressing the page selects no text and opens no callout', () => {
    expect(rule('body')).toMatch(/user-select: none/)
    expect(rule('body')).toMatch(/-webkit-touch-callout: none/)
  })

  test('panels keep scrolling, and code stays selectable', () => {
    expect(rule('.panel-content')).toMatch(/touch-action: pan-x pan-y pinch-zoom/)
    expect(rule('pre')).toMatch(/user-select: text/)
  })

  test('sliders own horizontal drags, so the panel never steals them as a sideways scroll', () => {
    expect(rule("input[type='range']")).toMatch(/touch-action: pan-y/)
  })
})
