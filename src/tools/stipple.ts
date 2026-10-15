import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { gradientAt, hexToRgb, palette, rgbToHex } from '../core/palette'
import { imageRasters, imageSourceParams, num, paletteParam, str, toneSource } from './common'

/** 4 bits a channel, so dots share colours and the file stays small. */
const quantise = (hex: string) => rgbToHex(...(hexToRgb(hex).map((c) => Math.round(c / 17) * 17) as [number, number, number]))

export const stipple: Tool = {
  id: 'stipple',
  name: 'Stipple',
  group: 'Image',
  blurb: 'Thousands of dots placed more densely where the image is dark, like a pen-and-ink stipple drawing.',
  icon: '<circle cx="6" cy="7" r=".9"/><circle cx="10" cy="5" r=".9"/><circle cx="9" cy="10" r=".9"/><circle cx="13" cy="9" r=".9"/><circle cx="12" cy="13" r=".9"/><circle cx="15" cy="12" r=".9"/><circle cx="14" cy="16" r=".9"/><circle cx="17" cy="15" r=".9"/><circle cx="18" cy="19" r=".9"/><circle cx="7" cy="17" r=".9"/>',
  params: [
    ...imageSourceParams(),
    { key: 'dots', label: 'Dots', section: 'Dots', type: 'number', default: 24000, min: 500, max: 60000, step: 500 },
    { key: 'size', label: 'Dot size', section: 'Dots', type: 'number', default: 3.4, min: 0.5, max: 12, step: 0.1, unit: 'px' },
    { key: 'vary', label: 'Size follows tone', section: 'Dots', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'gamma', label: 'Contrast curve', section: 'Dots', type: 'number', default: 1, min: 0.3, max: 4, step: 0.05 },
    { key: 'invert', label: 'Invert', section: 'Dots', type: 'toggle', default: true, hint: 'On puts dots in the light areas, for a dark artboard' },
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'tone', label: 'Tone' }, { value: 'image', label: 'Image' }],
    },
  ],
  rasters: imageRasters,
  render({ params: p, width, height, background, seed, rng, rasters }) {
    const src = toneSource(p, rasters, seed, width, height)
    const target = num(p, 'dots')
    const r0 = (num(p, 'size') * (Math.max(width, height) / 1080)) / 2
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const groups = new Map<string, string>()
    // Rejection sampling with a bounded number of tries, so a near-empty image
    // can't spin forever.
    let placed = 0
    for (let tries = 0; placed < target && tries < target * 8; tries++) {
      const u = rng(), v = rng()
      let t = src.tone(u, v, u, v)
      if (p.invert === true) t = 1 - t
      const darkness = (1 - t) ** num(p, 'gamma')
      if (rng() > darkness) continue
      placed++
      const r = r0 * (1 - num(p, 'vary') + num(p, 'vary') * (0.4 + darkness))
      const x = u * width, y = v * height
      const c = by === 'tone' ? gradientAt(colors, 1 - darkness) : by === 'image' ? quantise(src.colour(u, v) ?? colors[0]) : colors[0]
      groups.set(c, (groups.get(c) ?? '') + `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`)
    }
    let body = ''
    for (const [c, d] of groups) body += el('path', { d, fill: c })
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
