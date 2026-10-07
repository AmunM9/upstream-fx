'use client'

import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactElement } from 'react'
import { createUpstream, type UpstreamInstance } from '../core/engine'
import { DEFAULT_OPTIONS, resolveOptions, type UpstreamOptions, type UpstreamOptionsInput } from '../core/options'

export type UpstreamProps = UpstreamOptionsInput & Omit<HTMLAttributes<HTMLDivElement>, keyof UpstreamOptions>

const OPTION_KEYS: ReadonlySet<string> = new Set(Object.keys(DEFAULT_OPTIONS))

const CANVAS_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  zIndex: -1,
  pointerEvents: 'none',
}

/** Separates effect options from the attributes forwarded to the container element. */
function splitProps(props: UpstreamProps): readonly [UpstreamOptionsInput, HTMLAttributes<HTMLDivElement>] {
  const entries = Object.entries(props)
  return [
    Object.fromEntries(entries.filter(([key]) => OPTION_KEYS.has(key))) as UpstreamOptionsInput,
    Object.fromEntries(entries.filter(([key]) => !OPTION_KEYS.has(key))) as HTMLAttributes<HTMLDivElement>,
  ]
}

/**
 * Animated background of streaks fanning upward. Size it like any block
 * element (for example `style={{ height: '100vh' }}`); children render on top.
 */
export function Upstream(props: UpstreamProps): ReactElement {
  const [options, { style, children, ...rest }] = splitProps(props)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<UpstreamInstance | null>(null)
  // Resolved against the defaults on every render, so removing a prop restores its default.
  const resolved = resolveOptions(options)
  const initialOptions = useRef(resolved)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const instance = createUpstream(canvas, initialOptions.current)
    instanceRef.current = instance
    return () => {
      instance.destroy()
      instanceRef.current = null
    }
  }, [])

  // Runs after every render; the engine skips the update when nothing changed.
  useEffect(() => {
    instanceRef.current?.setOptions(resolved)
  })

  return (
    <div
      {...rest}
      style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', background: resolved.background, ...style }}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={CANVAS_STYLE} />
      {children}
    </div>
  )
}
