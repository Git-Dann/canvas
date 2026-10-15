import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, smoothPath, svgDoc } from '../core/svg'
import { createNoise2D } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { innerBox, marginParam, num, opacityParam, paletteParam, str, strokeWidthParam } from './common'

export const waves: Tool = {
  id: 'waves',
  name: 'Waves',
  group: 'Line',
  blurb: 'Stacked sine waves that drift out of phase, with optional noise for a hand-drawn swell.',
  icon: '<path d="M2 8c3-3 5 3 8 0s5 3 8 0 3-1 4-1M2 13c3-3 5 3 8 0s5 3 8 0 3-1 4-1M2 18c3-3 5 3 8 0s5 3 8 0 3-1 4-1"/>',
  params: [
    { key: 'lines', label: 'Lines', section: 'Waves', type: 'number', default: 40, min: 1, max: 300, step: 1 },
    { key: 'amplitude', label: 'Height', section: 'Waves', type: 'number', default: 0.35, min: 0, max: 3, step: 0.01, hint: 'Relative to the gap between lines' },
    { key: 'frequency', label: 'Crests', section: 'Waves', type: 'number', default: 3, min: 0.25, max: 30, step: 0.25, hint: 'Across the artboard' },
    { key: 'phase', label: 'Drift', section: 'Waves', type: 'number', default: 0.15, min: 0, max: 2, step: 0.01, hint: 'Phase shift from one line to the next' },
    { key: 'noise', label: 'Swell', section: 'Waves', type: 'number', default: 0.4, min: 0, max: 3, step: 0.01, hint: 'Noise added on top of the sine' },
    { key: 'vertical', label: 'Run vertically', section: 'Waves', type: 'toggle', default: false },
    marginParam(0.08),
    strokeWidthParam(2, 16),
    opacityParam(1),
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'line', label: 'Line' }, { value: 'gradient', label: 'Gradient' }],
    },
  ],
  render({ params: p, width, height, background, seed }) {
    const vert = p.vertical === true
    const W = vert ? height : width
    const H = vert ? width : height
    const box = innerBox(W, H, num(p, 'margin'))
    const n = num(p, 'lines')
    const gap = box.h / Math.max(1, n)
    const amp = gap * num(p, 'amplitude') * 2
    const noise = createNoise2D(seed)
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const steps = Math.min(400, Math.max(40, Math.round(num(p, 'frequency') * 24)))
    const groups = new Map<string, string>()
    for (let k = 0; k < n; k++) {
      const y0 = box.y + gap * (k + 0.5)
      const pts: Pt[] = []
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const x = box.x + t * box.w
        const y = y0 + amp * Math.sin(t * Math.PI * 2 * num(p, 'frequency') + k * num(p, 'phase')) + gap * num(p, 'noise') * noise(t * 3, k * 0.13)
        pts.push(vert ? [y, x] : [x, y])
      }
      const c = by === 'single' ? colors[0] : by === 'line' ? colors[k % colors.length] : gradientAt(colors, k / Math.max(1, n - 1))
      groups.set(c, (groups.get(c) ?? '') + smoothPath(pts))
    }
    let body = ''
    for (const [c, d] of groups) body += el('path', { d, fill: 'none', stroke: c, 'stroke-width': num(p, 'strokeWidth') * (Math.min(width, height) / 1080), 'stroke-linecap': 'round' })
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
