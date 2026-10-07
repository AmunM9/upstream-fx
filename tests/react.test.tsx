// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

const setOptions = vi.fn()
const destroy = vi.fn()
const createUpstream = vi.fn((_canvas: HTMLCanvasElement, _options?: unknown) => ({ supported: true, setOptions, destroy }))

vi.mock('../src/core/engine', () => ({ createUpstream }))

const { Upstream } = await import('../src/react/Upstream')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('<Upstream />', () => {
  test('renders a decorative canvas behind its children', () => {
    render(
      <Upstream>
        <h1>Hello</h1>
      </Upstream>,
    )
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeTruthy()
    const canvas = document.querySelector('canvas')
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
  })

  test('mounts the engine once with the resolved options', () => {
    render(<Upstream speed={42} />)
    expect(createUpstream).toHaveBeenCalledTimes(1)
    expect(createUpstream.mock.calls[0]?.[1]).toMatchObject({ speed: 42 })
  })

  test('pushes prop changes to the running engine instead of remounting', () => {
    const { rerender } = render(<Upstream speed={42} />)
    rerender(<Upstream speed={10} />)
    expect(createUpstream).toHaveBeenCalledTimes(1)
    expect(setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ speed: 10 }))
  })

  test('resets a removed prop back to its default', () => {
    const { rerender } = render(<Upstream speed={42} />)
    rerender(<Upstream />)
    expect(setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ speed: 70 }))
  })

  test('paints the background color on the container so it shows without WebGL', () => {
    const { container } = render(<Upstream background="#101010" />)
    expect((container.firstElementChild as HTMLElement).style.background).toBe('rgb(16, 16, 16)')
  })

  test('forwards DOM attributes such as id and aria-label to the container', () => {
    const { container } = render(<Upstream id="hero" aria-label="Animated background" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.id).toBe('hero')
    expect(root.getAttribute('aria-label')).toBe('Animated background')
    expect(createUpstream.mock.calls[0]?.[1]).not.toHaveProperty('id')
  })

  test('destroys the engine on unmount', () => {
    const { unmount } = render(<Upstream />)
    unmount()
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
