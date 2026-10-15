import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, linePath, smoothPath, svgDoc } from '../core/svg'
import { createNoise2D, fbm } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { bool, num, opacityParam, paletteParam, str, strokeWidthParam } from './common'

export interface Contour {
  points: Pt[]
  closed: boolean
}

/**
 * Marching squares over a (cols+1) x (rows+1) grid of values, joined into
 * continuous polylines. Points come back in grid units (multiply by cell size).
 */
export function contourLines(values: Float32Array, cols: number, rows: number, level: number): Contour[] {
  const W = cols + 1
  const H = (rows + 1) * cols // horizontal edge count; vertical ids start here
  const hId = (i: number, j: number) => j * cols + i
  const vId = (i: number, j: number) => H + j * W + i
  const pos = new Map<number, Pt>()
  const adj = new Map<number, number[]>()
  const v = (i: number, j: number) => values[j * W + i]
  const link = (a: number, b: number) => {
    ;(adj.get(a) ?? adj.set(a, []).get(a)!).push(b)
    ;(adj.get(b) ?? adj.set(b, []).get(b)!).push(a)
  }
  const cross = (id: number, x0: number, y0: number, a: number, x1: number, y1: number, b: number) => {
    if (!pos.has(id)) {
      const t = (level - a) / (b - a || 1e-9)
      pos.set(id, [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t])
    }
    return id
  }

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const tl = v(i, j), tr = v(i + 1, j), br = v(i + 1, j + 1), bl = v(i, j + 1)
      const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
      if (idx === 0 || idx === 15) continue
      const T = () => cross(hId(i, j), i, j, tl, i + 1, j, tr)
      const R = () => cross(vId(i + 1, j), i + 1, j, tr, i + 1, j + 1, br)
      const B = () => cross(hId(i, j + 1), i, j + 1, bl, i + 1, j + 1, br)
      const L = () => cross(vId(i, j), i, j, tl, i, j + 1, bl)
      switch (idx) {
        case 1: case 14: link(L(), B()); break
        case 2: case 13: link(B(), R()); break
        case 3: case 12: link(L(), R()); break
        case 4: case 11: link(T(), R()); break
        case 6: case 9: link(T(), B()); break
        case 7: case 8: link(L(), T()); break
        case 5: case 10: {
          const centre = (tl + tr + br + bl) / 4 > level
          if ((idx === 5) === centre) { link(L(), T()); link(B(), R()) } else { link(L(), B()); link(T(), R()) }
          break
        }
      }
    }
  }

  const seen = new Set<number>()
  const out: Contour[] = []
  const walk = (start: number) => {
    const ids = [start]
    seen.add(start)
    let prev = -1
    let cur = start
    for (;;) {
      const next = (adj.get(cur) ?? []).find((n) => n !== prev && !seen.has(n))
      if (next === undefined) break
      ids.push(next)
      seen.add(next)
      prev = cur
      cur = next
    }
    const closed = ids.length > 2 && (adj.get(cur) ?? []).includes(start)
    out.push({ points: ids.map((id) => pos.get(id)!), closed })
  }
  for (const [id, ns] of adj) if (ns.length === 1 && !seen.has(id)) walk(id)
  for (const id of adj.keys()) if (!seen.has(id)) walk(id)
  return out
}

export const contours: Tool = {
  id: 'contours',
  name: 'Contours',
  group: 'Line',
  blurb: 'Topographic map lines traced through a noise landscape, with index lines like a survey map.',
  icon: '<path d="M4 15c2-5 6-8 10-6s6 0 6 0M4 19c3-3 6-4 10-2s6-1 6-1M7 10c1-3 4-5 7-4"/>',
  params: [
    { key: 'levels', label: 'Levels', section: 'Terrain', type: 'number', default: 18, min: 2, max: 80, step: 1 },
    { key: 'scale', label: 'Zoom', section: 'Terrain', type: 'number', default: 1.6, min: 0.3, max: 10, step: 0.1, hint: 'Higher shows more hills' },
    { key: 'octaves', label: 'Detail', section: 'Terrain', type: 'number', default: 3, min: 1, max: 7, step: 1 },
    { key: 'warp', label: 'Warp', section: 'Terrain', type: 'number', default: 0.35, min: 0, max: 3, step: 0.05 },
    { key: 'resolution', label: 'Grid', section: 'Terrain', type: 'number', default: 6, min: 3, max: 30, step: 1, unit: 'px', hint: 'Smaller is finer and heavier' },

    strokeWidthParam(1.5, 10),
    { key: 'majorEvery', label: 'Index line every', section: 'Style', type: 'number', default: 5, min: 0, max: 12, step: 1, hint: '0 turns index lines off' },
    { key: 'smooth', label: 'Smooth curves', section: 'Style', type: 'toggle', default: true },
    opacityParam(1),
    paletteParam('ember'),
    { key: 'byLevel', label: 'Colour by height', section: 'Colour', type: 'toggle', default: true },
  ],
  render({ params: p, width, height, background, seed }) {
    const noise = createNoise2D(seed)
    const cell = num(p, 'resolution') * (Math.max(width, height) / 1080)
    const cols = Math.ceil(width / cell)
    const rows = Math.ceil(height / cell)
    const s = num(p, 'scale') / Math.max(cols, rows)
    const warp = num(p, 'warp')
    const oct = num(p, 'octaves')
    const values = new Float32Array((cols + 1) * (rows + 1))
    let min = Infinity, max = -Infinity
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        let x = i * s
        let y = j * s
        if (warp > 0) {
          const wx = fbm(noise, x + 5.2, y + 1.3, 3)
          const wy = fbm(noise, x + 1.7, y + 9.2, 3)
          x += warp * wx
          y += warp * wy
        }
        const val = fbm(noise, x, y, oct)
        values[j * (cols + 1) + i] = val
        if (val < min) min = val
        if (val > max) max = val
      }
    }
    const levels = num(p, 'levels')
    const colors = palette(str(p, 'palette')).colors
    const major = num(p, 'majorEvery')
    const sw = num(p, 'strokeWidth')
    let body = ''
    for (let k = 1; k <= levels; k++) {
      const level = min + ((max - min) * k) / (levels + 1)
      const lines = contourLines(values, cols, rows, level)
      if (!lines.length) continue
      const d = lines
        .map((c) => {
          const pts = c.points.map(([x, y]) => [x * cell, y * cell] as Pt)
          return bool(p, 'smooth') && pts.length > 3 ? smoothPath(pts, c.closed, 0.8) : linePath(pts, c.closed)
        })
        .join('')
      const isMajor = major > 0 && k % major === 0
      const c = bool(p, 'byLevel') ? gradientAt(colors, (k - 1) / Math.max(1, levels - 1)) : colors[0]
      body += el('path', { d, fill: 'none', stroke: c, 'stroke-width': isMajor ? sw * 2.2 : sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
