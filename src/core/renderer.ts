import type { Rgba } from './color'
import {
  DOT_LAYOUT,
  LINE_LAYOUT,
  VERTICES_PER_STREAK,
  buildDotBuffer,
  buildLineBuffer,
  createRandom,
  createStreakSeeds,
} from './geometry'
import {
  applyUniforms,
  bindAttributes,
  createProgram,
  createStaticBuffer,
  unbindAttributes,
  type Program,
  type UniformValue,
} from './gl'
import { DOT_FRAGMENT, DOT_VERTEX, LINE_FRAGMENT, LINE_VERTEX } from './shaders'

const FIELD_SEED = 0x5eed
/** Must match GLOW_SCALE in the dot vertex shader. */
const DOT_GLOW_SCALE = 3

export type Uniforms = Readonly<Record<string, UniformValue>>

/** Owns every GPU object. Programs live as long as the renderer; buffers are rebuilt when the count changes. */
export interface Renderer {
  setStreakCount(count: number): void
  draw(background: Rgba, uniforms: Uniforms, dotSize: number): void
  dispose(): void
}

interface Buffers {
  readonly line: WebGLBuffer
  readonly dot: WebGLBuffer
  readonly count: number
}

function createBuffers(gl: WebGLRenderingContext, count: number): Buffers {
  const seeds = createStreakSeeds(count, createRandom(FIELD_SEED))
  const line = createStaticBuffer(gl, buildLineBuffer(seeds))
  try {
    return { line, dot: createStaticBuffer(gl, buildDotBuffer(seeds)), count: seeds.length }
  } catch (error: unknown) {
    gl.deleteBuffer(line)
    throw error
  }
}

function createPrograms(gl: WebGLRenderingContext): readonly [Program, Program] {
  const line = createProgram(gl, LINE_VERTEX, LINE_FRAGMENT)
  try {
    return [line, createProgram(gl, DOT_VERTEX, DOT_FRAGMENT)]
  } catch (error: unknown) {
    gl.deleteProgram(line.handle)
    throw error
  }
}

function drawPass(
  gl: WebGLRenderingContext,
  program: Program,
  buffer: WebGLBuffer,
  pass: { readonly layout: typeof LINE_LAYOUT; readonly mode: number; readonly vertices: number; readonly uniforms: Uniforms },
): void {
  gl.useProgram(program.handle)
  applyUniforms(gl, program, pass.uniforms)
  bindAttributes(gl, program, buffer, pass.layout)
  gl.drawArrays(pass.mode, 0, pass.vertices)
  unbindAttributes(gl, program)
}

/** Builds programs and buffers. Throws if any step fails, after releasing whatever it had created. */
export function createRenderer(gl: WebGLRenderingContext, count: number): Renderer {
  const [lineProgram, dotProgram] = createPrograms(gl)
  let buffers: Buffers
  try {
    buffers = createBuffers(gl, count)
  } catch (error: unknown) {
    gl.deleteProgram(lineProgram.handle)
    gl.deleteProgram(dotProgram.handle)
    throw error
  }
  const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as ArrayLike<number> | null
  const maxPointSize = pointSizeRange?.[1] ?? Number.POSITIVE_INFINITY

  return {
    setStreakCount(next: number): void {
      if (next === buffers.count) return
      const replacement = createBuffers(gl, next)
      gl.deleteBuffer(buffers.line)
      gl.deleteBuffer(buffers.dot)
      buffers = replacement
    },
    draw(background: Rgba, uniforms: Uniforms, dotSize: number): void {
      const [r, g, b, a] = background
      gl.clearColor(r * a, g * a, b * a, a)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE) // additive: overlapping streaks glow

      const vertices = buffers.count * VERTICES_PER_STREAK
      drawPass(gl, lineProgram, buffers.line, { layout: LINE_LAYOUT, mode: gl.TRIANGLES, vertices, uniforms })
      if (dotSize <= 0) return

      // Some GPUs cap point sprites (often at 64 px); shrink the dot rather than clip its glow.
      const pixelRatio = typeof uniforms.u_pixelRatio === 'number' ? uniforms.u_pixelRatio : 1
      const fittedSize = Math.min(dotSize, maxPointSize / (pixelRatio * DOT_GLOW_SCALE))
      drawPass(gl, dotProgram, buffers.dot, {
        layout: DOT_LAYOUT,
        mode: gl.POINTS,
        vertices: buffers.count,
        uniforms: { ...uniforms, u_dotSize: fittedSize },
      })
    },
    dispose(): void {
      gl.deleteProgram(lineProgram.handle)
      gl.deleteProgram(dotProgram.handle)
      gl.deleteBuffer(buffers.line)
      gl.deleteBuffer(buffers.dot)
    },
  }
}
