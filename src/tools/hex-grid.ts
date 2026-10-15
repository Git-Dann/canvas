import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { createNoise2D, noiseTone } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { num, opacityParam, paletteParam, str } from './common'

export const hexGrid: Tool = {
  id: 'hex-grid',
  name: 'Hex grid',
  group: 'Pattern',
  blurb: 'Honeycomb tiles, filled by chance or noise, with gaps and a scatter of empty cells.',
  icon: '<path d="M7 3h5l2.5 4.3L12 11.6H7L4.5 7.3 7 3ZM14.5 7.3H19l2.5 4.3L19 16h-4.5L12 11.6M7 11.6h5l2.5 4.4L12 20.3H7L4.5 16 7 11.6Z"/>',
  params: [
    { key: 'size', label: 'Tile size', section: 'Tiles', type: 'number', default: 48, min: 8, max: 300, step: 1, unit: 'px' },
    { key: 'gap', label: 'Gap', section: 'Tiles', type: 'number', default: 4, min: 0, max: 40, step: 0.5, unit: 'px' },
    { key: 'empty', label: 'Empty tiles', section: 'Tiles', type: 'number', default: 0.15, min: 0, max: 0.95, step: 0.01 },
    { key: 'pointy', label: 'Pointy top', section: 'Tiles', type: 'toggle', default: false },
    {
      key: 'style', label: 'Draw', section: 'Tiles', type: 'segmented', default: 'fill',
      options: [{ value: 'fill', label: 'Filled' }, { value: 'outline', label: 'Outline' }],
    },
    opacityParam(1),
    paletteParam('signal'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'noise',
      options: [{ value: 'single', label: 'Lead' }, { value: 'random', label: 'Chance' }, { value: 'noise', label: 'Noise' }],
    },
  ],
  render({ params: p, width, height, background, rng, seed }) {
    const scale = Math.max(width, height) / 1080
    const R = num(p, 'size') * scale / 2
    const r = Math.max(0.5, R - (num(p, 'gap') * scale) / 2)
    const pointy = p.pointy === true
    const dx = pointy ? Math.sqrt(3) * R : 1.5 * R
    const dy = pointy ? 1.5 * R : Math.sqrt(3) * R
    const noise = createNoise2D(seed)
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const cols = Math.ceil(width / dx) + 2
    const rows = Math.ceil(height / dy) + 2
    const groups = new Map<string, string>()
    for (let j = -1; j < rows; j++) {
      for (let i = -1; i < cols; i++) {
        const x = i * dx + (pointy && j % 2 ? dx / 2 : 0)
        const y = j * dy + (!pointy && i % 2 ? dy / 2 : 0)
        if (rng() < num(p, 'empty')) continue
        const c = by === 'single' ? colors[0] : by === 'random' ? rng.pick(colors) : gradientAt(colors, noiseTone(noise, (x / width) * 2.5, (y / height) * 2.5))
        let d = ''
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + (pointy ? Math.PI / 6 : 0)
          d += `${k ? 'L' : 'M'}${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)}`
        }
        groups.set(c, (groups.get(c) ?? '') + d + 'Z')
      }
    }
    let body = ''
    for (const [c, d] of groups) {
      body += str(p, 'style') === 'outline'
        ? el('path', { d, fill: 'none', stroke: c, 'stroke-width': f(Math.max(1, 2 * scale)), 'stroke-linejoin': 'round' })
        : el('path', { d, fill: c })
    }
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
