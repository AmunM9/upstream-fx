import { describe, expect, test, vi } from 'vitest'
import { fetchStarCount, formatStars } from '../demo/github-stars'

describe('formatStars', () => {
  test('shows small counts as is and large ones compactly', () => {
    expect(formatStars(0)).toBe('0')
    expect(formatStars(999)).toBe('999')
    expect(formatStars(1200)).toBe('1.2k')
    expect(formatStars(15000)).toBe('15k')
  })
})

describe('fetchStarCount', () => {
  const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))

  test('reads stargazers_count from the GitHub API', async () => {
    const fetcher = ok({ stargazers_count: 42 })
    expect(await fetchStarCount('owner/repo', fetcher)).toBe(42)
    expect(fetcher).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo', expect.anything())
  })

  test('returns null when GitHub fails or rate-limits, so the link still works without a number', async () => {
    expect(await fetchStarCount('owner/repo', vi.fn(async () => new Response('', { status: 403 })))).toBeNull()
    expect(await fetchStarCount('owner/repo', vi.fn(async () => Promise.reject(new Error('offline'))))).toBeNull()
  })

  test('rejects malformed payloads', async () => {
    expect(await fetchStarCount('owner/repo', ok({ stargazers_count: 'lots' }))).toBeNull()
    expect(await fetchStarCount('owner/repo', ok({ stargazers_count: -1 }))).toBeNull()
  })
})
