import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { num, paletteParam, str } from './common'

type TileKind = 'arcs' | 'maze' | 'triangles' | 'dots' | 'semis' | 'cross'

export const tiles: Tool = {
  id: 'tiles',
  name: 'Tile patterns',
  group: 'Pattern',
  blurb: 'Truchet arcs, 10 PRINT mazes, triangles and dots on a seeded grid. Good for backgrounds.',
  icon: '<path d="M4 4h16v16H4zM4 12a8 8 0 0 0 8-8M12 20a8 8 0 0 1 8-8"/>',
  params: [
    {
      key: 'kind', label: 'Tile', section: 'Tiles', type: 'select', default: 'arcs',
      options: [
        { value: 'arcs', label: 'Truchet arcs' }, { value: 'maze', label: 'Maze (10 PRINT)' }, { value: 'triangles', label: 'Triangles' },
        { value: 'dots', label: 'Dots' }, { value: 'semis', label: 'Half circles' }, { value: 'cross', label: 'Plus and cross' },
      ],
    },
    { key: 'cols', label: 'Columns', section: 'Tiles', type: 'number', default: 14, min: 2, max: 80, step: 1 },
    { key: 'bias', label: 'Direction bias', section: 'Tiles', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01, hint: '0.5 is fully random' },
    { key: 'gap', label: 'Gap', section: 'Tiles', type: 'number', default: 0, min: 0, max: 0.45, step: 0.01 },
    { key: 'weight', label: 'Line weight', section: 'Style', type: 'number', default: 0.12, min: 0.02, max: 0.5, step: 0.01, hint: 'Share of tile size' },
    paletteParam(),
    {
      key: 'colorMode', label: 'Colour', section: 'Colour', type: 'segmented', default: 'random',
      options: [{ value: 'single', label: 'Lead' }, { value: 'random', label: 'Random' }, { value: 'checker', label: 'Checker' }],
    },
  ],
  render({ params: p, width, height, background, rng }) {
    const kind = str(p, 'kind') as TileKind
    const cols = num(p, 'cols')
    const s = width / cols
    const rows = Math.ceil(height / s)
    const colors = palette(str(p, 'palette')).colors
    const w = num(p, 'weight') * s
    const g = num(p, 'gap') * s
    const bias = num(p, 'bias')
    const mode = str(p, 'colorMode')
    const groups = new Map<string, { stroke: string[]; fill: string[] }>()
    const add = (c: string, kindOf: 'stroke' | 'fill', d: string) => {
      const e = groups.get(c) ?? { stroke: [], fill: [] }
      e[kindOf].push(d)
      groups.set(c, e)
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * s + g / 2
        const y = j * s + g / 2
        const t = s - g
        const flip = rng() < bias
        const c = mode === 'single' ? colors[0] : mode === 'checker' ? colors[(i + j) % colors.length] : rng.pick(colors)
        const r = t / 2
        switch (kind) {
          case 'arcs':
            add(c, 'stroke', flip
              ? `M${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + r)}M${f(x + t)} ${f(y + r)}A${f(r)} ${f(r)} 0 0 0 ${f(x + r)} ${f(y + t)}`
              : `M${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 0 0 ${f(x + t)} ${f(y + r)}M${f(x)} ${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y + t)}`)
            break
          case 'maze':
            add(c, 'stroke', flip ? `M${f(x)} ${f(y)}L${f(x + t)} ${f(y + t)}` : `M${f(x + t)} ${f(y)}L${f(x)} ${f(y + t)}`)
            break
          case 'triangles': {
            const corner = rng.int(0, 3)
            const pts = [[x, y], [x + t, y], [x + t, y + t], [x, y + t]].filter((_, k) => k !== corner)
            add(c, 'fill', `M${pts.map(([a, b]) => `${f(a)} ${f(b)}`).join('L')}Z`)
            break
          }
          case 'dots': {
            const rr = r * (flip ? 0.9 : rng.range(0.15, 0.6))
            add(c, 'fill', `M${f(x + r - rr)} ${f(y + r)}a${f(rr)} ${f(rr)} 0 1 0 ${f(rr * 2)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-rr * 2)} 0`)
            break
          }
          case 'semis': {
            const rot = rng.int(0, 3) * 90
            const cx = x + r
            const cy = y + r
            const a = (rot * Math.PI) / 180
            const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r
            const ex = cx - Math.cos(a) * r, ey = cy - Math.sin(a) * r
            add(c, 'fill', `M${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 0 1 ${f(ex)} ${f(ey)}Z`)
            break
          }
          case 'cross': {
            const m = t * 0.2
            add(c, 'stroke', flip
              ? `M${f(x + r)} ${f(y + m)}L${f(x + r)} ${f(y + t - m)}M${f(x + m)} ${f(y + r)}L${f(x + t - m)} ${f(y + r)}`
              : `M${f(x + m)} ${f(y + m)}L${f(x + t - m)} ${f(y + t - m)}M${f(x + t - m)} ${f(y + m)}L${f(x + m)} ${f(y + t - m)}`)
            break
          }
        }
      }
    }
    let body = ''
    for (const [c, e] of groups) {
      if (e.fill.length) body += el('path', { d: e.fill.join(''), fill: c })
      if (e.stroke.length) body += el('path', { d: e.stroke.join(''), fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': kind === 'arcs' ? 'butt' : 'round' })
    }
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
