/** Script-tag build: registers <upstream-fx> and exposes `window.Upstream`. */
import { defineUpstreamElement } from './element/UpstreamElement'

// Called here rather than relying on register.ts: package.json "sideEffects"
// lets the bundler drop side effects of imported modules, but never of the entry.
defineUpstreamElement()

export { createUpstream } from './core/engine'
export { DEFAULT_OPTIONS } from './core/options'
export { defineUpstreamElement }
