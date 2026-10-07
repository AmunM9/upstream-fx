import { vi } from 'vitest'

export interface FakeGl {
  readonly gl: WebGLRenderingContext
  /** Names of every method called on the context, in order. */
  readonly calls: string[]
  count(method: string): number
}

/**
 * Minimal stand-in for a WebGL context: constants resolve to their own names,
 * status queries succeed, and every other method is recorded and returns a
 * fresh handle object.
 */
export function createFakeGl(custom: Readonly<Record<string, (...args: never[]) => unknown>> = {}): FakeGl {
  const calls: string[] = []
  const overrides: Record<string, unknown> = {
    getShaderParameter: () => true,
    getProgramParameter: (_program: unknown, pname: unknown) => (pname === 'LINK_STATUS' ? true : 0),
    isContextLost: () => false,
    ...custom,
  }
  const gl = new Proxy(overrides, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined
      if (/^[A-Z0-9_]+$/.test(prop)) return prop
      const override = target[prop]
      return (...args: unknown[]) => {
        calls.push(prop)
        return typeof override === 'function' ? override(...args) : {}
      }
    },
  }) as unknown as WebGLRenderingContext
  return { gl, calls, count: (method) => calls.filter((name) => name === method).length }
}

export function createCanvas(context: WebGLRenderingContext | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as RenderingContext)
  return canvas
}
