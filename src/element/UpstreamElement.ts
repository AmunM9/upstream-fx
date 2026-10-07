import { createUpstream, type UpstreamInstance } from '../core/engine'
import { parseOptionValue, resolveOptions, type UpstreamOptions, type UpstreamOptionsInput } from '../core/options'

export const DEFAULT_TAG_NAME = 'upstream-fx'

const ATTRIBUTES: Readonly<Record<string, keyof UpstreamOptions>> = {
  background: 'background',
  'base-color': 'baseColor',
  'accent-color': 'accentColor',
  count: 'count',
  speed: 'speed',
  length: 'length',
  spread: 'spread',
  'cone-ratio': 'coneRatio',
  'line-width': 'lineWidth',
  'dot-size': 'dotSize',
  'repel-radius': 'repelRadius',
  'repel-softness': 'repelSoftness',
  intensity: 'intensity',
  interactive: 'interactive',
  paused: 'paused',
}

/** Reads every supported attribute; missing or blank ones are left out so defaults apply. */
export function attributesToOptions(element: Element): UpstreamOptionsInput {
  const entries = Object.entries(ATTRIBUTES).flatMap(([attribute, key]) => {
    const raw = element.getAttribute(attribute)
    const value = raw === null ? undefined : parseOptionValue(key, raw)
    return value === undefined ? [] : [[key, value] as const]
  })
  return Object.fromEntries(entries) as UpstreamOptionsInput
}

const SHADOW_STYLE = `
  :host { display: block; position: relative; overflow: hidden; isolation: isolate; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: -1; pointer-events: none; }
`

function createElementClass(): CustomElementConstructor {
  return class UpstreamElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return Object.keys(ATTRIBUTES)
    }

    private instance: UpstreamInstance | null = null
    private readonly canvas: HTMLCanvasElement
    private readonly hostStyle: HTMLStyleElement

    constructor() {
      super()
      const root = this.attachShadow({ mode: 'open' })
      const baseStyle = document.createElement('style')
      baseStyle.textContent = SHADOW_STYLE
      this.hostStyle = document.createElement('style')
      this.canvas = document.createElement('canvas')
      this.canvas.setAttribute('aria-hidden', 'true')
      root.append(baseStyle, this.hostStyle, this.canvas, document.createElement('slot'))
    }

    connectedCallback(): void {
      const options = this.currentOptions()
      this.instance ??= createUpstream(this.canvas, options)
    }

    disconnectedCallback(): void {
      this.instance?.destroy()
      this.instance = null
    }

    attributeChangedCallback(): void {
      const options = this.currentOptions()
      this.instance?.setOptions(options)
    }

    /** Resolves against the defaults so a removed attribute restores its default value. */
    private currentOptions(): UpstreamOptions {
      const options = resolveOptions(attributesToOptions(this))
      this.hostStyle.textContent = `:host { background: ${options.background}; }`
      return options
    }
  }
}

/** Registers `<upstream-fx>` (or a custom tag). Safe to call repeatedly and during SSR. */
export function defineUpstreamElement(tagName: string = DEFAULT_TAG_NAME): void {
  if (typeof window === 'undefined' || !('customElements' in window)) return
  if (customElements.get(tagName)) return
  customElements.define(tagName, createElementClass())
}
