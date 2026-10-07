// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { attachTouchSlider, valueFromPosition } from '../demo/slider-touch'

const TRACK = { left: 100, width: 210 }
const THUMB = 10

describe('valueFromPosition', () => {
  const range = { min: 0, max: 100, step: 1 }

  test('maps the finger onto the track like the native slider (thumb centered on the finger)', () => {
    expect(valueFromPosition(100 + THUMB / 2, TRACK, THUMB, range)).toBe(0)
    expect(valueFromPosition(310 - THUMB / 2, TRACK, THUMB, range)).toBe(100)
    expect(valueFromPosition(205, TRACK, THUMB, range)).toBe(50)
  })

  test('clamps when the finger drifts past either end', () => {
    expect(valueFromPosition(20, TRACK, THUMB, range)).toBe(0)
    expect(valueFromPosition(900, TRACK, THUMB, range)).toBe(100)
  })

  test('snaps to the step and keeps decimals clean', () => {
    expect(valueFromPosition(205, TRACK, THUMB, { min: 0, max: 1, step: 0.01 })).toBe(0.5)
    expect(valueFromPosition(150, TRACK, THUMB, { min: 0.25, max: 4, step: 0.05 })).toBe(1.1)
  })
})

function mountSlider(): { input: HTMLInputElement; events: string[] } {
  document.body.innerHTML = '<input type="range" min="0" max="100" step="1" value="10">'
  const input = document.querySelector('input') as HTMLInputElement
  input.getBoundingClientRect = () => ({ left: TRACK.left, width: TRACK.width, top: 0, height: 32, right: 310, bottom: 32, x: 100, y: 0, toJSON: () => ({}) })
  input.setPointerCapture = vi.fn()
  input.releasePointerCapture = vi.fn()
  input.hasPointerCapture = vi.fn(() => true)
  const events: string[] = []
  input.addEventListener('input', () => events.push(`input:${input.value}`))
  input.addEventListener('change', () => events.push(`change:${input.value}`))
  attachTouchSlider(input, THUMB)
  return { input, events }
}

function pointer(input: HTMLInputElement, type: string, clientX: number, clientY = 16, pointerType = 'touch'): MouseEvent {
  const event = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true })
  Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: 1 } })
  input.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('attachTouchSlider', () => {
  test('a tap anywhere on the track jumps the value there, no need to hit the thumb', () => {
    const { input, events } = mountSlider()
    pointer(input, 'pointerdown', 205)
    expect(input.value).toBe('50')
    expect(events).toContain('input:50')
  })

  test('captures the finger so a diagonal or off-track drag keeps moving the slider', () => {
    const { input } = mountSlider()
    pointer(input, 'pointerdown', 120)
    expect(input.setPointerCapture).toHaveBeenCalledWith(1)
    pointer(input, 'pointermove', 257, 90) // drifted 74px down, off the track
    expect(input.value).toBe('76')
  })

  test('still jumps and drags when the browser refuses pointer capture', () => {
    const { input } = mountSlider()
    input.setPointerCapture = vi.fn(() => {
      throw new DOMException('No active pointer with the given id', 'NotFoundError')
    })
    pointer(input, 'pointerdown', 205)
    expect(input.value).toBe('50')
    pointer(input, 'pointermove', 257)
    expect(input.value).toBe('76')
  })

  test('commits with a change event when the finger lifts', () => {
    const { input, events } = mountSlider()
    pointer(input, 'pointerdown', 120)
    pointer(input, 'pointermove', 205)
    pointer(input, 'pointerup', 205)
    expect(events.at(-1)).toBe('change:50')
    pointer(input, 'pointermove', 300)
    expect(input.value).toBe('50') // no longer dragging
  })

  test('claims the gesture so the browser cannot turn it into a scroll', () => {
    const { input } = mountSlider()
    expect(pointer(input, 'pointerdown', 150).defaultPrevented).toBe(true)
    const touchstart = new Event('touchstart', { cancelable: true })
    input.dispatchEvent(touchstart)
    expect(touchstart.defaultPrevented).toBe(true)
  })

  test('leaves the mouse to the native slider', () => {
    const { input, events } = mountSlider()
    expect(pointer(input, 'pointerdown', 205, 16, 'mouse').defaultPrevented).toBe(false)
    expect(input.value).toBe('10')
    expect(events).toEqual([])
  })

  test('does not fire input events when the value did not change', () => {
    const { input, events } = mountSlider()
    pointer(input, 'pointerdown', 205)
    pointer(input, 'pointermove', 205.4)
    expect(events.filter((e) => e.startsWith('input'))).toHaveLength(1)
  })
})
