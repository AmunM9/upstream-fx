import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const SITE = 'https://upstream-fx.vercel.app'
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const meta = (attribute: 'property' | 'name', key: string): string | undefined =>
  new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="([^"]*)"`).exec(html)?.[1]

describe('link previews (WhatsApp, Facebook, X, LinkedIn, Slack)', () => {
  test('declares the Open Graph basics', () => {
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:url')).toBe(`${SITE}/`)
    expect(meta('property', 'og:title')).toBeTruthy()
    expect(meta('property', 'og:description')).toBeTruthy()
  })

  test('points og:image to an absolute URL, which crawlers require', () => {
    expect(meta('property', 'og:image')).toBe(`${SITE}/og.jpg`)
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('property', 'og:image:alt')).toBeTruthy()
  })

  test('asks X/Twitter for the large image card', () => {
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'twitter:image')).toBe(`${SITE}/og.jpg`)
  })

  test('ships the image itself, small enough for WhatsApp (< 300 KB)', () => {
    const image = new URL('../public/og.jpg', import.meta.url)
    expect(existsSync(image)).toBe(true)
    expect(statSync(image).size).toBeLessThan(300 * 1024)
  })
})
