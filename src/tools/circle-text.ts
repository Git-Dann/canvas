import type { Tool } from '../core/types'
import { el, esc, f, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { innerBox, marginParam, num, paletteParam, str } from './common'
import { family, fontParams } from './type-common'

export const circleText: Tool = {
  id: 'circle-text',
  name: 'Circle text',
  group: 'Type',
  blurb: 'Words set around rings, like a badge, a stamp or a spinning sticker.',
  icon: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M8 5.5 9 4M15 4l1 1.5"/>',
  params: [
    { key: 'text', label: 'Words', section: 'Type', type: 'text', default: 'GITWORK · CANVAS · MADE IN MANCHESTER · ', maxLength: 120 },
    ...fontParams('Type', 700),
    { key: 'rings', label: 'Rings', section: 'Rings', type: 'number', default: 3, min: 1, max: 12, step: 1 },
    { key: 'size', label: 'Text size', section: 'Rings', type: 'number', default: 0.06, min: 0.015, max: 0.2, step: 0.005, hint: 'Share of the shorter side' },
    { key: 'fit', label: 'Fill each ring', section: 'Rings', type: 'toggle', default: true, hint: 'Repeats the words until the ring is full' },
    { key: 'twist', label: 'Twist', section: 'Rings', type: 'number', default: 20, min: 0, max: 180, step: 1, unit: '°' },
    { key: 'centre', label: 'Centre dot', section: 'Rings', type: 'toggle', default: true },
    marginParam(0.06),
    paletteParam('emergency'),
  ],
  render({ params: p, width, height, background }) {
    const box = innerBox(width, height, num(p, 'margin'))
    const R = Math.min(box.w, box.h) / 2
    const size = num(p, 'size') * Math.min(width, height)
    const rings = num(p, 'rings')
    const colors = palette(str(p, 'palette')).colors
    const words = str(p, 'text') || ' '
    const cx = width / 2, cy = height / 2
    let defs = ''
    let body = ''
    for (let k = 0; k < rings; k++) {
      const r = R - size * 0.75 - k * size * 1.6
      if (r < size) break
      const a0 = ((k * num(p, 'twist') - 90) * Math.PI) / 180
      const sx = cx + Math.cos(a0) * r, sy = cy + Math.sin(a0) * r
      const ex = cx + Math.cos(a0 + Math.PI) * r, ey = cy + Math.sin(a0 + Math.PI) * r
      defs += el('path', { id: `ring-${k}`, d: `M${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 1 1 ${f(ex)} ${f(ey)}A${f(r)} ${f(r)} 0 1 1 ${f(sx)} ${f(sy)}` })
      const circ = 2 * Math.PI * r
      // Roughly 0.6em per glyph; repeat until the ring is full, then let
      // textLength settle the exact fit so it closes neatly.
      const reps = p.fit === true ? Math.max(1, Math.round(circ / (words.length * size * 0.62))) : 1
      const line = words.repeat(reps)
      body += `<text fill="${colors[k % colors.length]}"><textPath href="#ring-${k}"${p.fit === true ? ` textLength="${f(circ - 1)}" lengthAdjust="spacing"` : ''}>${esc(line)}</textPath></text>`
    }
    if (p.centre === true) body += el('circle', { cx, cy, r: f(size * 0.6), fill: colors[0] })
    const style = `text{font-family:${family(p.font)};font-size:${f(size)}px;font-weight:${num(p, 'weight')};letter-spacing:${num(p, 'tracking')}em}`
    return { svg: svgDoc({ width, height, background, defs, style, body }) }
  },
}
