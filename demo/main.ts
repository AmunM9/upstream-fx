import { parseColor } from '../src/core/color'
import { createUpstream } from '../src/core/engine'
import { DEFAULT_OPTIONS, resolveOptions, type UpstreamOptions, type UpstreamOptionsInput } from '../src/core/options'
import { COLOR_CONTROLS, FLAG_CONTROLS, PRESETS, SLIDER_GROUPS, type SliderSpec } from './controls'
import { fetchStarCount, formatStars } from './github-stars'
import { createCollapsiblePanel, type CollapsiblePanel } from './panels'
import { randomOptions } from './randomize'
import { buildSnippet, type SnippetFormat } from './snippets'
import { optionsFromQuery, optionsToQuery } from './url-state'

const FORMATS: readonly { readonly id: SnippetFormat; readonly label: string }[] = [
  { id: 'react', label: 'React' },
  { id: 'html', label: 'HTML' },
  { id: 'vanilla', label: 'JS' },
  { id: 'shadcn', label: 'shadcn' },
]
const COPIED_FEEDBACK_MS = 1400
const GITHUB_REPO = 'AmunM9/upstream-fx'
// Keep in sync with the compact breakpoint in demo/styles.css.
const COMPACT_LAYOUT_QUERY = '(max-width: 860px)'
const URL_SYNC_DELAY_MS = 250

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`demo: missing #${id}`)
  return element as T
}

function create<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: readonly Node[] = [],
): HTMLElementTagNameMap[K] {
  const element = Object.assign(document.createElement(tag), props)
  element.append(...children)
  return element
}

const canvas = byId<HTMLCanvasElement>('field')
const controlsRoot = byId<HTMLDivElement>('controls')
const snippet = byId<HTMLElement>('snippet')
const tabsRoot = document.querySelector<HTMLDivElement>('.tabs')
const presetsRoot = document.querySelector<HTMLElement>('.presets')
const announcer = byId<HTMLParagraphElement>('announcer')

let options: UpstreamOptions = optionsFromQuery(location.search)
let format: SnippetFormat = 'react'
let urlTimer = 0
const engine = createUpstream(canvas, options)
const syncers: ((next: UpstreamOptions) => void)[] = []

/** `<input type=color>` only accepts #rrggbb; convert any accepted color (#abc, rgb(), transparent). */
function toHex(color: string): string {
  const channels = parseColor(color) ?? [0, 0, 0, 1]
  return `#${channels
    .slice(0, 3)
    .map((c) => Math.round(c * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function formatValue(spec: SliderSpec, value: number): string {
  const decimals = spec.step < 0.1 ? 2 : spec.step < 1 ? 1 : 0
  return `${value.toFixed(decimals)}${spec.unit ? ` ${spec.unit}` : ''}`
}

function sliderFill(spec: SliderSpec, value: number): string {
  const ratio = (value - spec.min) / (spec.max - spec.min)
  return `${Math.min(1, Math.max(0, ratio)) * 100}%`
}

function update(input: UpstreamOptionsInput): void {
  options = resolveOptions(input, options)
  engine.setOptions(options)
  syncers.forEach((sync) => sync(options))
  render()
}

function render(): void {
  snippet.textContent = buildSnippet(format, options)
  document.documentElement.style.setProperty('--color-accent', options.accentColor)
  document.body.style.background = options.background
  window.clearTimeout(urlTimer)
  urlTimer = window.setTimeout(
    () => history.replaceState(null, '', `${location.pathname}${optionsToQuery(options)}${location.hash}`),
    URL_SYNC_DELAY_MS,
  )
}

function buildSlider(spec: SliderSpec): HTMLElement {
  const id = `opt-${spec.key}`
  const readout = create('output', { className: 'readout' })
  readout.setAttribute('for', id)
  const input = create('input', { type: 'range', id, min: String(spec.min), max: String(spec.max), step: String(spec.step) })
  input.addEventListener('input', () => update({ [spec.key]: Number(input.value) }))
  syncers.push((next) => {
    const value = next[spec.key]
    input.value = String(value)
    input.style.setProperty('--fill', sliderFill(spec, value))
    readout.textContent = formatValue(spec, value)
  })
  return create('div', { className: 'slider' }, [create('label', { htmlFor: id, textContent: spec.label }), readout, input])
}

function buildControls(): void {
  const groups = SLIDER_GROUPS.map((group) =>
    create('section', { className: 'group' }, [
      create('h3', { className: 'group-title', textContent: group.title }),
      ...group.sliders.map(buildSlider),
    ]),
  )

  const swatches = COLOR_CONTROLS.map(({ key, label }) => {
    const input = create('input', { type: 'color' })
    input.addEventListener('input', () => update({ [key]: input.value }))
    syncers.push((next) => {
      input.value = toHex(next[key])
    })
    return create('label', { className: 'swatch' }, [document.createTextNode(label), input])
  })

  const toggles = FLAG_CONTROLS.map(({ key, label }) => {
    const input = create('input', { type: 'checkbox' })
    input.setAttribute('role', 'switch')
    input.addEventListener('change', () => update({ [key]: input.checked }))
    syncers.push((next) => {
      input.checked = next[key]
    })
    return create('label', { className: 'toggle' }, [document.createTextNode(label), input])
  })

  controlsRoot.append(
    ...groups,
    create('section', { className: 'group' }, [
      create('h3', { className: 'group-title', textContent: 'Color' }),
      create('div', { className: 'swatches' }, swatches),
    ]),
    create('section', { className: 'group' }, toggles),
  )
}

function buildPresets(): void {
  const buttons = PRESETS.map((preset) => {
    const resolved = resolveOptions(preset.options)
    const button = create('button', { type: 'button', className: 'preset', textContent: preset.name })
    button.style.setProperty('--swatch', resolved.accentColor)
    button.addEventListener('click', () => {
      update({ ...DEFAULT_OPTIONS, ...preset.options })
      announcer.textContent = `${preset.name} preset applied`
    })
    syncers.push((next) => button.setAttribute('aria-pressed', String(next.accentColor === resolved.accentColor && next.count === resolved.count)))
    return button
  })
  presetsRoot?.append(...buttons)
}

function buildTabs(): void {
  const tabs = FORMATS.map(({ id, label }) => {
    const tab = create('button', { type: 'button', className: 'tab', textContent: label, id: `tab-${id}` })
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-controls', 'snippet-panel')
    tab.addEventListener('click', () => selectTab(id))
    return tab
  })
  tabsRoot?.append(...tabs)
  tabsRoot?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const index = FORMATS.findIndex((f) => f.id === format)
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = FORMATS[(index + delta + FORMATS.length) % FORMATS.length]
    if (next) selectTab(next.id, true)
  })
}

function selectTab(id: SnippetFormat, moveFocus = false): void {
  format = id
  tabsRoot?.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    const selected = tab.id === `tab-${id}`
    tab.setAttribute('aria-selected', String(selected))
    tab.tabIndex = selected ? 0 : -1
    if (selected && moveFocus) tab.focus()
  })
  byId('snippet-panel').setAttribute('aria-labelledby', `tab-${id}`)
  render()
}

async function copyText(text: string, button: HTMLButtonElement, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    button.dataset.copied = 'true'
    announcer.textContent = message
    window.setTimeout(() => delete button.dataset.copied, COPIED_FEEDBACK_MS)
  } catch {
    announcer.textContent = 'Copy failed — select the text and copy it manually.'
  }
}

buildControls()
buildPresets()
buildTabs()
setUpPanels()
selectTab(format)
update({})

const copyButton = byId<HTMLButtonElement>('copy')
copyButton.addEventListener('click', () => void copyText(snippet.textContent ?? '', copyButton, 'Snippet copied'))
const shareButton = byId<HTMLButtonElement>('share')
shareButton.addEventListener('click', () => void copyText(location.href, shareButton, 'Link copied'))
byId<HTMLButtonElement>('randomize').addEventListener('click', () => {
  update(randomOptions(Math.random))
  announcer.textContent = 'Randomized'
})
byId<HTMLButtonElement>('reset').addEventListener('click', () => {
  update(DEFAULT_OPTIONS)
  announcer.textContent = 'Reset to defaults'
})

/**
 * Desktop: both panels start open. Compact (mobile): both start folded into a
 * button row at the bottom so the effect is visible first, and only one sheet
 * is open at a time because they share the bottom of the screen.
 */
function setUpPanels(): void {
  const compactQuery = window.matchMedia(COMPACT_LAYOUT_QUERY)
  const isCompact = (): boolean => compactQuery.matches
  const panels: CollapsiblePanel[] = []
  const closeOthers = (opened: () => CollapsiblePanel | undefined): void => {
    if (!isCompact()) return
    const current = opened()
    panels.filter((panel) => panel !== current).forEach((panel) => panel.collapse())
  }
  document.querySelectorAll<HTMLElement>('.panel').forEach((root, index) => {
    panels.push(createCollapsiblePanel(root, { isCompact, startExpanded: !isCompact(), onExpand: () => closeOthers(() => panels[index]) }))
  })
  compactQuery.addEventListener('change', () => {
    if (isCompact()) panels.forEach((panel) => panel.collapse())
    else panels.forEach((panel) => panel.expand())
  })
}

async function showStars(): Promise<void> {
  const count = await fetchStarCount(GITHUB_REPO)
  if (count === null) return // the link still works, just without a number
  byId('github-star-count').textContent = formatStars(count)
  byId('github-stars').hidden = false
  byId('github-link').setAttribute('aria-label', `Star Upstream on GitHub, ${count} ${count === 1 ? 'star' : 'stars'} so far`)
}

void showStars()
