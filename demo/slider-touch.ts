interface Track {
  readonly left: number
  readonly width: number
}

interface Range {
  readonly min: number
  readonly max: number
  readonly step: number
}

const decimalsOf = (step: number): number => (String(step).split('.')[1] ?? '').length

/**
 * Value under the finger, matching the native slider: the thumb's center
 * travels from `thumbWidth / 2` inside the left edge to the same inside the
 * right edge. Clamped to the range and snapped to the step.
 */
export function valueFromPosition(clientX: number, track: Track, thumbWidth: number, range: Range): number {
  const usable = Math.max(1, track.width - thumbWidth)
  const ratio = Math.min(1, Math.max(0, (clientX - track.left - thumbWidth / 2) / usable))
  const steps = Math.round((ratio * (range.max - range.min)) / range.step)
  const value = Math.min(range.max, range.min + steps * range.step)
  return Number(value.toFixed(decimalsOf(range.step)))
}

/**
 * Touch handling for `<input type="range">` on phones. The native slider only
 * drags from its thumb and lets the browser turn a slightly vertical first
 * move into a panel scroll, so it often ignores the first attempt. Here a
 * touch anywhere on the track jumps the value under the finger, and pointer
 * capture keeps the drag on the slider until the finger lifts, whatever
 * direction it drifts. The mouse keeps the native behavior.
 */
export function attachTouchSlider(input: HTMLInputElement, thumbWidth: number | (() => number)): void {
  let activePointer: number | null = null

  function setFrom(clientX: number): void {
    const range = { min: Number(input.min), max: Number(input.max), step: Number(input.step) || 1 }
    const thumb = typeof thumbWidth === 'function' ? thumbWidth() : thumbWidth
    const next = String(valueFromPosition(clientX, input.getBoundingClientRect(), thumb, range))
    if (next === input.value) return
    input.value = next
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  input.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return
    event.preventDefault()
    activePointer = event.pointerId
    // Jump first: if the browser refuses capture, the tap must still register.
    setFrom(event.clientX)
    try {
      input.setPointerCapture(event.pointerId)
    } catch {
      // Without capture the drag still works while the finger stays on the track.
    }
  })

  input.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer) setFrom(event.clientX)
  })

  const finish = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return
    activePointer = null
    try {
      if (input.hasPointerCapture(event.pointerId)) input.releasePointerCapture(event.pointerId)
    } catch {
      // Capture was never granted; nothing to release.
    }
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  input.addEventListener('pointerup', finish)
  input.addEventListener('pointercancel', finish)

  // Keep the native slider (and iOS's thumb-only dragging) out of touch gestures entirely.
  input.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false })
}
