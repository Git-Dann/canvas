import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, linePath, smoothPath, svgDoc } from '../core/svg'
import { createNoise2D } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { num, paletteParam, str } from './common'

export const colourBands: Tool = {
  id: 'colour-bands',
  name: 'Colour bands',
  group: 'Colour',
  blurb: 'Stacked bands of colour with wavy edges, like geological strata or a sunset in layers.',
  icon: '<path d="M3 7c4-2 7 2 11 0s5-1 7 0M3 12c4-2 7 2 11 0s5-1 7 0M3 17c4-2 7 2 11 0s5-1 7 0"/>',
  params: [
    { key: 'bands', label: 'Bands', section: 'Bands', type: 'number', default: 9, min: 2, max: 60, step: 1 },
    { key: 'wave', label: 'Edge wave', section: 'Bands', type: 'number', default: 0.5, min: 0, max: 3, step: 0.01, hint: 'Relative to the band height' },
    { key: 'roughness', label: 'Edge detail', section: 'Bands', type: 'number', default: 1.5, min: 0.2, max: 8, step: 0.1 },
    {
      key: 'shape', label: 'Shape', section: 'Bands', type: 'segmented', default: 'horizontal',
      options: [{ value: 'horizontal', label: 'Strata' }, { value: 'rings', label: 'Rings' }],
    },
    paletteParam('ember'),
    {
      key: 'colorBy', label: 'Colours', section: 'Colour', type: 'segmented', default: 'blend',
      options: [{ value: 'cycle', label: 'Cycle' }, { value: 'blend', label: 'Blend' }],
    },
  ],
  render({ params: p, width, height, background, seed }) {
    const n = num(p, 'bands')
    const noise = createNoise2D(seed)
    const colors = palette(str(p, 'palette')).colors
    const colourAt = (k: number) => (str(p, 'colorBy') === 'cycle' ? colors[k % colors.length] : gradientAt(colors, k / Math.max(1, n - 1)))
    let body = ''
    if (str(p, 'shape') === 'rings') {
      const cx = width / 2, cy = height / 2
      const R = Math.hypot(width, height) / 2
      // Largest first, so each ring sits on the one outside it.
      for (let k = 0; k < n; k++) {
        const r = R * (1 - k / n)
        const pts: Pt[] = []
        for (let s = 0; s < 96; s++) {
          const a = (s / 96) * Math.PI * 2
          const w = 1 + num(p, 'wave') * 0.12 * noise(Math.cos(a) * num(p, 'roughness') + k * 3.1, Math.sin(a) * num(p, 'roughness'))
          pts.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w])
        }
        body += el('path', { d: smoothPath(pts, true), fill: colourAt(k) })
      }
    } else {
      const bandH = height / n
      const steps = 64
      // Each band is filled from its top edge down past the artboard, drawn
      // top to bottom so every band covers the ragged bottom of the one above.
      for (let k = 0; k < n; k++) {
        const top: Pt[] = []
        for (let s = 0; s <= steps; s++) {
          const x = -width * 0.02 + (s / steps) * width * 1.04
          const y = k === 0 ? -bandH : k * bandH + bandH * num(p, 'wave') * noise((s / steps) * num(p, 'roughness'), k * 0.71)
          top.push([x, y])
        }
        const d = (k === 0 ? linePath(top) : smoothPath(top)) + `L${width * 1.02} ${height + 1}L${-width * 0.02} ${height + 1}Z`
        body += el('path', { d, fill: colourAt(k) })
      }
    }
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
