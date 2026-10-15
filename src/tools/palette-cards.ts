import type { Tool } from '../core/types'
import { el, esc, f, svgDoc } from '../core/svg'
import { contrast, palette } from '../core/palette'
import { innerBox, marginParam, num, paletteParam, str } from './common'
import { MONO, SANS } from './type-common'

export const paletteCards: Tool = {
  id: 'palette-cards',
  name: 'Palette cards',
  group: 'Colour',
  blurb: 'A palette laid out as swatches with names and hex values, ready for a deck or a brand page.',
  icon: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="16" rx="1.5"/><rect x="16" y="4" width="5" height="16" rx="1.5"/>',
  params: [
    {
      key: 'layout', label: 'Layout', section: 'Cards', type: 'segmented', default: 'columns',
      options: [{ value: 'columns', label: 'Columns' }, { value: 'rows', label: 'Rows' }, { value: 'grid', label: 'Grid' }],
    },
    { key: 'gap', label: 'Gap', section: 'Cards', type: 'number', default: 16, min: 0, max: 80, step: 1, unit: 'px' },
    { key: 'round', label: 'Corner radius', section: 'Cards', type: 'number', default: 16, min: 0, max: 80, step: 1, unit: 'px' },
    { key: 'labels', label: 'Hex values', section: 'Cards', type: 'toggle', default: true },
    { key: 'title', label: 'Show palette name', section: 'Cards', type: 'toggle', default: true },
    marginParam(0.08),
    paletteParam('emergency'),
  ],
  render({ params: p, width, height, background }) {
    const scale = Math.min(width, height) / 1080
    const box = innerBox(width, height, num(p, 'margin'))
    const pal = palette(str(p, 'palette'))
    const name = pal.name
    const colors = pal.colors
    const titleH = p.title === true ? 60 * scale : 0
    const area = { x: box.x, y: box.y + titleH, w: box.w, h: box.h - titleH }
    const gap = num(p, 'gap') * scale
    const n = colors.length
    const layout = str(p, 'layout')
    const cols = layout === 'columns' ? n : layout === 'rows' ? 1 : Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const cw = (area.w - gap * (cols - 1)) / cols
    const ch = (area.h - gap * (rows - 1)) / rows
    const label = 28 * scale
    const page = background === 'transparent' ? '#FFFFFF' : background
    const textOn = (c: string) => (contrast('#0A0A0A', c) >= contrast('#FFFFFF', c) ? '#0A0A0A' : '#FFFFFF')
    let body = ''
    if (p.title === true) body += `<text x="${f(box.x)}" y="${f(box.y + label * 1.4)}" fill="${textOn(page)}" style="font-family:${SANS};font-weight:700;font-size:${f(label * 1.4)}px">${esc(name)}</text>`
    colors.forEach((c, i) => {
      const x = area.x + (i % cols) * (cw + gap)
      const y = area.y + Math.floor(i / cols) * (ch + gap)
      body += el('rect', { x, y, width: Math.max(0, cw), height: Math.max(0, ch), rx: Math.min(num(p, 'round') * scale, cw / 2, ch / 2), fill: c })
      if (p.labels === true && cw > label * 3 && ch > label * 2) {
        body += `<text x="${f(x + label * 0.7)}" y="${f(y + ch - label * 0.8)}" fill="${textOn(c)}" style="font-family:${MONO};font-weight:500;font-size:${f(label * 0.8)}px">${esc(c.toUpperCase())}</text>`
      }
    })
    return { svg: svgDoc({ width, height, background, body }) }
  },
}
