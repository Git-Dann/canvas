import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { el, linePath, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { imageRasters, imageSourceParams, num, paletteParam, str, toneSource } from './common'

export const scanlines: Tool = {
  id: 'scanlines',
  name: 'Scanlines',
  group: 'Image',
  blurb: 'An image drawn as horizontal lines that thicken in the dark or wobble with tone, like an engraving or a CRT.',
  icon: '<path d="M3 5h18M3 9h7c2 0 2 2 4 2h7M3 14h5c3 0 3 3 6 3h7M3 19h18"/>',
  params: [
    ...imageSourceParams(),
    { key: 'lines', label: 'Lines', section: 'Lines', type: 'number', default: 80, min: 10, max: 400, step: 1 },
    {
      key: 'mode', label: 'Tone shown as', section: 'Lines', type: 'segmented', default: 'weight',
      options: [{ value: 'weight', label: 'Weight' }, { value: 'wave', label: 'Wave' }, { value: 'both', label: 'Both' }],
    },
    { key: 'maxWeight', label: 'Heaviest', section: 'Lines', type: 'number', default: 0.85, min: 0.05, max: 1, step: 0.01, hint: 'Share of the line gap' },
    { key: 'waviness', label: 'Wave height', section: 'Lines', type: 'number', default: 0.6, min: 0, max: 2, step: 0.01, visibleIf: (p) => p.mode !== 'weight' },
    { key: 'invert', label: 'Invert', section: 'Lines', type: 'toggle', default: true, hint: 'On suits light lines on a dark artboard' },
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'gradient', label: 'Gradient' }],
    },
  ],
  rasters: imageRasters,
  render({ params: p, width, height, background, seed, rasters }) {
    const src = toneSource(p, rasters, seed, width, height)
    const n = num(p, 'lines')
    const gap = height / n
    const steps = Math.min(600, Math.max(60, Math.round(width / 4)))
    const mode = str(p, 'mode')
    const colors = palette(str(p, 'palette')).colors
    const groups = new Map<string, string>()
    for (let k = 0; k < n; k++) {
      const y0 = gap * (k + 0.5)
      const top: Pt[] = [], bottom: Pt[] = []
      for (let s = 0; s <= steps; s++) {
        const x = (s / steps) * width
        const u = s / steps, v = y0 / height
        let t = src.tone(u, v, Math.min(1, u + 1 / steps), Math.min(1, v + 1 / n))
        if (p.invert === true) t = 1 - t
        const amount = 1 - t
        const w = mode === 'wave' ? Math.max(0.6, gap * 0.12) : gap * num(p, 'maxWeight') * Math.max(0.04, amount)
        const y = y0 + (mode === 'weight' ? 0 : Math.sin(s * 0.9) * gap * num(p, 'waviness') * amount * 0.5)
        top.push([x, y - w / 2])
        bottom.push([x, y + w / 2])
      }
      const c = str(p, 'colorBy') === 'gradient' ? gradientAt(colors, k / Math.max(1, n - 1)) : colors[0]
      groups.set(c, (groups.get(c) ?? '') + linePath([...top, ...bottom.reverse()], true))
    }
    let body = ''
    for (const [c, d] of groups) body += el('path', { d, fill: c })
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
