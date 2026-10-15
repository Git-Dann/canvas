import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { createNoise2D, noiseTone } from '../core/rng'
import { mix, palette } from '../core/palette'
import { num, paletteParam, str } from './common'

export const isometric: Tool = {
  id: 'isometric',
  name: 'Isometric blocks',
  group: 'Shape',
  blurb: 'A city of isometric cubes, heights from noise or chance, shaded on three faces.',
  icon: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M12 12 20 7.5M12 12 4 7.5M12 12v9"/>',
  params: [
    { key: 'cols', label: 'Grid size', section: 'Blocks', type: 'number', default: 10, min: 2, max: 40, step: 1 },
    { key: 'maxHeight', label: 'Tallest', section: 'Blocks', type: 'number', default: 4, min: 0, max: 16, step: 1, unit: 'cubes' },
    {
      key: 'heights', label: 'Heights from', section: 'Blocks', type: 'segmented', default: 'noise',
      options: [{ value: 'noise', label: 'Noise' }, { value: 'random', label: 'Chance' }, { value: 'pyramid', label: 'Pyramid' }],
    },
    { key: 'fill', label: 'Filled', section: 'Blocks', type: 'number', default: 0.85, min: 0, max: 1, step: 0.01, hint: 'Share of the plot that gets a block' },
    { key: 'outline', label: 'Edge lines', section: 'Style', type: 'toggle', default: true },
    { key: 'strokeWidth', label: 'Line weight', section: 'Style', type: 'number', default: 1, min: 0.25, max: 6, step: 0.25, unit: 'px', visibleIf: (p) => p.outline === true },
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'height',
      options: [{ value: 'single', label: 'Lead' }, { value: 'height', label: 'Height' }, { value: 'random', label: 'Chance' }],
    },
  ],
  render({ params: p, width, height, background, rng, seed }) {
    const n = num(p, 'cols')
    const maxH = num(p, 'maxHeight')
    const colors = palette(str(p, 'palette')).colors
    const noise = createNoise2D(seed)
    // Tile half-width so the diamond plus the tallest stack fits the artboard.
    const tw = Math.min(width / (n * 2 + 2), height / (n + maxH * 2 + 3))
    const th = tw / 2
    const cube = tw
    const ox = width / 2
    const oy = (height - (n * th * 2 - maxH * cube)) / 2
    const stroke = p.outline === true ? (background === 'transparent' ? '#0A0A0A' : background) : 'none'
    const sw = num(p, 'strokeWidth')
    let body = ''
    for (let s = 0; s < n * 2 - 1; s++) {
      for (let i = 0; i < n; i++) {
        const j = s - i
        if (j < 0 || j >= n) continue
        const keep = rng() < num(p, 'fill')
        const kind = str(p, 'heights')
        const hRaw = kind === 'noise' ? noiseTone(noise, i * 0.25, j * 0.25) : kind === 'random' ? rng() : 1 - Math.max(Math.abs(i - (n - 1) / 2), Math.abs(j - (n - 1) / 2)) / (n / 2)
        const hgt = keep ? Math.max(0, Math.round(hRaw * maxH)) : -1
        if (hgt < 0) continue
        const by = str(p, 'colorBy')
        const base = by === 'single' ? colors[0] : by === 'height' ? colors[Math.min(colors.length - 1, Math.round((hgt / Math.max(1, maxH)) * (colors.length - 1)))] : rng.pick(colors)
        const x = ox + (i - j) * tw
        const y = oy + (i + j) * th
        const top = y - hgt * cube
        const pt = (a: number, b: number) => `${f(a)} ${f(b)}`
        const topFace = `M${pt(x, top)}L${pt(x + tw, top + th)}L${pt(x, top + th * 2)}L${pt(x - tw, top + th)}Z`
        const left = `M${pt(x - tw, top + th)}L${pt(x, top + th * 2)}L${pt(x, y + th * 2)}L${pt(x - tw, y + th)}Z`
        const right = `M${pt(x + tw, top + th)}L${pt(x, top + th * 2)}L${pt(x, y + th * 2)}L${pt(x + tw, y + th)}Z`
        const common = { stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }
        if (hgt > 0) {
          body += el('path', { d: left, fill: mix(base, '#000000', 0.25), ...common })
          body += el('path', { d: right, fill: mix(base, '#000000', 0.45), ...common })
        }
        body += el('path', { d: topFace, fill: base, ...common })
      }
    }
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
