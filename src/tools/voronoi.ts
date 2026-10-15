import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, f, roundedPolygon, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { num, opacityParam, paletteParam, str } from './common'

/** Clip a convex polygon to the half-plane closer to `a` than to `b`. */
function clipHalf(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
  const nx = b[0] - a[0], ny = b[1] - a[1]
  const side = (p: Pt) => (p[0] - mx) * nx + (p[1] - my) * ny
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const sp = side(p), sq = side(q)
    if (sp <= 0) out.push(p)
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq)
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return out
}

/** Voronoi cells for `sites` inside the rectangle, one convex polygon each. */
export function voronoiCells(sites: readonly Pt[], width: number, height: number): Pt[][] {
  const box: Pt[] = [[0, 0], [width, 0], [width, height], [0, height]]
  return sites.map((a, i) => {
    let poly = box
    for (let j = 0; j < sites.length && poly.length; j++) if (j !== i) poly = clipHalf(poly, a, sites[j])
    return poly
  })
}

function centroid(poly: readonly Pt[]): Pt {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]
    const k = x0 * y1 - x1 * y0
    a += k
    cx += (x0 + x1) * k
    cy += (y0 + y1) * k
  }
  if (Math.abs(a) < 1e-9) return poly[0] ?? [0, 0]
  return [cx / (3 * a), cy / (3 * a)]
}

/** Shrink a polygon towards its centroid by `d` pixels (approximate inset). */
function inset(poly: readonly Pt[], d: number): Pt[] {
  const c = centroid(poly)
  return poly.map(([x, y]) => {
    const dx = x - c[0], dy = y - c[1]
    const len = Math.hypot(dx, dy) || 1
    const k = Math.max(0, len - d) / len
    return [c[0] + dx * k, c[1] + dy * k] as Pt
  })
}

export const voronoi: Tool = {
  id: 'voronoi',
  name: 'Voronoi',
  group: 'Pattern',
  blurb: 'Cells grown from scattered points, from cracked mud to giraffe hide to stained glass.',
  icon: '<path d="M3 4l6 4 1 6-7 3M9 8l8-4M10 14l6 2 5-4M16 16l-1 5M17 4l4 8"/>',
  params: [
    { key: 'count', label: 'Cells', section: 'Cells', type: 'number', default: 80, min: 3, max: 400, step: 1 },
    { key: 'relax', label: 'Evenness', section: 'Cells', type: 'number', default: 2, min: 0, max: 8, step: 1, hint: 'Passes that even out the cell sizes' },
    { key: 'gap', label: 'Gap', section: 'Cells', type: 'number', default: 6, min: 0, max: 40, step: 0.5, unit: 'px' },
    { key: 'round', label: 'Round corners', section: 'Cells', type: 'number', default: 0.4, min: 0, max: 1, step: 0.01 },
    {
      key: 'style', label: 'Draw', section: 'Cells', type: 'segmented', default: 'fill',
      options: [{ value: 'fill', label: 'Filled' }, { value: 'outline', label: 'Outline' }, { value: 'dots', label: 'Sites' }],
    },
    opacityParam(1),
    paletteParam('ember'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'random',
      options: [{ value: 'single', label: 'Lead' }, { value: 'random', label: 'Chance' }, { value: 'height', label: 'Height' }],
    },
  ],
  render({ params: p, width, height, background, rng }) {
    let sites: Pt[] = Array.from({ length: num(p, 'count') }, () => [rng.range(0, width), rng.range(0, height)] as Pt)
    let cells = voronoiCells(sites, width, height)
    for (let k = 0; k < num(p, 'relax'); k++) {
      sites = cells.map((c, i) => (c.length > 2 ? centroid(c) : sites[i]))
      cells = voronoiCells(sites, width, height)
    }
    const scale = Math.min(width, height) / 1080
    const gap = num(p, 'gap') * scale
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const style = str(p, 'style')
    const groups = new Map<string, string>()
    cells.forEach((cell, i) => {
      if (cell.length < 3) return
      const c = by === 'single' ? colors[0] : by === 'random' ? rng.pick(colors) : gradientAt(colors, centroid(cell)[1] / height)
      let d: string
      if (style === 'dots') {
        const [x, y] = sites[i]
        const r = 4 * scale + gap / 2
        d = `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`
      } else {
        // Clipping can leave near-duplicate vertices; drop them before rounding.
        const poly = inset(cell, gap / 2).filter((q, j, a) => Math.hypot(q[0] - a[(j + 1) % a.length][0], q[1] - a[(j + 1) % a.length][1]) > 0.5)
        if (poly.length < 3) return
        d = roundedPolygon(poly, num(p, 'round'))
      }
      groups.set(c, (groups.get(c) ?? '') + d)
    })
    let body = ''
    for (const [c, d] of groups) {
      body += style === 'outline'
        ? el('path', { d, fill: 'none', stroke: c, 'stroke-width': f(Math.max(1, 2 * scale)), 'stroke-linejoin': 'round' })
        : el('path', { d, fill: c })
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
