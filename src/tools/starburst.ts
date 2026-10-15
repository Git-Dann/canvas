import type { Tool } from '../core/types'
import { f, el, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { innerBox, marginParam, num, opacityParam, paletteParam, str } from './common'

export const starburst: Tool = {
  id: 'starburst',
  name: 'Starburst',
  group: 'Shape',
  blurb: 'Radiating rays, from a clean sunburst to a ragged comic-book explosion.',
  icon: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.9 4.9l3.5 3.5M15.6 15.6l3.5 3.5M4.9 19.1l3.5-3.5M15.6 8.4l3.5-3.5"/>',
  params: [
    { key: 'rays', label: 'Rays', section: 'Burst', type: 'number', default: 36, min: 3, max: 360, step: 1 },
    { key: 'inner', label: 'Hole', section: 'Burst', type: 'number', default: 0.12, min: 0, max: 0.9, step: 0.01, hint: 'Share of the radius left empty' },
    { key: 'width', label: 'Ray width', section: 'Burst', type: 'number', default: 0.5, min: 0.02, max: 1, step: 0.01, hint: 'Share of each slice' },
    { key: 'taper', label: 'Taper', section: 'Burst', type: 'number', default: 1, min: 0, max: 1, step: 0.01, hint: '1 ends each ray in a point' },
    { key: 'jitter', label: 'Ragged ends', section: 'Burst', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'reach', label: 'Reach', section: 'Burst', type: 'number', default: 1, min: 0.3, max: 2.5, step: 0.01, hint: 'Over 1 runs rays off the artboard' },
    { key: 'rotation', label: 'Rotation', section: 'Burst', type: 'number', default: 0, min: 0, max: 360, step: 1, unit: '°' },
    marginParam(0.04),
    opacityParam(1),
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'alternate', label: 'Alternate' }, { value: 'sweep', label: 'Sweep' }],
    },
  ],
  render({ params: p, width, height, background, rng }) {
    const box = innerBox(width, height, num(p, 'margin'))
    const R = (Math.min(box.w, box.h) / 2) * num(p, 'reach')
    const r0 = R * num(p, 'inner')
    const n = num(p, 'rays')
    const slice = (Math.PI * 2) / n
    const half = (slice * num(p, 'width')) / 2
    const tip = 1 - num(p, 'taper')
    const rot = (num(p, 'rotation') * Math.PI) / 180
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const cx = width / 2, cy = height / 2
    const pt = (a: number, r: number) => `${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`
    const groups = new Map<string, string>()
    for (let i = 0; i < n; i++) {
      const a = rot + i * slice
      const len = R * (1 - num(p, 'jitter') * rng() * 0.7)
      const d = `M${pt(a - half, r0)}L${pt(a - half * tip, len)}L${pt(a + half * tip, len)}L${pt(a + half, r0)}Z`
      const c = by === 'single' ? colors[0] : by === 'alternate' ? colors[i % 2 === 0 ? 0 : Math.min(1, colors.length - 1)] : gradientAt(colors, i / n)
      groups.set(c, (groups.get(c) ?? '') + d)
    }
    let body = ''
    for (const [c, d] of groups) body += el('path', { d, fill: c, 'stroke-linejoin': 'round' })
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
