import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { innerBox, marginParam, num, opacityParam, paletteParam, str, strokeWidthParam } from './common'

export const orbits: Tool = {
  id: 'orbits',
  name: 'Orbit rings',
  group: 'Shape',
  blurb: 'Concentric rings of dots or dashes, each turned a little, like a planetarium diagram.',
  icon: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6" stroke-dasharray="2 2"/><circle cx="12" cy="12" r="10" stroke-dasharray="1 3"/>',
  params: [
    { key: 'rings', label: 'Rings', section: 'Rings', type: 'number', default: 14, min: 1, max: 80, step: 1 },
    { key: 'density', label: 'Marks per ring', section: 'Rings', type: 'number', default: 1.6, min: 0.2, max: 4, step: 0.05, hint: 'Outer rings get more, so spacing stays even' },
    {
      key: 'mark', label: 'Mark', section: 'Rings', type: 'segmented', default: 'dot',
      options: [{ value: 'dot', label: 'Dot' }, { value: 'dash', label: 'Dash' }, { value: 'line', label: 'Solid' }],
    },
    { key: 'gaps', label: 'Broken rings', section: 'Rings', type: 'number', default: 0.3, min: 0, max: 1, step: 0.01, hint: 'Chance a ring leaves a gap' },
    { key: 'twist', label: 'Twist', section: 'Rings', type: 'number', default: 12, min: 0, max: 90, step: 1, unit: '°' },
    marginParam(0.06),
    strokeWidthParam(7, 32),
    opacityParam(1),
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'ring',
      options: [{ value: 'single', label: 'Lead' }, { value: 'ring', label: 'Ring' }, { value: 'radius', label: 'Radius' }],
    },
  ],
  render({ params: p, width, height, background, rng }) {
    const box = innerBox(width, height, num(p, 'margin'))
    const R = Math.min(box.w, box.h) / 2
    const n = num(p, 'rings')
    const sw = num(p, 'strokeWidth') * (Math.min(width, height) / 1080)
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const mark = str(p, 'mark')
    const cx = width / 2, cy = height / 2
    let body = ''
    for (let k = 0; k < n; k++) {
      const r = (R * (k + 1)) / n
      const c = by === 'single' ? colors[0] : by === 'ring' ? colors[k % colors.length] : gradientAt(colors, k / Math.max(1, n - 1))
      const start = (k * num(p, 'twist') * Math.PI) / 180
      const sweep = rng() < num(p, 'gaps') ? Math.PI * 2 * rng.range(0.45, 0.9) : Math.PI * 2
      const circ = r * sweep
      const marks = Math.max(3, Math.round((circ / (sw * 4)) * num(p, 'density')))
      if (mark === 'line' || mark === 'dash') {
        const full = sweep >= Math.PI * 2 - 1e-6
        const a1 = start + sweep - (full ? 0.0001 : 0)
        const d = `M${f(cx + Math.cos(start) * r)} ${f(cy + Math.sin(start) * r)}A${f(r)} ${f(r)} 0 ${sweep > Math.PI ? 1 : 0} 1 ${f(cx + Math.cos(a1) * r)} ${f(cy + Math.sin(a1) * r)}`
        const seg = circ / marks
        body += el('path', { d, fill: 'none', stroke: c, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-dasharray': mark === 'dash' ? `${f(seg * 0.55)} ${f(seg * 0.45)}` : undefined })
      } else {
        let d = ''
        const s = sw / 2
        for (let i = 0; i < marks; i++) {
          const a = start + (sweep * i) / marks
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
          d += `M${f(x - s)} ${f(y)}a${f(s)} ${f(s)} 0 1 0 ${f(s * 2)} 0a${f(s)} ${f(s)} 0 1 0 ${f(-s * 2)} 0`
        }
        body += el('path', { d, fill: c })
      }
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
