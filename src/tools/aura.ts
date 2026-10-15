import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { num, paletteParam, str } from './common'

export const aura: Tool = {
  id: 'aura',
  name: 'Gradient aura',
  group: 'Colour',
  blurb: 'Soft blurred colour fields with film grain, for hero backgrounds and wallpapers.',
  icon: '<circle cx="9" cy="10" r="5"/><circle cx="15" cy="14" r="5"/>',
  params: [
    { key: 'blobs', label: 'Colour fields', section: 'Fields', type: 'number', default: 5, min: 1, max: 16, step: 1 },
    { key: 'minSize', label: 'Smallest', section: 'Fields', type: 'number', default: 0.25, min: 0.05, max: 1, step: 0.01 },
    { key: 'maxSize', label: 'Largest', section: 'Fields', type: 'number', default: 0.6, min: 0.05, max: 1.5, step: 0.01 },
    { key: 'spread', label: 'Spread', section: 'Fields', type: 'number', default: 0.7, min: 0, max: 1.2, step: 0.01, hint: '0 piles everything in the middle' },
    { key: 'blur', label: 'Softness', section: 'Fields', type: 'number', default: 0.12, min: 0, max: 0.4, step: 0.005 },
    {
      key: 'blend', label: 'Blend', section: 'Fields', type: 'segmented', default: 'normal',
      options: [{ value: 'normal', label: 'Normal' }, { value: 'screen', label: 'Screen' }, { value: 'multiply', label: 'Multiply' }],
    },
    { key: 'grain', label: 'Grain', section: 'Texture', type: 'number', default: 0.18, min: 0, max: 0.6, step: 0.01 },
    { key: 'grainSize', label: 'Grain size', section: 'Texture', type: 'number', default: 0.8, min: 0.2, max: 3, step: 0.05 },
    paletteParam('dusk'),
  ],
  render({ params: p, width, height, background, rng, seed }) {
    const colors = palette(str(p, 'palette')).colors
    const m = Math.max(width, height)
    const blur = num(p, 'blur') * m
    const spread = num(p, 'spread')
    const minS = Math.min(num(p, 'minSize'), num(p, 'maxSize'))
    const maxS = Math.max(num(p, 'minSize'), num(p, 'maxSize'))
    let blobs = ''
    for (let i = 0; i < num(p, 'blobs'); i++) {
      const cx = width / 2 + rng.range(-0.5, 0.5) * width * spread
      const cy = height / 2 + rng.range(-0.5, 0.5) * height * spread
      const rx = rng.range(minS, maxS) * m * 0.5
      const ry = rx * rng.range(0.6, 1.4)
      blobs += el('ellipse', { cx, cy, rx, ry, fill: colors[i % colors.length], transform: `rotate(${f(rng.range(0, 180))} ${f(cx)} ${f(cy)})`, style: `mix-blend-mode:${str(p, 'blend')}` })
    }
    const grain = num(p, 'grain')
    const freq = 1 / num(p, 'grainSize')
    const defs =
      el('filter', { id: 'soft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, el('feGaussianBlur', { stdDeviation: f(blur) })) +
      el('filter', { id: 'grain', x: 0, y: 0, width: '100%', height: '100%' },
        el('feTurbulence', { type: 'fractalNoise', baseFrequency: f(freq), numOctaves: 2, seed: seed % 1000, stitchTiles: 'stitch' }) +
        el('feColorMatrix', { type: 'saturate', values: 0 }))
    const body =
      `<g filter="url(#soft)" style="isolation:isolate">${blobs}</g>` +
      (grain > 0 ? el('rect', { width, height, filter: 'url(#grain)', opacity: grain, style: 'mix-blend-mode:overlay' }) : '')
    return { svg: svgDoc({ width, height, background, defs, body }) }
  },
}
