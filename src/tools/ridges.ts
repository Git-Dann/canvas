import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, linePath, smoothPath, svgDoc } from '../core/svg'
import { createNoise2D, fbm } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { bool, innerBox, marginParam, num, paletteParam, str, strokeWidthParam } from './common'

export const ridges: Tool = {
  id: 'ridges',
  name: 'Ridge lines',
  group: 'Line',
  blurb: 'Stacked horizontal lines lifted by noise into peaks, each hiding the one behind it.',
  icon: '<path d="M3 9h5l2-4 2 4h9M3 14h4l3-5 3 5h8M3 19h6l2-3 2 3h8"/>',
  params: [
    { key: 'rows', label: 'Lines', section: 'Ridges', type: 'number', default: 60, min: 5, max: 200, step: 1 },
    { key: 'amplitude', label: 'Peak height', section: 'Ridges', type: 'number', default: 0.12, min: 0, max: 0.6, step: 0.005, hint: 'Share of artboard height' },
    { key: 'scale', label: 'Roughness', section: 'Ridges', type: 'number', default: 3, min: 0.5, max: 20, step: 0.1 },
    { key: 'focus', label: 'Centre focus', section: 'Ridges', type: 'number', default: 0.7, min: 0, max: 1, step: 0.01, hint: 'Keeps the edges calm and the middle wild' },
    { key: 'resolution', label: 'Points per line', section: 'Ridges', type: 'number', default: 120, min: 20, max: 600, step: 10 },
    { key: 'occlude', label: 'Hide lines behind', section: 'Ridges', type: 'toggle', default: true },

    marginParam(0.12),
    strokeWidthParam(2, 10),
    { key: 'smooth', label: 'Smooth curves', section: 'Style', type: 'toggle', default: true },
    paletteParam('hazard'),
    { key: 'gradient', label: 'Fade down the page', section: 'Colour', type: 'toggle', default: false },
  ],
  render({ params: p, width, height, background, seed }) {
    const noise = createNoise2D(seed)
    const box = innerBox(width, height, num(p, 'margin'))
    const rows = num(p, 'rows')
    const res = num(p, 'resolution')
    const amp = num(p, 'amplitude') * height
    const scale = num(p, 'scale')
    const focus = num(p, 'focus')
    const colors = palette(str(p, 'palette')).colors
    const fillBg = background === 'transparent' ? 'none' : background
    let body = ''
    for (let r = 0; r < rows; r++) {
      const y0 = box.y + (rows === 1 ? box.h / 2 : (r / (rows - 1)) * box.h)
      const pts: Pt[] = []
      for (let i = 0; i <= res; i++) {
        const t = i / res
        const x = box.x + t * box.w
        const env = (1 - focus) + focus * Math.exp(-((t - 0.5) ** 2) / 0.03)
        const n = (fbm(noise, t * scale, r * 0.18, 4) + 1) / 2
        pts.push([x, y0 - Math.max(0, n - 0.35) * amp * 2.2 * env])
      }
      const d = bool(p, 'smooth') ? smoothPath(pts) : linePath(pts)
      const c = bool(p, 'gradient') ? gradientAt(colors, r / Math.max(1, rows - 1)) : colors[0]
      if (bool(p, 'occlude') && fillBg !== 'none') {
        body += el('path', { d: `${d}L${box.x + box.w} ${height}L${box.x} ${height}Z`, fill: fillBg })
      }
      body += el('path', { d, fill: 'none', stroke: c, 'stroke-width': num(p, 'strokeWidth'), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
    }
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
