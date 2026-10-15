// Param specs and helpers shared by tools. Reuse these before writing your own,
// so the same idea has the same label, range and section in every tool.

import type { ParamSpec, Params, Raster, RasterRequest } from '../core/types'
import { DEFAULT_PALETTE, contrast } from '../core/palette'
import { createNoise2D, noiseTone } from '../core/rng'
import { colorAt, lumCell } from '../core/raster'

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

// ── shared image source (Image group) ──────────────────────────────────────
// Every Image tool reads a photo when one is uploaded and a seeded noise field
// when not, so it always has something to draw.

export const imageSourceParams = (section = 'Source'): ParamSpec[] => [
  { key: 'image', label: 'Image', section, type: 'image', default: '', hint: 'Without an image, a noise field is used. Stays inside the file' },
  { key: 'noiseScale', label: 'Noise zoom', section, type: 'number', default: 2.5, min: 0.3, max: 10, step: 0.1, visibleIf: (p) => !p.image },
]

export const imageRasters = (p: Params): Record<string, RasterRequest> =>
  p.image ? { src: { kind: 'image', src: p.image as string } } : {}

/** Tone (0 dark, 1 light) and colour readers over the artboard, image or noise. */
export function toneSource(p: Params, rasters: Record<string, Raster | null>, seed: number, width: number, height: number) {
  const src = rasters.src ?? null
  const noise = createNoise2D(seed)
  const ns = p.noiseScale as number
  const clampU = (u: number) => Math.min(1, Math.max(0, u))
  return {
    src,
    /** Average tone over a cell, in normalised artboard coordinates. */
    tone: (u0: number, v0: number, u1: number, v1: number) =>
      src ? lumCell(src, u0, v0, u1, v1) : noiseTone(noise, ((u0 + u1) / 2) * ns * (width / height), ((v0 + v1) / 2) * ns),
    /** Source colour at a point, or null when there is no image. */
    colour: (u: number, v: number) => (src ? colorAt(src, clampU(u), clampU(v)) : null),
  }
}

/** The palette colour that stands out most against the artboard background. */
export function inkFor(colors: readonly string[], background: string): string {
  const bg = background === 'transparent' ? '#FFFFFF' : background
  return colors.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best), colors[0])
}
