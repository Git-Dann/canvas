import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, linePath, smoothPath, svgDoc } from '../core/svg'
import { createNoise2D, fbm } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { bool, num, opacityParam, paletteParam, str, strokeWidthParam } from './common'

/** Upper bound on total points, so a file never balloons past a few MB. */
export const POINT_BUDGET = 300_000

export const flowField: Tool = {
  id: 'flow-field',
  name: 'Flow field',
  group: 'Line',
  blurb: 'Hundreds of lines following a noise current, like wind maps or combed hair.',
  icon: '<path d="M3 7c4-3 8 3 12 0s4-2 6-1M3 12c4-3 8 3 12 0s4-2 6-1M3 17c4-3 8 3 12 0s4-2 6-1"/>',
  params: [
    { key: 'count', label: 'Lines', section: 'Field', type: 'number', default: 900, min: 20, max: 4000, step: 10 },
    { key: 'steps', label: 'Line length', section: 'Field', type: 'number', default: 80, min: 5, max: 400, step: 1, unit: 'steps' },
    { key: 'stepLength', label: 'Step size', section: 'Field', type: 'number', default: 4, min: 1, max: 16, step: 0.5, unit: 'px' },
    { key: 'scale', label: 'Noise scale', section: 'Field', type: 'number', default: 2.2, min: 0.2, max: 12, step: 0.1, hint: 'Higher is busier' },
    { key: 'octaves', label: 'Detail', section: 'Field', type: 'number', default: 2, min: 1, max: 6, step: 1 },
    { key: 'turn', label: 'Turbulence', section: 'Field', type: 'number', default: 2, min: 0.25, max: 8, step: 0.05 },
    { key: 'direction', label: 'Bias angle', section: 'Field', type: 'number', default: 0, min: 0, max: 360, step: 1, unit: '°' },
    {
      key: 'seeding', label: 'Start points', section: 'Field', type: 'segmented', default: 'random',
      options: [{ value: 'random', label: 'Scatter' }, { value: 'grid', label: 'Grid' }, { value: 'edge', label: 'Left edge' }],
    },

    strokeWidthParam(1.25, 12),
    opacityParam(0.8),
    { key: 'smooth', label: 'Smooth curves', section: 'Style', type: 'toggle', default: true },
    paletteParam('ember'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'line',
      options: [{ value: 'single', label: 'Lead' }, { value: 'line', label: 'Line' }, { value: 'position', label: 'Height' }],
    },
  ],
  render({ params: p, width, height, background, rng, seed }) {
    const noise = createNoise2D(seed)
    const count = num(p, 'count')
    const steps = Math.min(num(p, 'steps'), Math.floor(POINT_BUDGET / count))
    const step = num(p, 'stepLength') * (Math.min(width, height) / 1080)
    const scale = num(p, 'scale') / Math.min(width, height)
    const bias = (num(p, 'direction') * Math.PI) / 180
    const colors = palette(str(p, 'palette')).colors
    const seeding = str(p, 'seeding')
    const cols = Math.ceil(Math.sqrt((count * width) / height))
    const rows = Math.ceil(count / cols)

    const groups = new Map<string, string[]>()
    for (let i = 0; i < count; i++) {
      let x: number, y: number
      if (seeding === 'grid') {
        x = ((i % cols) + 0.5) * (width / cols)
        y = (Math.floor(i / cols) + 0.5) * (height / rows)
      } else if (seeding === 'edge') {
        x = rng.range(-step * 4, step * 4)
        y = rng.range(0, height)
      } else {
        x = rng.range(0, width)
        y = rng.range(0, height)
      }
      const pts: Pt[] = [[x, y]]
      for (let s = 0; s < steps; s++) {
        const a = fbm(noise, x * scale, y * scale, num(p, 'octaves')) * Math.PI * num(p, 'turn') + bias
        x += Math.cos(a) * step
        y += Math.sin(a) * step
        if (x < -step * 8 || x > width + step * 8 || y < -step * 8 || y > height + step * 8) break
        pts.push([x, y])
      }
      if (pts.length < 2) continue
      const by = str(p, 'colorBy')
      const c = by === 'single' ? colors[0] : by === 'line' ? colors[i % colors.length] : gradientAt(colors, pts[0][1] / height)
      const d = bool(p, 'smooth') && pts.length > 2 ? smoothPath(pts) : linePath(pts)
      const list = groups.get(c) ?? []
      list.push(d)
      groups.set(c, list)
    }
    // One <path> per colour keeps the file small and the DOM light.
    let body = ''
    for (const [c, ds] of groups) {
      body += el('path', { d: ds.join(''), fill: 'none', stroke: c, 'stroke-width': num(p, 'strokeWidth'), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
