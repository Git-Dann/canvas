// Param specs and helpers shared by tools. Reuse these before writing your own,
// so the same idea has the same label, range and section in every tool.

import type { ParamSpec, Params } from '../core/types'
import { DEFAULT_PALETTE } from '../core/palette'

export const paletteParam = (def = DEFAULT_PALETTE, section = 'Colour'): ParamSpec => ({
  key: 'palette', label: 'Palette', section, type: 'palette', default: def,
})

export const strokeWidthParam = (def = 2, max = 24, section = 'Style'): ParamSpec => ({
  key: 'strokeWidth', label: 'Line weight', section, type: 'number', default: def, min: 0.25, max, step: 0.25, unit: 'px',
})

export const opacityParam = (def = 1, section = 'Style'): ParamSpec => ({
  key: 'opacity', label: 'Opacity', section, type: 'number', default: def, min: 0.05, max: 1, step: 0.05,
})

export const marginParam = (def = 0.1, section = 'Layout'): ParamSpec => ({
  key: 'margin', label: 'Margin', section, type: 'number', default: def, min: 0, max: 0.4, step: 0.01,
  hint: 'Share of the shorter side kept clear',
})

export const animateParams = (section = 'Motion'): ParamSpec[] => [
  { key: 'animate', label: 'Draw-on animation', section, type: 'toggle', default: false, hint: 'Plays in the browser and in exported SVG' },
  { key: 'duration', label: 'Duration', section, type: 'number', default: 6, min: 1, max: 30, step: 0.5, unit: 's', visibleIf: (p) => p.animate === true },
]

/** Typed readers, so tool code stays terse and safe. */
export const num = (p: Params, k: string) => p[k] as number
export const str = (p: Params, k: string) => p[k] as string
export const bool = (p: Params, k: string) => p[k] as boolean

/** Inner box after margin, in artboard pixels. */
export function innerBox(width: number, height: number, margin: number) {
  const m = Math.min(width, height) * margin
  return { x: m, y: m, w: width - 2 * m, h: height - 2 * m }
}
