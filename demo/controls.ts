import type { UpstreamOptions } from '../src/core/options'

type NumericKey = { [K in keyof UpstreamOptions]: UpstreamOptions[K] extends number ? K : never }[keyof UpstreamOptions]
type ColorKey = 'background' | 'baseColor' | 'accentColor'
type FlagKey = 'interactive' | 'paused'

export interface SliderSpec {
  readonly key: NumericKey
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit?: string
}

export interface ControlGroup {
  readonly title: string
  readonly sliders: readonly SliderSpec[]
}

export const SLIDER_GROUPS: readonly ControlGroup[] = [
  {
    title: 'Field',
    sliders: [
      { key: 'count', label: 'Streaks', min: 50, max: 3000, step: 10 },
      { key: 'spread', label: 'Cone spread', min: 0, max: 90, step: 1, unit: '°' },
      { key: 'coneRatio', label: 'In cone', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Motion',
    sliders: [
      { key: 'speed', label: 'Speed', min: 0, max: 400, step: 1, unit: 'px/s' },
      { key: 'length', label: 'Max length', min: 20, max: 600, step: 1, unit: 'px' },
    ],
  },
  {
    title: 'Light',
    sliders: [
      { key: 'lineWidth', label: 'Line width', min: 0.25, max: 4, step: 0.05, unit: 'px' },
      { key: 'dotSize', label: 'Head dot', min: 0, max: 8, step: 0.1, unit: 'px' },
      { key: 'intensity', label: 'Intensity', min: 0, max: 2, step: 0.01 },
    ],
  },
  {
    title: 'Pointer',
    sliders: [
      { key: 'repelRadius', label: 'Gap size', min: 0, max: 300, step: 1, unit: 'px' },
      { key: 'repelSoftness', label: 'Softness · tight → loose', min: 0, max: 1, step: 0.01 },
    ],
  },
]

export const COLOR_CONTROLS: readonly { readonly key: ColorKey; readonly label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'baseColor', label: 'Tail' },
  { key: 'accentColor', label: 'Head' },
]

export const FLAG_CONTROLS: readonly { readonly key: FlagKey; readonly label: string }[] = [
  { key: 'interactive', label: 'Pointer repel' },
  { key: 'paused', label: 'Freeze time' },
]

export interface Preset {
  readonly name: string
  readonly options: Partial<UpstreamOptions>
}

export const PRESETS: readonly Preset[] = [
  { name: 'Signal', options: {} },
  {
    name: 'Ember',
    options: { baseColor: '#1a0602', accentColor: '#ff8a3d', spread: 30, speed: 55, intensity: 0.95 },
  },
  {
    name: 'Ice',
    options: { background: '#02060d', baseColor: '#041226', accentColor: '#8fd3ff', count: 1400, lineWidth: 0.8, dotSize: 1.8 },
  },
  {
    name: 'Warp',
    options: { accentColor: '#f4f1ff', baseColor: '#0b0718', speed: 260, length: 420, coneRatio: 0.35, count: 1600 },
  },
]
