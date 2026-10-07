export interface Program {
  readonly handle: WebGLProgram
  readonly uniforms: ReadonlyMap<string, WebGLUniformLocation>
  readonly attributes: ReadonlyMap<string, number>
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('upstream-fx: could not allocate a WebGL shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`upstream-fx: shader compilation failed\n${log ?? ''}`)
  }
  return shader
}

/** Compiles and links a program, then indexes every active uniform and attribute. */
export function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): Program {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  let fragment: WebGLShader
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  } catch (error: unknown) {
    gl.deleteShader(vertex)
    throw error
  }
  const handle = gl.createProgram()
  if (!handle) {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    throw new Error('upstream-fx: could not allocate a WebGL program')
  }

  gl.attachShader(handle, vertex)
  gl.attachShader(handle, fragment)
  gl.linkProgram(handle)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(handle, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(handle)
    gl.deleteProgram(handle)
    throw new Error(`upstream-fx: program link failed\n${log ?? ''}`)
  }

  const uniformCount = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS) as number
  const uniforms = new Map<string, WebGLUniformLocation>()
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(handle, i)
    const location = info && gl.getUniformLocation(handle, info.name)
    if (info && location) uniforms.set(info.name, location)
  }

  const attributeCount = gl.getProgramParameter(handle, gl.ACTIVE_ATTRIBUTES) as number
  const attributes = new Map<string, number>()
  for (let i = 0; i < attributeCount; i++) {
    const info = gl.getActiveAttrib(handle, i)
    if (info) attributes.set(info.name, gl.getAttribLocation(handle, info.name))
  }

  return { handle, uniforms, attributes }
}

export interface AttributeLayout {
  readonly name: string
  readonly size: number
}

/**
 * Binds an interleaved float buffer to the program's attributes.
 * Attributes the compiler optimized away are skipped silently.
 */
export function bindAttributes(
  gl: WebGLRenderingContext,
  program: Program,
  buffer: WebGLBuffer,
  layout: readonly AttributeLayout[],
): void {
  const stride = layout.reduce((sum, attribute) => sum + attribute.size, 0) * Float32Array.BYTES_PER_ELEMENT
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  layout.reduce((offset, attribute) => {
    const location = program.attributes.get(attribute.name)
    if (location !== undefined) {
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, attribute.size, gl.FLOAT, false, stride, offset)
    }
    return offset + attribute.size * Float32Array.BYTES_PER_ELEMENT
  }, 0)
}

/** Disables the program's attribute arrays so the next program starts from a clean state. */
export function unbindAttributes(gl: WebGLRenderingContext, program: Program): void {
  program.attributes.forEach((location) => gl.disableVertexAttribArray(location))
}

export type UniformValue = number | readonly [number, number] | readonly [number, number, number]

/** Sets float uniforms by name; names the compiler optimized away are ignored. */
export function applyUniforms(
  gl: WebGLRenderingContext,
  program: Program,
  values: Readonly<Record<string, UniformValue>>,
): void {
  for (const [name, value] of Object.entries(values)) {
    const location = program.uniforms.get(name)
    if (!location) continue
    if (typeof value === 'number') gl.uniform1f(location, value)
    else if (value.length === 2) gl.uniform2f(location, value[0], value[1])
    else gl.uniform3f(location, value[0], value[1], value[2])
  }
}

export function createStaticBuffer(gl: WebGLRenderingContext, data: Float32Array): WebGLBuffer {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('upstream-fx: could not allocate a WebGL buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  return buffer
}
