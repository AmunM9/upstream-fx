export type Anchor = 'top-right' | 'bottom-left' | 'bottom-right'

interface Size {
  readonly width: number
  readonly height: number
}

export interface Insets {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * Clip insets that shrink a panel down to its pill, keeping the corner it is
 * anchored to fixed: on desktop the Tune panel folds up into the top-right
 * corner and Install down into the bottom-left one; on mobile both fold down
 * into a button row at the bottom of the screen.
 */
export function collapsedInsets(panel: Size, pill: Size, anchor: Anchor): Insets {
  const horizontal = Math.max(0, panel.width - pill.width)
  const vertical = Math.max(0, panel.height - pill.height)
  if (anchor === 'top-right') return { top: 0, right: 0, bottom: vertical, left: horizontal }
  if (anchor === 'bottom-right') return { top: vertical, right: 0, bottom: 0, left: horizontal }
  return { top: vertical, right: horizontal, bottom: 0, left: 0 }
}

export interface CollapsiblePanel {
  collapse(): void
  expand(): void
  readonly isExpanded: boolean
}

export interface PanelOptions {
  /** True when the compact (mobile) layout is active; picks `data-anchor-compact`. */
  readonly isCompact?: () => boolean
  readonly startExpanded?: boolean
  /** Called after the panel expands, e.g. to close other panels on small screens. */
  readonly onExpand?: () => void
}

const ANCHORS: readonly Anchor[] = ['top-right', 'bottom-left', 'bottom-right']

function toAnchor(value: string | undefined): Anchor | null {
  return ANCHORS.find((anchor) => anchor === value) ?? null
}

function setInert(element: Element | null, inert: boolean): void {
  if (inert) element?.setAttribute('inert', '')
  else element?.removeAttribute('inert')
}

/**
 * Wires a panel that morphs into a small pill and back. Expects inside `root`:
 * `.panel-content`, a `[data-collapse]` button and a `.panel-pill` button.
 * The animation itself is a CSS clip-path transition driven by `data-state`,
 * `data-corner` and the `--clip-*` variables set here.
 */
export function createCollapsiblePanel(root: HTMLElement, options: PanelOptions = {}): CollapsiblePanel {
  const { isCompact = () => false, startExpanded = true, onExpand } = options
  const content = root.querySelector<HTMLElement>('.panel-content')
  const pill = root.querySelector<HTMLButtonElement>('.panel-pill')
  const collapseButton = root.querySelector<HTMLButtonElement>('[data-collapse]')

  function corner(): Anchor {
    const regular = toAnchor(root.dataset.anchor) ?? 'bottom-left'
    return isCompact() ? (toAnchor(root.dataset.anchorCompact) ?? regular) : regular
  }

  function layout(): void {
    const anchor = corner()
    root.dataset.corner = anchor
    const rect = root.getBoundingClientRect()
    const pillSize = { width: pill?.offsetWidth ?? 0, height: pill?.offsetHeight ?? 0 }
    const insets = collapsedInsets(rect, pillSize, anchor)
    for (const [side, value] of Object.entries(insets)) root.style.setProperty(`--clip-${side}`, `${value}px`)
  }

  function render(expanded: boolean): void {
    root.dataset.state = expanded ? 'expanded' : 'collapsed'
    setInert(content, !expanded)
    setInert(pill, expanded)
    collapseButton?.setAttribute('aria-expanded', String(expanded))
    pill?.setAttribute('aria-expanded', String(expanded))
  }

  function collapse(): void {
    if (root.dataset.state === 'collapsed') return
    const hadFocus = content?.contains(document.activeElement) ?? false
    layout()
    render(false)
    if (hadFocus) pill?.focus()
  }

  function expand(): void {
    if (root.dataset.state === 'expanded') return
    const hadFocus = document.activeElement === pill
    render(true)
    if (hadFocus) collapseButton?.focus()
    onExpand?.()
  }

  collapseButton?.addEventListener('click', collapse)
  pill?.addEventListener('click', expand)
  // Size and corner change with the viewport (rotating a phone, crossing the
  // breakpoint) and with the content (snippets, fonts loading after first paint).
  window.addEventListener('resize', layout)
  if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(root)
  layout()
  render(startExpanded)
  // Enable the morph only after the first painted frame, so a panel that starts
  // collapsed (on phones) appears folded instead of animating on page load.
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(() => (root.dataset.ready = '')))
  } else {
    root.dataset.ready = ''
  }
  return {
    collapse,
    expand,
    get isExpanded() {
      return root.dataset.state === 'expanded'
    },
  }
}
