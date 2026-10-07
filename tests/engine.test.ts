// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createUpstream } from '../src/core/engine'
import { createCanvas, createFakeGl } from './helpers/fake-webgl'

const requestFrame = vi.fn((_callback: FrameRequestCallback) => 1)
const cancelFrame = vi.fn()

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelFrame)
  setVisibility('visible')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createUpstream', () => {
  test('returns an unsupported no-op instance when WebGL is unavailable', () => {
    const instance = createUpstream(createCanvas(null))
    expect(instance.supported).toBe(false)
    expect(() => {
      instance.setOptions({ speed: 10 })
      instance.destroy()
    }).not.toThrow()
  })

  test('draws streaks and head dots immediately and starts the loop', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    expect(instance.supported).toBe(true)
    expect(fake.count('drawArrays')).toBe(2)
    expect(requestFrame).toHaveBeenCalledTimes(1)
    instance.destroy()
  })

  test('skips the dot pass when dotSize is 0', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl), { dotSize: 0 })
    expect(fake.count('drawArrays')).toBe(1)
    instance.destroy()
  })

  test('rebuilds GPU buffers only when the streak count changes', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    instance.setOptions({ speed: 20 })
    expect(fake.count('deleteBuffer')).toBe(0)
    instance.setOptions({ count: 10 })
    expect(fake.count('deleteBuffer')).toBe(2)
    expect(fake.count('createBuffer')).toBe(4)
    instance.destroy()
  })

  test('falls back to a no-op instance instead of throwing when shaders fail', () => {
    const fake = createFakeGl({ getProgramParameter: () => false, getProgramInfoLog: () => 'link error' })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const instance = createUpstream(createCanvas(fake.gl))
    expect(instance.supported).toBe(false)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('upstream-fx'), expect.any(Error))
    expect(requestFrame).not.toHaveBeenCalled()
    expect(() => instance.destroy()).not.toThrow()
  })

  test('releases the first program when the second one fails to build', () => {
    let links = 0
    const fake = createFakeGl({ getProgramParameter: (_p: never, pname: never) => (pname === 'LINK_STATUS' ? ++links === 1 : 0) })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    createUpstream(createCanvas(fake.gl))
    expect(fake.count('deleteProgram')).toBe(2) // the failed one and the one that linked
  })

  test('keeps compiled programs when only the streak count changes', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    instance.setOptions({ count: 10 })
    expect(fake.count('createProgram')).toBe(2)
    expect(fake.count('deleteProgram')).toBe(0)
    instance.destroy()
  })

  test('redraws immediately after a resize even while the loop is running', () => {
    let onResize: () => void = () => undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          onResize = callback
        }
        observe(): void {}
        disconnect(): void {}
      },
    )
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    const draws = fake.count('drawArrays')
    onResize()
    expect(fake.count('drawArrays')).toBe(draws + 2)
    instance.destroy()
  })

  test('uses the most recent intersection entry', () => {
    let onIntersect: (entries: { isIntersecting: boolean }[]) => void = () => undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof onIntersect) {
          onIntersect = callback
        }
        observe(): void {}
        disconnect(): void {}
      },
    )
    const instance = createUpstream(createCanvas(createFakeGl().gl))
    onIntersect([{ isIntersecting: false }, { isIntersecting: true }])
    expect(cancelFrame).not.toHaveBeenCalled()
    onIntersect([{ isIntersecting: true }, { isIntersecting: false }])
    expect(cancelFrame).toHaveBeenCalledTimes(1)
    instance.destroy()
  })

  test('ignores updates that do not change anything', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl), { speed: 30 })
    const before = fake.calls.length
    instance.setOptions({ speed: 30 })
    expect(fake.calls.length).toBe(before)
    instance.destroy()
  })

  test('stops the loop while the page is hidden and resumes when visible', () => {
    const instance = createUpstream(createCanvas(createFakeGl().gl))
    setVisibility('hidden')
    expect(cancelFrame).toHaveBeenCalledTimes(1)
    setVisibility('visible')
    expect(requestFrame).toHaveBeenCalledTimes(2)
    instance.destroy()
  })

  test('renders a single still frame when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    expect(requestFrame).not.toHaveBeenCalled()
    expect(fake.count('drawArrays')).toBeGreaterThan(0)
    instance.destroy()
  })

  test('stops when paused and not interactive', () => {
    const instance = createUpstream(createCanvas(createFakeGl().gl))
    instance.setOptions({ paused: true, interactive: false })
    expect(cancelFrame).toHaveBeenCalledTimes(1)
    instance.destroy()
  })

  test('recovers from a lost WebGL context', () => {
    const fake = createFakeGl()
    const canvas = createCanvas(fake.gl)
    const instance = createUpstream(canvas)
    const lost = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(lost)
    expect(lost.defaultPrevented).toBe(true)
    expect(cancelFrame).toHaveBeenCalledTimes(1)

    canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(fake.count('createProgram')).toBe(4)
    expect(requestFrame).toHaveBeenCalledTimes(2)
    instance.destroy()
  })

  test('advances the animation on each frame', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    const frame = requestFrame.mock.calls[0]?.[0]
    if (!frame) throw new Error("expected a scheduled frame")
    const draws = fake.count('drawArrays')
    frame(16)
    frame(32)
    expect(fake.count('drawArrays')).toBe(draws + 4)
    instance.destroy()
  })

  test('tracks the pointer without throwing', () => {
    const instance = createUpstream(createCanvas(createFakeGl().gl))
    expect(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }))
      window.dispatchEvent(new MouseEvent('pointerout', { relatedTarget: null }))
    }).not.toThrow()
    instance.destroy()
  })

  test('destroy releases GPU memory, stops the loop and is idempotent', () => {
    const fake = createFakeGl()
    const instance = createUpstream(createCanvas(fake.gl))
    instance.destroy()
    instance.destroy()
    expect(cancelFrame).toHaveBeenCalledTimes(1)
    expect(fake.count('deleteProgram')).toBe(2)
    expect(fake.count('deleteBuffer')).toBe(2)

    const drawsAfterDestroy = fake.count('drawArrays')
    setVisibility('visible')
    instance.setOptions({ speed: 5 })
    expect(fake.count('drawArrays')).toBe(drawsAfterDestroy)
  })
})
