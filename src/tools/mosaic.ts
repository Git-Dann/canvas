import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { imageRasters, imageSourceParams, num, paletteParam, str, toneSource } from './common'

export const mosaic: Tool = {
  id: 'mosaic',
  name: 'Mosaic',
  group: 'Image',
  blurb: 'A photo or noise field rebuilt from tiles, in its own colours or mapped to a palette.',
  icon: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  params: [
    ...imageSourceParams(),
    { key: 'tile', label: 'Tile size', section: 'Tiles', type: 'number', default: 24, min: 4, max: 160, step: 1, unit: 'px' },
    { key: 'gap', label: 'Grout', section: 'Tiles', type: 'number', default: 2, min: 0, max: 20, step: 0.5, unit: 'px' },
    { key: 'round', label: 'Round corners', section: 'Tiles', type: 'number', default: 0.2, min: 0, max: 0.5, step: 0.01 },
    { key: 'levels', label: 'Colour steps', section: 'Tiles', type: 'number', default: 6, min: 2, max: 16, step: 1, hint: 'Fewer steps give a bolder, poster-like result' },
    paletteParam('ember'),
    {
      key: 'colourFrom', label: 'Colour from', section: 'Colour', type: 'segmented', default: 'palette',
      options: [{ value: 'palette', label: 'Palette' }, { value: 'image', label: 'Image' }],
    },
  ],
  rasters: imageRasters,
  render({ params: p, width, height, background, seed, rasters }) {
    const src = toneSource(p, rasters, seed, width, height)
    const scale = Math.max(width, height) / 1080
    const t = num(p, 'tile') * scale
    const g = num(p, 'gap') * scale
    const s = Math.max(0.5, t - g)
    const rx = s * num(p, 'round')
    const colors = palette(str(p, 'palette')).colors
    const levels = num(p, 'levels')
    const cols = Math.ceil(width / t), rows = Math.ceil(height / t)
    const groups = new Map<string, string>()
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u0 = (i * t) / width, v0 = (j * t) / height, u1 = ((i + 1) * t) / width, v1 = ((j + 1) * t) / height
        const tone = Math.round(src.tone(u0, v0, u1, v1) * (levels - 1)) / (levels - 1)
        const fromImage = str(p, 'colourFrom') === 'image' ? src.colour((u0 + u1) / 2, (v0 + v1) / 2) : null
        const c = fromImage ?? gradientAt(colors, 1 - tone)
        const x = i * t + g / 2, y = j * t + g / 2
        const d = rx > 0
          ? `M${f(x + rx)} ${f(y)}h${f(s - 2 * rx)}a${f(rx)} ${f(rx)} 0 0 1 ${f(rx)} ${f(rx)}v${f(s - 2 * rx)}a${f(rx)} ${f(rx)} 0 0 1 ${f(-rx)} ${f(rx)}h${f(-(s - 2 * rx))}a${f(rx)} ${f(rx)} 0 0 1 ${f(-rx)} ${f(-rx)}v${f(-(s - 2 * rx))}a${f(rx)} ${f(rx)} 0 0 1 ${f(rx)} ${f(-rx)}Z`
          : `M${f(x)} ${f(y)}h${f(s)}v${f(s)}h${f(-s)}Z`
        groups.set(c, (groups.get(c) ?? '') + d)
      }
    }
    let body = ''
    for (const [c, d] of groups) body += el('path', { d, fill: c })
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
