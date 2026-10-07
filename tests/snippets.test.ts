import { describe, expect, test } from 'vitest'
import { DEFAULT_OPTIONS, resolveOptions } from '../src/core/options'
import { buildSnippet, changedOptions } from '../demo/snippets'

describe('changedOptions', () => {
  test('keeps only values that differ from the defaults', () => {
    const options = resolveOptions({ speed: 120, accentColor: '#ff00aa' })
    expect(changedOptions(options)).toEqual([
      ['accentColor', '#ff00aa'],
      ['speed', 120],
    ])
  })

  test('is empty for the defaults', () => {
    expect(changedOptions(DEFAULT_OPTIONS)).toEqual([])
  })
})

describe('buildSnippet', () => {
  const options = resolveOptions({ speed: 120, accentColor: '#ff00aa', interactive: false })

  test('react: typed JSX props', () => {
    const snippet = buildSnippet('react', options)
    expect(snippet).toContain("import { Upstream } from 'upstream-fx/react'")
    expect(snippet).toContain('accentColor="#ff00aa"')
    expect(snippet).toContain('speed={120}')
    expect(snippet).toContain('interactive={false}')
  })

  test('html: kebab-case attributes on the custom element', () => {
    const snippet = buildSnippet('html', options)
    expect(snippet).toContain('upstream.global.js')
    expect(snippet).toContain('accent-color="#ff00aa"')
    expect(snippet).toContain('speed="120"')
    expect(snippet).toContain('interactive="false"')
  })

  test('vanilla: options object', () => {
    const snippet = buildSnippet('vanilla', options)
    expect(snippet).toContain("import { createUpstream } from 'upstream-fx'")
    expect(snippet).toContain("accentColor: '#ff00aa'")
  })

  test('shadcn: registry served straight from the GitHub repo, pinned to the release tag', () => {
    expect(buildSnippet('shadcn', options)).toBe(
      'npx shadcn@latest add https://raw.githubusercontent.com/AmunM9/upstream-fx/v0.1.0/public/r/upstream.json',
    )
  })

  test('react and vanilla: say how to install, from GitHub until the package is on npm', () => {
    expect(buildSnippet('react', options)).toMatch(/^\/\/ npm install github:AmunM9\/upstream-fx\n/)
    expect(buildSnippet('vanilla', options)).toMatch(/^\/\/ npm install github:AmunM9\/upstream-fx\n/)
  })

  test('html: script served by jsDelivr from the GitHub release tag', () => {
    expect(buildSnippet('html', options)).toContain(
      'https://cdn.jsdelivr.net/gh/AmunM9/upstream-fx@v0.1.0/dist/upstream.global.js',
    )
  })

  test('rounds noisy slider floats', () => {
    expect(buildSnippet('react', resolveOptions({ coneRatio: 0.30000000000000004 }))).toContain('coneRatio={0.3}')
  })

  test('defaults produce a minimal snippet', () => {
    expect(buildSnippet('react', DEFAULT_OPTIONS)).toContain("<Upstream style={{ height: '100vh' }} />")
  })
})
