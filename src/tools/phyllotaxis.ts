import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { innerBox, marginParam, num, opacityParam, paletteParam, str } from './common'

/** The golden angle, in degrees. Nudge it and the spirals change family. */
export const GOLDEN_ANGLE = 137.50776

export const phyllotaxis: Tool = {
  id: 'phyllotaxis',
  name: 'Phyllotaxis',
  group: 'Shape',
  blurb: 'Sunflower-head spirals: seeds placed by the golden angle, the way plants pack them.',
  icon: '<circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="10" r="1.2"/><circle cx="9" cy="16" r="1.2"/><circle cx="8" cy="8" r="1.4"/><circle cx="17" cy="16" r="1.6"/><circle cx="12" cy="4.5" r="1.6"/><circle cx="4.5" cy="12" r="1.6"/><circle cx="19.5" cy="12" r="1.4"/><circle cx="12" cy="19.5" r="1.6"/>',
  params: [
    { key: 'count', label: 'Seeds', section: 'Spiral', type: 'number', default: 800, min: 20, max: 6000, step: 10 },
    { key: 'angle', label: 'Divergence angle', section: 'Spiral', type: 'number', default: GOLDEN_ANGLE, min: 130, max: 145, step: 0.01, unit: '°', hint: '137.51° is the golden angle. Small changes make arms appear' },
    { key: 'dot', label: 'Seed size', section: 'Spiral', type: 'number', default: 0.55, min: 0.05, max: 1.5, step: 0.01, hint: 'Share of the gap between seeds' },
    { key: 'growth', label: 'Grow outwards', section: 'Spiral', type: 'number', default: 0.6, min: 0, max: 1, step: 0.01, hint: '0 keeps every seed the same size' },
    {
      key: 'mark', label: 'Mark', section: 'Spiral', type: 'segmented', default: 'circle',
      options: [{ value: 'circle', label: 'Dot' }, { value: 'square', label: 'Square' }, { value: 'ring', label: 'Ring' }],
    },
    marginParam(0.06),
    opacityParam(1),
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'radius',
      options: [{ value: 'single', label: 'Lead' }, { value: 'radius', label: 'Radius' }, { value: 'arm', label: 'Arm' }],
    },
  ],
  render({ params: p, width, height, background }) {
    const box = innerBox(width, height, num(p, 'margin'))
    const R = Math.min(box.w, box.h) / 2
    const n = num(p, 'count')
    const c = Math.min(box.w, box.h) / 2 / Math.sqrt(n)
    const a = (num(p, 'angle') * Math.PI) / 180
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const mark = str(p, 'mark')
    const groups = new Map<string, string>()
    for (let i = 0; i < n; i++) {
      const r = c * Math.sqrt(i)
      if (r > R) break
      const t = r / R
      const x = width / 2 + r * Math.cos(i * a)
      const y = height / 2 + r * Math.sin(i * a)
      const s = c * num(p, 'dot') * (1 - num(p, 'growth') + num(p, 'growth') * (0.3 + t))
      const col = by === 'single' ? colors[0] : by === 'radius' ? gradientAt(colors, t) : colors[i % Math.min(colors.length, 5)]
      const d = mark === 'square'
        ? `M${f(x - s)} ${f(y - s)}h${f(s * 2)}v${f(s * 2)}h${f(-s * 2)}Z`
        : `M${f(x - s)} ${f(y)}a${f(s)} ${f(s)} 0 1 0 ${f(s * 2)} 0a${f(s)} ${f(s)} 0 1 0 ${f(-s * 2)} 0`
      groups.set(col, (groups.get(col) ?? '') + d)
    }
    let body = ''
    for (const [col, d] of groups) {
      body += mark === 'ring'
        ? el('path', { d, fill: 'none', stroke: col, 'stroke-width': f(c * 0.12) })
        : el('path', { d, fill: col })
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
