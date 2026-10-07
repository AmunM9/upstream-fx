/**
 * Exponential smoothing toward `target`. `rate` is in 1/s, `dt` in seconds.
 * Frame-rate independent: two half steps equal one full step.
 */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt)
}
