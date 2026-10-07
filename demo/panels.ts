export type Anchor = 'top-right' | 'bottom-left'

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
 * anchored to fixed: the Tune panel folds up into the top-right corner, the
 * Install panel down into the bottom-left one.
 */
export function collapsedInsets(panel: Size, pill: Size, anchor: Anchor): Insets {
  const horizontal = Math.max(0, panel.width - pill.width)
  const vertical = Math.max(0, panel.height - pill.height)
  return anchor === 'top-right'
    ? { top: 0, right: 0, bottom: vertical, left: horizontal }
    : { top: vertical, right: horizontal, bottom: 0, left: 0 }
}

export interface CollapsiblePanel {
  collapse(): void
  expand(): void
}

function setInert(element: Element | null, inert: boolean): void {
  if (inert) element?.setAttribute('inert', '')
  else element?.removeAttribute('inert')
}

/**
 * Wires a panel that morphs into a small pill and back. Expects inside `root`:
 * `.panel-content`, a `[data-collapse]` button and a `.panel-pill` button.
 * The animation itself is a CSS clip-path transition driven by `data-state`
 * and the `--clip-*` variables set here.
 */
export function createCollapsiblePanel(root: HTMLElement): CollapsiblePanel {
  const anchor: Anchor = root.dataset.anchor === 'top-right' ? 'top-right' : 'bottom-left'
  const content = root.querySelector<HTMLElement>('.panel-content')
  const pill = root.querySelector<HTMLButtonElement>('.panel-pill')
  const collapseButton = root.querySelector<HTMLButtonElement>('[data-collapse]')

  function writeInsets(): void {
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
    const hadFocus = content?.contains(document.activeElement) ?? false
    writeInsets()
    render(false)
    if (hadFocus) pill?.focus()
  }

  function expand(): void {
    const hadFocus = document.activeElement === pill
    render(true)
    if (hadFocus) collapseButton?.focus()
  }

  collapseButton?.addEventListener('click', collapse)
  pill?.addEventListener('click', expand)
  window.addEventListener('resize', () => {
    if (root.dataset.state === 'collapsed') writeInsets()
  })
  render(true)
  return { collapse, expand }
}
