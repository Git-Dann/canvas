import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, linePath, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { inkFor, num, paletteParam, str } from './common'

export const opArt: Tool = {
  id: 'op-art',
  name: 'Op-art stripes',
  group: 'Pattern',
  blurb: 'Bridget Riley-style stripes that bulge and pinch around a lens, for a moving-surface illusion.',
  icon: '<path d="M4 3c0 6 3 12 0 18M9 3c0 6 3 12 0 18M14 3c0 6 3 12 0 18M19 3c0 6 3 12 0 18"/>',
  params: [
    { key: 'stripes', label: 'Stripes', section: 'Stripes', type: 'number', default: 40, min: 4, max: 240, step: 1 },
    { key: 'bulge', label: 'Bulge', section: 'Stripes', type: 'number', default: 0.6, min: -1, max: 1, step: 0.01, hint: 'Negative pinches the stripes together' },
    { key: 'lens', label: 'Lens size', section: 'Stripes', type: 'number', default: 0.35, min: 0.05, max: 1, step: 0.01 },
    { key: 'lensX', label: 'Lens across', section: 'Stripes', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'lensY', label: 'Lens down', section: 'Stripes', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'ripple', label: 'Ripple', section: 'Stripes', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'vertical', label: 'Vertical stripes', section: 'Stripes', type: 'toggle', default: true },
    paletteParam('mono-dark'),
  ],
  render({ params: p, width, height, background }) {
    const vert = p.vertical === true
    const W = vert ? width : height
    const H = vert ? height : width
    const n = num(p, 'stripes')
    const lx = (vert ? num(p, 'lensX') : num(p, 'lensY')) * W
    const ly = (vert ? num(p, 'lensY') : num(p, 'lensX')) * H
    const R = num(p, 'lens') * Math.max(W, H)
    const bulge = num(p, 'bulge')
    const ripple = num(p, 'ripple')
    const steps = 160
    // Displace a stripe boundary sideways near the lens: a smooth radial bump.
    const warp = (x: number, y: number) => {
      const dx = x - lx, dy = y - ly
      const fall = Math.exp(-(dx * dx + dy * dy) / (2 * R * R))
      return x + dx * bulge * fall + Math.sin((y / H) * Math.PI * 8) * ripple * (W / n) * 0.8
    }
    const boundary = (k: number): Pt[] => {
      const x0 = (W * k) / n
      const pts: Pt[] = []
      for (let s = 0; s <= steps; s++) {
        const y = (H * s) / steps
        pts.push([warp(x0, y), y])
      }
      return pts
    }
    const colors = palette(str(p, 'palette')).colors
    const ink = inkFor(colors, background)
    let d = ''
    let prev = boundary(0)
    for (let k = 1; k <= n; k++) {
      const next = boundary(k)
      if (k % 2 === 1) {
        const poly = [...prev, ...next.slice().reverse()]
        d += linePath(vert ? poly : poly.map(([a, b]) => [b, a] as Pt), true)
      }
      prev = next
    }
    return { svg: svgDoc({ width, height, background, body: el('path', { d, fill: ink }) }) }
  },
}
