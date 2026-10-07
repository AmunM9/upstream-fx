// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import { createPointerTracker, type PointerTracker } from '../src/core/pointer'

const FRAME = 1 / 60
let tracker: PointerTracker | null = null

function setup(rect = { left: 0, top: 0, width: 200, height: 100 }): { canvas: HTMLCanvasElement; rect: typeof rect } {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) })
  tracker = createPointerTracker(canvas)
  return { canvas, rect }
}

function move(x: number, y: number): void {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }))
}

function run(frames: number, enabled = true): void {
  for (let i = 0; i < frames; i++) tracker?.step(FRAME, enabled)
}

afterEach(() => {
  tracker?.dispose()
  tracker = null
})

describe('createPointerTracker', () => {
  test('jumps to the pointer on entry and ramps influence up', () => {
    setup()
    move(50, 40)
    run(1)
    expect(tracker?.x).toBe(50)
    expect(tracker?.y).toBe(40)
    run(120)
    expect(tracker?.influence).toBeGreaterThan(0.99)
  })

  test('eases toward new positions instead of snapping', () => {
    setup()
    move(50, 40)
    run(120)
    move(150, 40)
    run(1)
    expect(tracker?.x).toBeGreaterThan(50)
    expect(tracker?.x).toBeLessThan(150)
  })

  test('fades out when the pointer leaves the canvas', () => {
    setup()
    move(50, 40)
    run(120)
    move(500, 40)
    run(120)
    expect(tracker?.influence).toBeLessThan(0.01)
  })

  test('fades out when the pointer leaves the window', () => {
    setup()
    move(50, 40)
    run(120)
    window.dispatchEvent(new MouseEvent('pointerout', { relatedTarget: null }))
    run(120)
    expect(tracker?.influence).toBeLessThan(0.01)
  })

  test('stays inactive while disabled', () => {
    setup()
    move(50, 40)
    run(120, false)
    expect(tracker?.influence).toBeLessThan(0.01)
  })

  test('follows the page when it scrolls under a still cursor', () => {
    const { rect } = setup()
    move(50, 40)
    run(120)
    rect.top = -30
    window.dispatchEvent(new Event('scroll'))
    run(240)
    expect(tracker?.y).toBeCloseTo(70, 0)
  })

  test('reset clears the influence immediately', () => {
    setup()
    move(50, 40)
    run(120)
    tracker?.reset()
    expect(tracker?.influence).toBe(0)
  })

  test('dispose stops listening', () => {
    setup()
    tracker?.dispose()
    move(50, 40)
    run(120)
    expect(tracker?.influence).toBe(0)
  })
})

function touch(type: string, x = 0, y = 0): void {
  const event = new MouseEvent(type, { clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  window.dispatchEvent(event)
}

describe('touch', () => {
  test('pressing a finger activates the field right where it lands', () => {
    setup()
    touch('pointerdown', 60, 50)
    run(120)
    expect(tracker?.x).toBe(60)
    expect(tracker?.influence).toBeGreaterThan(0.99)
  })

  test('dragging the finger moves the gap along with it', () => {
    setup()
    touch('pointerdown', 60, 50)
    run(30)
    touch('pointermove', 150, 50)
    run(120)
    expect(tracker?.x).toBeCloseTo(150, 0)
  })

  test('lifting the finger fades the field out', () => {
    setup()
    touch('pointerdown', 60, 50)
    run(120)
    touch('pointerup', 60, 50)
    run(120)
    expect(tracker?.influence).toBeLessThan(0.01)
  })

  test('a gesture the browser takes over (pointercancel) also fades it out', () => {
    setup()
    touch('pointerdown', 60, 50)
    run(120)
    touch('pointercancel')
    run(120)
    expect(tracker?.influence).toBeLessThan(0.01)
  })
})
