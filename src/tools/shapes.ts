import type { Pt } from '../core/svg'
import type { Rng, Tool } from '../core/types'
import { el, f, linePath, roundedPolygon, smoothPath, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { bool, num, opacityParam, paletteParam, str, strokeWidthParam } from './common'

type Kind = 'polygon' | 'star' | 'flower' | 'blob' | 'superformula'

/** Points for one shape of radius r centred on the origin. */
export function shapePoints(kind: Kind, o: { sides: number; inner: number; m: number; n1: number; n2: number; n3: number; wobble: number }, r: number, rng: Rng): Pt[] {
  const pts: Pt[] = []
  const n = Math.round(o.sides)
  switch (kind) {
    case 'polygon':
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        pts.push([Math.cos(a) * r, Math.sin(a) * r])
      }
      return pts
    case 'star':
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
        const rr = i % 2 === 0 ? r : r * o.inner
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr])
      }
      return pts
    case 'blob':
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rr = r * (1 - o.wobble * 0.5 + rng() * o.wobble * 0.5)
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr])
      }
      return pts
    case 'flower':
    case 'superformula': {
      const m = kind === 'flower' ? n : o.m
      const n1 = kind === 'flower' ? 0.6 + (1 - o.inner) * 4 : o.n1
      const n2 = kind === 'flower' ? 1 : o.n2
      const n3 = kind === 'flower' ? 1 : o.n3
      const steps = 360
      let max = 0
      const raw: Pt[] = []
      for (let i = 0; i < steps; i++) {
        const phi = (i / steps) * Math.PI * 2
        const t1 = Math.abs(Math.cos((m * phi) / 4)) ** n2
        const t2 = Math.abs(Math.sin((m * phi) / 4)) ** n3
        const rr = (t1 + t2) ** (-1 / n1)
        const v = Number.isFinite(rr) ? rr : 0
        max = Math.max(max, v)
        raw.push([Math.cos(phi - Math.PI / 2) * v, Math.sin(phi - Math.PI / 2) * v])
      }
      const s = max > 0 ? r / max : 0
      return raw.map(([x, y]) => [x * s, y * s] as Pt)
    }
  }
}

export const shapes: Tool = {
  id: 'shapes',
  name: 'Shape maker',
  group: 'Shape',
  blurb: 'Polygons, stars, flowers, blobs and superformula shapes, repeated into rings or grids.',
  icon: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  params: [
    {
      key: 'kind', label: 'Shape', section: 'Shape', type: 'select', default: 'star',
      options: [
        { value: 'polygon', label: 'Polygon' }, { value: 'star', label: 'Star' }, { value: 'flower', label: 'Flower' },
        { value: 'blob', label: 'Blob' }, { value: 'superformula', label: 'Superformula' },
      ],
    },
    { key: 'sides', label: 'Points', section: 'Shape', type: 'number', default: 8, min: 3, max: 32, step: 1, visibleIf: (p) => p.kind !== 'superformula' },
    { key: 'inner', label: 'Inner radius', section: 'Shape', type: 'number', default: 0.5, min: 0.05, max: 0.98, step: 0.01, visibleIf: (p) => p.kind === 'star' || p.kind === 'flower' },
    { key: 'wobble', label: 'Wobble', section: 'Shape', type: 'number', default: 0.6, min: 0, max: 1, step: 0.01, visibleIf: (p) => p.kind === 'blob' },
    { key: 'm', label: 'Symmetry (m)', section: 'Shape', type: 'number', default: 6, min: 0, max: 24, step: 0.5, visibleIf: (p) => p.kind === 'superformula' },
    { key: 'n1', label: 'n1', section: 'Shape', type: 'number', default: 0.4, min: 0.1, max: 20, step: 0.1, visibleIf: (p) => p.kind === 'superformula' },
    { key: 'n2', label: 'n2', section: 'Shape', type: 'number', default: 1.7, min: 0.1, max: 20, step: 0.1, visibleIf: (p) => p.kind === 'superformula' },
    { key: 'n3', label: 'n3', section: 'Shape', type: 'number', default: 1.7, min: 0.1, max: 20, step: 0.1, visibleIf: (p) => p.kind === 'superformula' },
    { key: 'rounding', label: 'Corner rounding', section: 'Shape', type: 'number', default: 0.15, min: 0, max: 1, step: 0.01, visibleIf: (p) => p.kind === 'polygon' || p.kind === 'star' },
    { key: 'rotation', label: 'Rotation', section: 'Shape', type: 'number', default: 0, min: 0, max: 360, step: 1, unit: '°' },

    { key: 'layout', label: 'Layout', section: 'Repeat', type: 'segmented', default: 'rings', options: [{ value: 'rings', label: 'Rings' }, { value: 'grid', label: 'Grid' }] },
    { key: 'copies', label: 'Copies', section: 'Repeat', type: 'number', default: 12, min: 1, max: 60, step: 1, visibleIf: (p) => p.layout === 'rings' },
    { key: 'shrink', label: 'Shrink per copy', section: 'Repeat', type: 'number', default: 0.9, min: 0.5, max: 1, step: 0.005, visibleIf: (p) => p.layout === 'rings' },
    { key: 'twist', label: 'Twist per copy', section: 'Repeat', type: 'number', default: 6, min: -45, max: 45, step: 0.5, unit: '°', visibleIf: (p) => p.layout === 'rings' },
    { key: 'cols', label: 'Columns', section: 'Repeat', type: 'number', default: 5, min: 1, max: 16, step: 1, visibleIf: (p) => p.layout === 'grid' },
    { key: 'jitter', label: 'Randomise each', section: 'Repeat', type: 'toggle', default: true, visibleIf: (p) => p.layout === 'grid', hint: 'Varies rotation and points per cell' },
    { key: 'size', label: 'Size', section: 'Repeat', type: 'number', default: 0.8, min: 0.1, max: 1.2, step: 0.01 },

    { key: 'fill', label: 'Paint', section: 'Style', type: 'segmented', default: 'stroke', options: [{ value: 'fill', label: 'Fill' }, { value: 'stroke', label: 'Line' }, { value: 'both', label: 'Both' }] },
    strokeWidthParam(3),
    opacityParam(1),
    paletteParam(),
    { key: 'cycle', label: 'Cycle colours', section: 'Colour', type: 'toggle', default: true },
  ],
  render({ params: p, width, height, background, rng }) {
    const kind = str(p, 'kind') as Kind
    const colors = palette(str(p, 'palette')).colors
    const paint = str(p, 'fill')
    const sw = num(p, 'strokeWidth')
    const o = { sides: num(p, 'sides'), inner: num(p, 'inner'), m: num(p, 'm'), n1: num(p, 'n1'), n2: num(p, 'n2'), n3: num(p, 'n3'), wobble: num(p, 'wobble') }

    const pathFor = (pts: Pt[]) =>
      kind === 'blob' ? smoothPath(pts, true) : kind === 'polygon' || kind === 'star' ? roundedPolygon(pts, num(p, 'rounding')) : linePath(pts, true)
    const paintAttrs = (c: string) => ({
      fill: paint === 'stroke' ? 'none' : c,
      stroke: paint === 'fill' ? undefined : paint === 'both' ? background === 'transparent' ? '#0A0A0A' : background : c,
      'stroke-width': paint === 'fill' ? undefined : sw,
      'stroke-linejoin': 'round',
    })

    let body = ''
    if (str(p, 'layout') === 'rings') {
      const copies = num(p, 'copies')
      const r0 = (Math.min(width, height) / 2) * num(p, 'size')
      for (let i = 0; i < copies; i++) {
        const r = r0 * num(p, 'shrink') ** i
        const c = bool(p, 'cycle') ? colors[i % colors.length] : colors[0]
        const rot = num(p, 'rotation') + num(p, 'twist') * i
        const d = pathFor(shapePoints(kind, o, r, rng))
        body += el('path', { d, transform: `translate(${f(width / 2)} ${f(height / 2)}) rotate(${f(rot)})`, ...paintAttrs(c) })
      }
    } else {
      const cols = num(p, 'cols')
      const cell = width / cols
      const rows = Math.max(1, Math.round(height / cell))
      const cellH = height / rows
      const r = (Math.min(cell, cellH) / 2) * num(p, 'size') * 0.9
      let i = 0
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++, i++) {
          const jitter = bool(p, 'jitter')
          const local = jitter ? { ...o, sides: Math.max(3, o.sides + rng.int(-2, 2)), inner: Math.min(0.95, Math.max(0.1, o.inner + rng.range(-0.2, 0.2))) } : o
          const rot = num(p, 'rotation') + (jitter ? rng.range(0, 360) : 0)
          const c = bool(p, 'cycle') ? (jitter ? rng.pick(colors) : colors[i % colors.length]) : colors[0]
          const d = pathFor(shapePoints(kind, local, r, rng))
          body += el('path', { d, transform: `translate(${f((x + 0.5) * cell)} ${f((y + 0.5) * cellH)}) rotate(${f(rot)})`, ...paintAttrs(c) })
        }
      }
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${f(num(p, 'opacity'))}">${body}</g>` }) }
  },
}
