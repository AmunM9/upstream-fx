// Runs the built script-tag bundle in jsdom and checks that it registers <upstream-fx>.
import { readFile } from 'node:fs/promises'
import { JSDOM, VirtualConsole } from 'jsdom'

const bundle = await readFile(new URL('../dist/upstream.global.js', import.meta.url), 'utf8')
const errors = []
const virtualConsole = new VirtualConsole()
// jsdom has no WebGL, so getContext reports "not implemented" and the element falls back to a no-op engine.
virtualConsole.on('jsdomError', (error) => {
  if (!String(error.message).includes('getContext')) errors.push(error.message)
})
virtualConsole.on('error', (message) => errors.push(String(message)))
const dom = new JSDOM('<!doctype html><upstream-fx speed="10"></upstream-fx>', { runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole })
try {
  dom.window.eval(bundle)
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error))
}

const element = dom.window.document.querySelector('upstream-fx')
const checks = {
  'window.Upstream.createUpstream': typeof dom.window.Upstream?.createUpstream === 'function',
  'custom element registered': Boolean(dom.window.customElements.get('upstream-fx')),
  'element upgraded with shadow canvas': Boolean(element?.shadowRoot?.querySelector('canvas')),
  'no runtime errors': errors.length === 0,
}
const failed = Object.entries(checks).filter(([, ok]) => !ok)
for (const [name, ok] of Object.entries(checks)) process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}\n`)
if (errors.length > 0) process.stdout.write(`errors:\n  ${errors.join('\n  ')}\n`)
if (failed.length > 0) process.exit(1)
