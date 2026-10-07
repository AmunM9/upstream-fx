import { parseColor, type Rgba } from './color'
import { computeLayout } from './geometry'
import { needsRebuild, optionsEqual, resolveOptions, type UpstreamOptions, type UpstreamOptionsInput } from './options'
import { createPointerTracker } from './pointer'
import { createRenderer, type Renderer, type Uniforms } from './renderer'

export interface UpstreamInstance {
  /** False when WebGL is unavailable or failed to initialize; the instance is then a harmless no-op. */
  readonly supported: boolean
  /** Merges new options over the current ones. */
  setOptions(input: UpstreamOptionsInput): void
  /** Stops the loop, removes listeners and frees GPU memory. Safe to call twice. */
  destroy(): void
}

const MAX_PIXEL_RATIO = 2
const MAX_FRAME_SECONDS = 1 / 20
const DEG_TO_RAD = Math.PI / 180
const DEFAULT_COLOR: Rgba = [0, 0, 0, 1]

const NOOP_INSTANCE: UpstreamInstance = Object.freeze({
  supported: false,
  setOptions: () => undefined,
  destroy: () => undefined,
})

interface Palette {
  readonly background: Rgba
  readonly base: Rgba
  readonly accent: Rgba
}

function getContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  try {
    return canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    })
  } catch {
    return null
  }
}

function warnFallback(error: unknown): void {
  // A decorative background must never take the page down; report and degrade.
  console.warn('upstream-fx: WebGL setup failed, showing the background color only.', error)
}

function tryCreateRenderer(gl: WebGLRenderingContext, count: number): Renderer | null {
  try {
    return createRenderer(gl, count)
  } catch (error: unknown) {
    if (!gl.isContextLost()) warnFallback(error)
    return null
  }
}

function toPalette(options: UpstreamOptions): Palette {
  const color = (value: string): Rgba => parseColor(value) ?? DEFAULT_COLOR
  return { background: color(options.background), base: color(options.baseColor), accent: color(options.accentColor) }
}

const rgb = (color: Rgba): readonly [number, number, number] => [color[0], color[1], color[2]]

/** Calls `onChange` whenever the device pixel ratio changes (zoom, moving to another monitor). */
function watchPixelRatio(onChange: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => undefined
  let query = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
  const handle = (): void => {
    query.removeEventListener('change', handle)
    query = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    query.addEventListener('change', handle)
    onChange()
  }
  query.addEventListener('change', handle)
  return () => query.removeEventListener('change', handle)
}

/**
 * Mounts the effect on a canvas. The canvas is sized from its CSS box, so give
 * it a width and height (for example `position:absolute; inset:0`).
 */
export function createUpstream(canvas: HTMLCanvasElement, input: UpstreamOptionsInput = {}): UpstreamInstance {
  const gl = getContext(canvas)
  if (!gl) return NOOP_INSTANCE
  let options = resolveOptions(input)
  let renderer = tryCreateRenderer(gl, options.count)
  if (!renderer) return NOOP_INSTANCE

  const context: WebGLRenderingContext = gl
  const pointer = createPointerTracker(canvas)
  const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  const cleanups: (() => void)[] = [() => pointer.dispose()]
  let palette = toPalette(options)
  let size = { width: 1, height: 1, pixelRatio: 1 }
  let time = 0
  let frameId = 0
  let lastFrame = 0
  let destroyed = false
  let onScreen = true
  let pageVisible = document.visibilityState !== 'hidden'

  function listen(target: EventTarget, type: string, handler: EventListener, opts?: AddEventListenerOptions): void {
    target.addEventListener(type, handler, opts)
    cleanups.push(() => target.removeEventListener(type, handler, opts))
  }

  function uniforms(): Uniforms {
    const { origin, reach } = computeLayout(size.width, size.height)
    return {
      u_resolution: [size.width, size.height],
      u_origin: origin,
      u_reach: reach,
      u_time: time,
      u_speed: options.speed,
      u_maxLength: options.length,
      u_spread: options.spread * DEG_TO_RAD,
      u_coneRatio: options.coneRatio,
      u_pointer: [pointer.x, pointer.y],
      u_influence: pointer.influence,
      u_repelRadius: options.repelRadius,
      u_repelSoftness: options.repelSoftness,
      u_baseColor: rgb(palette.base),
      u_accentColor: rgb(palette.accent),
      u_intensity: options.intensity,
      u_pixelRatio: size.pixelRatio,
      u_lineWidth: options.lineWidth,
    }
  }

  function render(): void {
    renderer?.draw(palette.background, uniforms(), options.dotSize)
  }

  function frame(now: number): void {
    const dt = lastFrame === 0 ? 0 : Math.min((now - lastFrame) / 1000, MAX_FRAME_SECONDS)
    lastFrame = now
    if (!options.paused) time += dt
    pointer.step(dt, options.interactive)
    render()
    frameId = requestAnimationFrame(frame)
  }

  function isReducedMotion(): boolean {
    return reducedMotion?.matches ?? false
  }

  function shouldAnimate(): boolean {
    const moving = !options.paused || options.interactive
    return !destroyed && renderer !== null && onScreen && pageVisible && !isReducedMotion() && moving
  }

  /** Starts or stops the rAF loop to match the current state; renders a still frame when stopped. */
  function syncLoop(): void {
    if (shouldAnimate()) {
      if (frameId === 0) {
        lastFrame = 0
        frameId = requestAnimationFrame(frame)
      }
      return
    }
    if (frameId !== 0) cancelAnimationFrame(frameId)
    frameId = 0
    // The pointer can no longer fade out on its own; don't freeze a hole into the still frame.
    if (!options.interactive || isReducedMotion()) pointer.reset()
    if (!destroyed) render()
  }

  function resize(): void {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    size = { width, height, pixelRatio }
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    context.viewport(0, 0, canvas.width, canvas.height)
    // Resizing clears the drawing buffer; redraw now so a running loop never shows a blank frame.
    render()
  }

  function onContextLost(event: Event): void {
    event.preventDefault()
    renderer = null // its GPU objects died with the context
    syncLoop()
  }

  function onContextRestored(): void {
    renderer = tryCreateRenderer(context, options.count)
    resize()
    syncLoop()
  }

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    cleanups.push(() => observer.disconnect())
  } else {
    listen(window, 'resize', resize)
  }
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.at(-1)?.isIntersecting ?? true
      syncLoop()
    })
    observer.observe(canvas)
    cleanups.push(() => observer.disconnect())
  }
  cleanups.push(watchPixelRatio(resize))
  listen(document, 'visibilitychange', () => {
    pageVisible = document.visibilityState !== 'hidden'
    syncLoop()
  })
  if (reducedMotion) listen(reducedMotion, 'change', syncLoop)
  listen(canvas, 'webglcontextlost', onContextLost)
  listen(canvas, 'webglcontextrestored', onContextRestored)
  resize()
  syncLoop()

  return {
    supported: true,
    setOptions(nextInput: UpstreamOptionsInput): void {
      if (destroyed) return
      const next = resolveOptions(nextInput, options)
      if (optionsEqual(options, next)) return
      if (needsRebuild(options, next)) {
        try {
          renderer?.setStreakCount(next.count)
        } catch (error: unknown) {
          warnFallback(error) // keeps the previous buffers
        }
      }
      options = next
      palette = toPalette(next)
      syncLoop()
    },
    destroy(): void {
      if (destroyed) return
      destroyed = true
      if (frameId !== 0) cancelAnimationFrame(frameId)
      frameId = 0
      cleanups.forEach((cleanup) => cleanup())
      renderer?.dispose()
      renderer = null
    },
  }
}
