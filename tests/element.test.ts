// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'

const setOptions = vi.fn()
const destroy = vi.fn()
const createUpstream = vi.fn((_canvas: HTMLCanvasElement, _options?: unknown) => ({ supported: true, setOptions, destroy }))

vi.mock('../src/core/engine', () => ({ createUpstream }))

const { defineUpstreamElement, attributesToOptions } = await import('../src/element/UpstreamElement')

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('attributesToOptions', () => {
  test('maps kebab-case attributes to typed options', () => {
    const element = document.createElement('div')
    element.setAttribute('accent-color', '#ff0000')
    element.setAttribute('count', '300')
    element.setAttribute('repel-softness', '0.8')
    element.setAttribute('interactive', 'false')
    element.setAttribute('paused', '')
    expect(attributesToOptions(element)).toEqual({
      accentColor: '#ff0000',
      count: 300,
      repelSoftness: 0.8,
      interactive: false,
      paused: true,
    })
  })

  test('ignores blank numeric attributes instead of reading them as 0', () => {
    const element = document.createElement('div')
    element.setAttribute('speed', '')
    element.setAttribute('interactive', '0')
    expect(attributesToOptions(element)).toEqual({ interactive: false })
  })

  test('omits attributes that are not set', () => {
    expect(attributesToOptions(document.createElement('div'))).toEqual({})
  })
})

describe('<upstream-fx>', () => {
  test('registers once and tolerates repeated calls', () => {
    defineUpstreamElement()
    expect(() => defineUpstreamElement()).not.toThrow()
    expect(customElements.get('upstream-fx')).toBeDefined()
  })

  test('mounts the engine on a shadow canvas when connected', () => {
    defineUpstreamElement()
    const element = document.createElement('upstream-fx')
    element.setAttribute('speed', '33')
    document.body.append(element)
    expect(createUpstream).toHaveBeenCalledTimes(1)
    expect(element.shadowRoot?.querySelector('canvas')).toBeTruthy()
    expect(createUpstream.mock.calls[0]?.[1]).toMatchObject({ speed: 33 })
  })

  test('forwards attribute changes to the engine', () => {
    defineUpstreamElement()
    const element = document.createElement('upstream-fx')
    document.body.append(element)
    element.setAttribute('accent-color', '#00ff00')
    expect(setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ accentColor: '#00ff00' }))
  })

  test('restores the default when an attribute is removed', () => {
    defineUpstreamElement()
    const element = document.createElement('upstream-fx')
    element.setAttribute('speed', '5')
    document.body.append(element)
    element.removeAttribute('speed')
    expect(setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ speed: 70 }))
  })

  test('destroys the engine when removed from the page', () => {
    defineUpstreamElement()
    const element = document.createElement('upstream-fx')
    document.body.append(element)
    element.remove()
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
