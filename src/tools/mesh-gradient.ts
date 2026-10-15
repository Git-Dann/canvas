import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { num, paletteParam, str } from './common'

export const meshGradient: Tool = {
  id: 'mesh-gradient',
  name: 'Mesh gradient',
  group: 'Colour',
  blurb: 'Colour points that melt into one another, the smooth multi-colour gradient of app splash screens.',
  icon: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="15" r="3"/>',
  params: [
    { key: 'points', label: 'Colour points', section: 'Mesh', type: 'number', default: 6, min: 2, max: 24, step: 1 },
    { key: 'reach', label: 'Reach', section: 'Mesh', type: 'number', default: 0.7, min: 0.15, max: 1.6, step: 0.01, hint: 'How far each colour spreads' },
    { key: 'softness', label: 'Softness', section: 'Mesh', type: 'number', default: 0.6, min: 0, max: 1, step: 0.01 },
    { key: 'grain', label: 'Grain', section: 'Texture', type: 'number', default: 0.08, min: 0, max: 0.5, step: 0.01 },
    paletteParam('dusk'),
    { key: 'base', label: 'Base colour', section: 'Colour', type: 'number', default: 1, min: 1, max: 6, step: 1, hint: 'Which palette colour fills behind the points' },
  ],
  render({ params: p, width, height, background, rng, seed }) {
    const colors = palette(str(p, 'palette')).colors
    const m = Math.max(width, height)
    const base = colors[(num(p, 'base') - 1) % colors.length]
    const soft = num(p, 'softness')
    let defs = ''
    let blobs = el('rect', { width, height, fill: base })
    for (let i = 0; i < num(p, 'points'); i++) {
      const c = colors[(i + num(p, 'base')) % colors.length]
      const id = `mesh-${i}`
      // Each point is a radial gradient fading from its colour to clear.
      defs += el('radialGradient', { id }, el('stop', { offset: 0, 'stop-color': c }) + el('stop', { offset: f(0.15 + (1 - soft) * 0.5), 'stop-color': c, 'stop-opacity': 0.85 }) + el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': 0 }))
      const r = m * num(p, 'reach') * rng.range(0.6, 1)
      blobs += el('circle', { cx: rng.range(-0.1, 1.1) * width, cy: rng.range(-0.1, 1.1) * height, r, fill: `url(#${id})` })
    }
    const grain = num(p, 'grain')
    defs += el('filter', { id: 'mesh-grain', x: 0, y: 0, width: '100%', height: '100%' },
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: seed % 1000, stitchTiles: 'stitch' }) +
      el('feColorMatrix', { type: 'saturate', values: 0 }))
    const body = blobs + (grain > 0 ? el('rect', { width, height, filter: 'url(#mesh-grain)', opacity: grain, style: 'mix-blend-mode:overlay' }) : '')
    return { svg: svgDoc({ width, height, background, defs, body }) }
  },
}
