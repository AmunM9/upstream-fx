import packageJson from '../package.json'
import { DEFAULT_OPTIONS, type UpstreamOptions } from '../src/core/options'

export type SnippetFormat = 'react' | 'html' | 'vanilla' | 'shadcn'

// Everything below is served straight from the GitHub repo, so the snippets work
// without publishing to npm. Pinned to the release tag so a later change never
// alters a site that already copied a snippet.
const REPO = 'AmunM9/upstream-fx'
const TAG = `v${packageJson.version}`
const INSTALL_COMMAND = `npm install github:${REPO}`
const CDN_URL = `https://cdn.jsdelivr.net/gh/${REPO}@${TAG}/dist/upstream.global.js`
export const REGISTRY_URL = `https://raw.githubusercontent.com/${REPO}/${TAG}/public/r/upstream.json`
const SNIPPET_PRECISION = 3

type Entry = readonly [keyof UpstreamOptions, UpstreamOptions[keyof UpstreamOptions]]

const round = (value: number): number => Number(value.toFixed(SNIPPET_PRECISION))
const kebab = (key: string): string => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

/** Options that differ from the defaults, sorted by name, with floats rounded. */
export function changedOptions(options: UpstreamOptions): readonly Entry[] {
  return (Object.keys(options) as (keyof UpstreamOptions)[])
    .filter((key) => options[key] !== DEFAULT_OPTIONS[key])
    .sort()
    .map((key) => {
      const value = options[key]
      return [key, typeof value === 'number' ? round(value) : value] as const
    })
}

function reactSnippet(entries: readonly Entry[]): string {
  const props = entries.map(([key, value]) => (typeof value === 'string' ? `${key}="${value}"` : `${key}={${value}}`))
  const attributes = [...props, "style={{ height: '100vh' }}"]
  const body = attributes.length > 2 ? `\n  ${attributes.join('\n  ')}\n/>` : ` ${attributes.join(' ')} />`
  return `// ${INSTALL_COMMAND}\nimport { Upstream } from 'upstream-fx/react'\n\nexport function Hero() {\n  return <Upstream${body.replace(/\n/g, '\n  ')}\n}`
}

function htmlSnippet(entries: readonly Entry[]): string {
  const attributes = entries.map(([key, value]) => `${kebab(key)}="${value}"`)
  const all = [...attributes, 'style="height: 100vh"']
  return `<script src="${CDN_URL}" defer></script>\n\n<upstream-fx\n  ${all.join('\n  ')}\n></upstream-fx>`
}

function vanillaSnippet(entries: readonly Entry[]): string {
  const fields = entries.map(([key, value]) => `  ${key}: ${typeof value === 'string' ? `'${value}'` : value},`)
  const options = fields.length > 0 ? `{\n${fields.join('\n')}\n}` : '{}'
  return `// ${INSTALL_COMMAND}\nimport { createUpstream } from 'upstream-fx'\n\nconst canvas = document.querySelector('canvas')\nconst upstream = createUpstream(canvas, ${options})\n\n// later: upstream.destroy()`
}

export function buildSnippet(format: SnippetFormat, options: UpstreamOptions): string {
  const entries = changedOptions(options)
  if (format === 'react') return reactSnippet(entries)
  if (format === 'html') return htmlSnippet(entries)
  if (format === 'vanilla') return vanillaSnippet(entries)
  return `npx shadcn@latest add ${REGISTRY_URL}`
}
