import type { Raster, RasterRequest, Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { createNoise2D, noiseTone } from '../core/rng'
import { palette } from '../core/palette'
import { colorAt, lumCell } from '../core/raster'
import { bool, num, paletteParam, str } from './common'

type Dot = 'circle' | 'square' | 'diamond' | 'line'

/** Path data for one mark of half-size r centred on (x, y), in a cell rotated by `a`. */
export function markPath(shape: Dot, x: number, y: number, r: number, cell: number, a: number): string {
  if (r <= 0.05) return ''
  const cos = Math.cos(a), sin = Math.sin(a)
  const pt = (dx: number, dy: number) => `${f(x + dx * cos - dy * sin)} ${f(y + dx * sin + dy * cos)}`
  switch (shape) {
    case 'circle':
      return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`
    case 'square':
      return `M${pt(-r, -r)}L${pt(r, -r)}L${pt(r, r)}L${pt(-r, r)}Z`
    case 'diamond':
      return `M${pt(0, -r * 1.3)}L${pt(r * 1.3, 0)}L${pt(0, r * 1.3)}L${pt(-r * 1.3, 0)}Z`
    case 'line': {
      const h = cell / 2
      return `M${pt(-h, -r)}L${pt(h, -r)}L${pt(h, r)}L${pt(-h, r)}Z`
    }
  }
}

export const halftone: Tool = {
  id: 'halftone',
  name: 'Halftone',
  group: 'Image',
  blurb: 'Print-style halftone from a photo or a noise field: dots, squares, diamonds or engraved lines.',
  icon: '<circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="1.4"/><circle cx="18" cy="6" r=".8"/><circle cx="6" cy="12" r="2.6"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="1.2"/><circle cx="6" cy="18" r="3"/><circle cx="12" cy="18" r="2.4"/><circle cx="18" cy="18" r="1.6"/>',
  params: [
    { key: 'image', label: 'Image', section: 'Source', type: 'image', default: '', hint: 'Without an image, a noise field is used' },
    { key: 'noiseScale', label: 'Noise zoom', section: 'Source', type: 'number', default: 2, min: 0.3, max: 10, step: 0.1, visibleIf: (p) => !p.image },

    { key: 'cell', label: 'Cell size', section: 'Screen', type: 'number', default: 18, min: 4, max: 80, step: 1, unit: 'px' },
    { key: 'angle', label: 'Screen angle', section: 'Screen', type: 'number', default: 45, min: 0, max: 90, step: 1, unit: '°' },
    {
      key: 'shape', label: 'Mark', section: 'Screen', type: 'segmented', default: 'circle',
      options: [{ value: 'circle', label: 'Dot' }, { value: 'square', label: 'Square' }, { value: 'diamond', label: 'Diamond' }, { value: 'line', label: 'Line' }],
    },
    { key: 'maxSize', label: 'Max mark size', section: 'Screen', type: 'number', default: 0.75, min: 0.2, max: 1.5, step: 0.01 },
    { key: 'gamma', label: 'Contrast curve', section: 'Screen', type: 'number', default: 1, min: 0.2, max: 3, step: 0.05 },
    { key: 'invert', label: 'Invert', section: 'Screen', type: 'toggle', default: true, hint: 'On suits light marks on a dark artboard' },

    paletteParam('emergency'),
    { key: 'fromImage', label: 'Colour from image', section: 'Colour', type: 'toggle', default: false, visibleIf: (p) => !!p.image },
  ],
  rasters(p): Record<string, RasterRequest> {
    return p.image ? { src: { kind: 'image', src: p.image as string } } : {}
  },
  render({ params: p, width, height, background, seed, rasters }) {
    const src: Raster | null = rasters.src ?? null
    const noise = createNoise2D(seed)
    const ns = num(p, 'noiseScale')
    const cell = num(p, 'cell') * (Math.max(width, height) / 1080)
    const a = (num(p, 'angle') * Math.PI) / 180
    const cos = Math.cos(a), sin = Math.sin(a)
    const shape = str(p, 'shape') as Dot
    const ink = palette(str(p, 'palette')).colors[0]
    const invert = bool(p, 'invert')
    const gamma = num(p, 'gamma')
    const maxR = (cell / 2) * num(p, 'maxSize')
    const useSrcColour = bool(p, 'fromImage') && !!src
    // Walk a rotated grid big enough to cover the artboard's diagonal.
    const half = Math.hypot(width, height) / 2
    const n = Math.ceil(half / cell)
    const cx = width / 2, cy = height / 2
    const groups = new Map<string, string[]>()
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const gx = i * cell, gy = j * cell
        const x = cx + gx * cos - gy * sin
        const y = cy + gx * sin + gy * cos
        if (x < -cell || y < -cell || x > width + cell || y > height + cell) continue
        const u = x / width, v = y / height
        let l = src
          ? lumCell(src, u - cell / width / 2, v - cell / height / 2, u + cell / width / 2, v + cell / height / 2)
          : noiseTone(noise, u * ns * (width / height), v * ns)
        l = Math.max(0, Math.min(1, l)) ** gamma
        const amount = invert ? l : 1 - l
        const r = shape === 'circle' || shape === 'line' ? maxR * Math.sqrt(amount) * (shape === 'line' ? 0.9 : 1) : maxR * amount
        const d = markPath(shape, x, y, r, cell, a)
        if (!d) continue
        const c = useSrcColour ? colorAt(src!, Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v))) : ink
        const list = groups.get(c) ?? []
        list.push(d)
        groups.set(c, list)
      }
    }
    let body = ''
    for (const [c, ds] of groups) body += el('path', { d: ds.join(''), fill: c })
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
