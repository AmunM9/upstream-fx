import { DEFAULT_OPTIONS, parseOptionValue, resolveOptions, type UpstreamOptions, type UpstreamOptionsInput } from '../src/core/options'
import { changedOptions } from './snippets'

/** Encodes only the non-default options, so shared links stay short. */
export function optionsToQuery(options: UpstreamOptions): string {
  const params = new URLSearchParams(changedOptions(options).map(([key, value]) => [key, String(value)]))
  const query = params.toString()
  return query === '' ? '' : `?${query}`
}

/** Decodes a query string; every value goes through the same validation as the public API. */
export function optionsFromQuery(search: string): UpstreamOptions {
  const params = new URLSearchParams(search)
  const known = (Object.keys(DEFAULT_OPTIONS) as (keyof UpstreamOptions)[]).filter((key) => params.has(key))
  const input = Object.fromEntries(known.map((key) => [key, parseOptionValue(key, params.get(key) ?? '')]))
  return resolveOptions(input as UpstreamOptionsInput)
}
