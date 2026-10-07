import { approach } from './motion'

// Slow enough that the gap trails the cursor slightly, like the reference effect.
const FOLLOW_RATE = 8
const INFLUENCE_RATE = 5
const ENTRY_THRESHOLD = 0.01

/** Smoothed pointer position (CSS px, relative to the canvas) and repulsion strength (0–1). */
export interface PointerTracker {
  readonly x: number
  readonly y: number
  readonly influence: number
  /** Advances the smoothing; `enabled` false fades the influence out. */
  step(dt: number, enabled: boolean): void
  /** Drops the influence to 0 at once, e.g. before rendering a final still frame. */
  reset(): void
  dispose(): void
}

/** Tracks the pointer over a canvas through window-level listeners, so overlaid content never blocks it. */
export function createPointerTracker(canvas: HTMLCanvasElement): PointerTracker {
  const state = { x: 0, y: 0, targetX: 0, targetY: 0, influence: 0, inside: false }
  let client: { x: number; y: number } | null = null

  function locate(): void {
    if (!client) return
    const rect = canvas.getBoundingClientRect()
    const x = client.x - rect.left
    const y = client.y - rect.top
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
    state.targetX = x
    state.targetY = y
    // Re-entering after the field faded out: jump there instead of sweeping across.
    if (inside && state.influence < ENTRY_THRESHOLD) {
      state.x = x
      state.y = y
    }
    state.inside = inside
  }

  function onMove(event: PointerEvent): void {
    client = { x: event.clientX, y: event.clientY }
    locate()
  }

  function onExit(event: PointerEvent): void {
    const leftWindow = event.type === 'pointerout' && event.relatedTarget === null
    const liftedTouch = event.type !== 'pointerout' && event.pointerType !== 'mouse'
    if (leftWindow || liftedTouch) {
      state.inside = false
      client = null
    }
  }

  const listeners: readonly [string, (event: never) => void][] = [
    ['pointermove', onMove],
    ['pointerdown', onMove],
    ['pointerout', onExit],
    ['pointerup', onExit],
    ['pointercancel', onExit],
    ['scroll', locate], // the page moves under a still cursor
  ]
  listeners.forEach(([type, handler]) => window.addEventListener(type, handler as EventListener, { passive: true, capture: true }))

  return {
    get x() {
      return state.x
    },
    get y() {
      return state.y
    },
    get influence() {
      return state.influence
    },
    step(dt: number, enabled: boolean): void {
      state.x = approach(state.x, state.targetX, FOLLOW_RATE, dt)
      state.y = approach(state.y, state.targetY, FOLLOW_RATE, dt)
      state.influence = approach(state.influence, enabled && state.inside ? 1 : 0, INFLUENCE_RATE, dt)
    },
    reset(): void {
      state.influence = 0
    },
    dispose(): void {
      listeners.forEach(([type, handler]) => window.removeEventListener(type, handler as EventListener, { capture: true }))
    },
  }
}
