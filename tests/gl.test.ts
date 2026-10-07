import { describe, expect, test } from 'vitest'
import { applyUniforms, bindAttributes, createProgram, createStaticBuffer, type Program } from '../src/core/gl'
import { createFakeGl } from './helpers/fake-webgl'

const programWith = (uniforms: string[], attributes: string[]): Program => ({
  handle: {} as WebGLProgram,
  uniforms: new Map(uniforms.map((name) => [name, {} as WebGLUniformLocation])),
  attributes: new Map(attributes.map((name, index) => [name, index])),
})

describe('createProgram', () => {
  test('indexes active uniforms and attributes', () => {
    const fake = createFakeGl({
      getProgramParameter: (_p: never, pname: never) =>
        pname === 'LINK_STATUS' ? true : pname === 'ACTIVE_UNIFORMS' ? 2 : 1,
      getActiveUniform: (_p: never, index: never) => ({ name: index === 0 ? 'u_time' : 'u_speed' }),
      getActiveAttrib: () => ({ name: 'a_seed' }),
      getAttribLocation: () => 3,
    })
    const program = createProgram(fake.gl, 'v', 'f')
    expect([...program.uniforms.keys()]).toEqual(['u_time', 'u_speed'])
    expect(program.attributes.get('a_seed')).toBe(3)
  })

  test('throws with the driver log when a shader fails to compile', () => {
    const fake = createFakeGl({ getShaderParameter: () => false, getShaderInfoLog: () => 'ERROR: 0:1 syntax' })
    expect(() => createProgram(fake.gl, 'v', 'f')).toThrow(/shader compilation failed\nERROR: 0:1 syntax/)
    expect(fake.count('deleteShader')).toBe(1)
  })

  test('deletes the compiled vertex shader when the fragment shader fails', () => {
    let compiled = 0
    const fake = createFakeGl({ getShaderParameter: () => ++compiled === 1, getShaderInfoLog: () => 'bad fragment' })
    expect(() => createProgram(fake.gl, 'v', 'f')).toThrow(/bad fragment/)
    expect(fake.count('deleteShader')).toBe(2)
  })

  test('throws with the driver log when linking fails', () => {
    const fake = createFakeGl({ getProgramParameter: () => false, getProgramInfoLog: () => 'link error' })
    expect(() => createProgram(fake.gl, 'v', 'f')).toThrow(/program link failed\nlink error/)
    expect(fake.count('deleteProgram')).toBe(1)
  })

  test('does not throw on compile status when the context is already lost', () => {
    const fake = createFakeGl({ getShaderParameter: () => false, getProgramParameter: () => 0, isContextLost: () => true })
    expect(() => createProgram(fake.gl, 'v', 'f')).not.toThrow()
  })

  test('throws when the driver cannot allocate a shader or a program', () => {
    expect(() => createProgram(createFakeGl({ createShader: () => null }).gl, 'v', 'f')).toThrow(/allocate a WebGL shader/)
    expect(() => createProgram(createFakeGl({ createProgram: () => null }).gl, 'v', 'f')).toThrow(/allocate a WebGL program/)
  })
})

describe('createStaticBuffer', () => {
  test('throws when the driver cannot allocate a buffer', () => {
    expect(() => createStaticBuffer(createFakeGl({ createBuffer: () => null }).gl, new Float32Array(1))).toThrow(
      /allocate a WebGL buffer/,
    )
  })
})

describe('applyUniforms', () => {
  test('dispatches by value arity and skips unknown names', () => {
    const fake = createFakeGl()
    applyUniforms(fake.gl, programWith(['a', 'b', 'c'], []), { a: 1, b: [1, 2], c: [1, 2, 3], missing: 4 })
    expect(fake.calls).toEqual(['uniform1f', 'uniform2f', 'uniform3f'])
  })
})

describe('bindAttributes', () => {
  test('enables only attributes the program uses', () => {
    const fake = createFakeGl()
    const layout = [
      { name: 'a_seed', size: 1 },
      { name: 'a_unused', size: 2 },
    ]
    bindAttributes(fake.gl, programWith([], ['a_seed']), {} as WebGLBuffer, layout)
    expect(fake.count('enableVertexAttribArray')).toBe(1)
    expect(fake.count('vertexAttribPointer')).toBe(1)
  })
})
