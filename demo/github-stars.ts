type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

/** 999 → "999", 1200 → "1.2k", 15000 → "15k". */
export function formatStars(count: number): string {
  if (count < 1000) return String(count)
  const thousands = count / 1000
  return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`
}

/**
 * Star count of a public repo, or null when GitHub is unreachable, rate-limited
 * (60 unauthenticated requests per hour per IP) or returns something unexpected.
 * The caller keeps the link working without a number in that case.
 */
export async function fetchStarCount(repo: string, fetcher: Fetcher = fetch): Promise<number | null> {
  try {
    const response = await fetcher(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return null
    const data: unknown = await response.json()
    const count = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).stargazers_count : null
    return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null
  } catch {
    return null
  }
}
