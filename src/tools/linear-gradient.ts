import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { num, paletteParam, str } from './common'

export const linearGradient: Tool = {
  id: 'linear-gradient',
  name: 'Linear gradient',
  group: 'Colour',
  blurb: 'A palette as a clean gradient at any angle, smooth or stepped into bands, with optional grain.',
  icon: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 15 15 3M9 21 21 9"/>',
  params: [
    { key: 'angle', label: 'Angle', section: 'Gradient', type: 'number', default: 135, min: 0, max: 360, step: 1, unit: '°' },
    {
      key: 'kind', label: 'Kind', section: 'Gradient', type: 'segmented', default: 'linear',
      options: [{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }],
    },
    { key: 'steps', label: 'Bands', section: 'Gradient', type: 'number', default: 0, min: 0, max: 24, step: 1, hint: '0 for a smooth blend' },
    { key: 'reverse', label: 'Reverse', section: 'Gradient', type: 'toggle', default: false },
    { key: 'grain', label: 'Grain', section: 'Texture', type: 'number', default: 0, min: 0, max: 0.5, step: 0.01 },
    paletteParam('emergency'),
  ],
  render({ params: p, width, height, background, seed }) {
    let colors = [...palette(str(p, 'palette')).colors]
    if (p.reverse === true) colors = colors.reverse()
    const steps = num(p, 'steps')
    let stops = ''
    if (steps > 1) {
      for (let i = 0; i < steps; i++) {
        const c = gradientAt(colors, i / (steps - 1))
        stops += el('stop', { offset: f(i / steps), 'stop-color': c }) + el('stop', { offset: f((i + 1) / steps), 'stop-color': c })
      }
    } else {
      colors.forEach((c, i) => (stops += el('stop', { offset: f(i / Math.max(1, colors.length - 1)), 'stop-color': c })))
    }
    const a = (num(p, 'angle') * Math.PI) / 180
    const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2
    let defs = str(p, 'kind') === 'radial'
      ? el('radialGradient', { id: 'lg', cx: f(0.5 + dx * 0.4), cy: f(0.5 + dy * 0.4), r: 0.75 }, stops)
      : el('linearGradient', { id: 'lg', x1: f(0.5 - dx), y1: f(0.5 - dy), x2: f(0.5 + dx), y2: f(0.5 + dy) }, stops)
    const grain = num(p, 'grain')
    defs += el('filter', { id: 'lg-grain', x: 0, y: 0, width: '100%', height: '100%' },
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: seed % 1000, stitchTiles: 'stitch' }) +
      el('feColorMatrix', { type: 'saturate', values: 0 }))
    const body = el('rect', { width, height, fill: 'url(#lg)' }) +
      (grain > 0 ? el('rect', { width, height, filter: 'url(#lg-grain)', opacity: grain, style: 'mix-blend-mode:overlay' }) : '')
    return { svg: svgDoc({ width, height, background, defs, body }) }
  },
}
