// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import { collapsedInsets, createCollapsiblePanel } from '../demo/panels'

const PANEL = { width: 320, height: 600 }
const PILL = { width: 100, height: 40 }

describe('collapsedInsets', () => {
  test('top-right: the panel shrinks up and to the right, into the pill', () => {
    expect(collapsedInsets(PANEL, PILL, 'top-right')).toEqual({ top: 0, right: 0, bottom: 560, left: 220 })
  })

  test('bottom-left: the panel shrinks down and to the left, into the pill', () => {
    expect(collapsedInsets(PANEL, PILL, 'bottom-left')).toEqual({ top: 560, right: 220, bottom: 0, left: 0 })
  })

  test('bottom-right: the panel shrinks down and to the right, into the pill', () => {
    expect(collapsedInsets(PANEL, PILL, 'bottom-right')).toEqual({ top: 560, right: 0, bottom: 0, left: 220 })
  })

  test('never produces negative insets when the pill is larger than the panel', () => {
    const insets = collapsedInsets({ width: 50, height: 20 }, PILL, 'top-right')
    expect(Math.min(...Object.values(insets))).toBe(0)
  })
})

function mountPanel(): HTMLElement {
  document.body.innerHTML = `
    <section class="panel" data-anchor="bottom-left" data-anchor-compact="bottom-right">
      <div class="panel-content"><button type="button" data-collapse>Hide</button><a href="#">link</a></div>
      <button type="button" class="panel-pill">Install</button>
    </section>`
  return document.querySelector('.panel') as HTMLElement
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createCollapsiblePanel', () => {
  test('starts expanded, with the pill hidden from keyboard and screen readers', () => {
    const root = mountPanel()
    createCollapsiblePanel(root)
    expect(root.dataset.state).toBe('expanded')
    expect(root.querySelector('.panel-pill')?.hasAttribute('inert')).toBe(true)
    expect(root.querySelector('.panel-content')?.hasAttribute('inert')).toBe(false)
    expect(root.querySelector('[data-collapse]')?.getAttribute('aria-expanded')).toBe('true')
  })

  test('the collapse button turns the panel into the pill', () => {
    const root = mountPanel()
    createCollapsiblePanel(root)
    ;(root.querySelector('[data-collapse]') as HTMLButtonElement).click()
    expect(root.dataset.state).toBe('collapsed')
    expect(root.querySelector('.panel-content')?.hasAttribute('inert')).toBe(true)
    expect(root.querySelector('.panel-pill')?.hasAttribute('inert')).toBe(false)
    expect(root.querySelector('.panel-pill')?.getAttribute('aria-expanded')).toBe('false')
  })

  test('the pill expands it again and returns focus to the collapse button', () => {
    const root = mountPanel()
    createCollapsiblePanel(root)
    const collapse = root.querySelector('[data-collapse]') as HTMLButtonElement
    const pill = root.querySelector('.panel-pill') as HTMLButtonElement
    collapse.click()
    pill.focus()
    pill.click()
    expect(root.dataset.state).toBe('expanded')
    expect(document.activeElement).toBe(collapse)
  })

  test('moves focus to the pill when collapsing, so keyboard users are not stranded', () => {
    const root = mountPanel()
    createCollapsiblePanel(root)
    const collapse = root.querySelector('[data-collapse]') as HTMLButtonElement
    collapse.focus()
    collapse.click()
    expect(document.activeElement).toBe(root.querySelector('.panel-pill'))
  })

  test('writes the clip insets as CSS variables for the animation', () => {
    const root = mountPanel()
    createCollapsiblePanel(root)
    ;(root.querySelector('[data-collapse]') as HTMLButtonElement).click()
    expect(root.style.getPropertyValue('--clip-top')).toMatch(/px$/)
    expect(root.style.getPropertyValue('--clip-left')).toBe('0px')
  })
})

describe('compact (mobile) layout', () => {
  test('uses the compact corner when the layout is compact, the regular one otherwise', () => {
    const compact = mountPanel()
    createCollapsiblePanel(compact, { isCompact: () => true })
    expect(compact.dataset.corner).toBe('bottom-right')

    const regular = mountPanel()
    createCollapsiblePanel(regular, { isCompact: () => false })
    expect(regular.dataset.corner).toBe('bottom-left')
  })

  test('can start collapsed, so the effect is visible first', () => {
    const root = mountPanel()
    createCollapsiblePanel(root, { startExpanded: false })
    expect(root.dataset.state).toBe('collapsed')
    expect(root.querySelector('.panel-content')?.hasAttribute('inert')).toBe(true)
  })

  test('reports when it expands, so other panels can close', () => {
    const root = mountPanel()
    const opened: string[] = []
    createCollapsiblePanel(root, { startExpanded: false, onExpand: () => opened.push('install') })
    ;(root.querySelector('.panel-pill') as HTMLButtonElement).click()
    expect(opened).toEqual(['install'])
  })
})

describe('blocking the effect behind the panel', () => {
  test('on phones the panel covers the effect, so touches on it do not move the streaks', () => {
    const root = mountPanel()
    createCollapsiblePanel(root, { isCompact: () => true })
    expect(root.hasAttribute('data-upstream-ignore')).toBe(true)
  })

  test('on desktop the effect keeps reacting behind the panels', () => {
    const root = mountPanel()
    root.setAttribute('data-upstream-ignore', '')
    createCollapsiblePanel(root, { isCompact: () => false })
    expect(root.hasAttribute('data-upstream-ignore')).toBe(false)
  })

  test('follows the layout when the window crosses the breakpoint', () => {
    const root = mountPanel()
    let compact = false
    createCollapsiblePanel(root, { isCompact: () => compact })
    compact = true
    window.dispatchEvent(new Event('resize'))
    expect(root.hasAttribute('data-upstream-ignore')).toBe(true)
  })
})
