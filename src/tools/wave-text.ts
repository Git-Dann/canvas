import type { Tool } from '../core/types'
import { el, esc, f, svgDoc } from '../core/svg'
import { gradientAt, palette } from '../core/palette'
import { num, paletteParam, str } from './common'
import { family, fontParams } from './type-common'

export const waveText: Tool = {
  id: 'wave-text',
  name: 'Wave text',
  group: 'Type',
  blurb: 'Lines of type riding sine waves down the page, for posters and loud backgrounds.',
  icon: '<path d="M3 9c3-3 6 3 9 0s6-3 9 0M3 16c3-3 6 3 9 0s6-3 9 0"/>',
  params: [
    { key: 'text', label: 'Words', section: 'Type', type: 'text', default: 'MAKE SOMETHING GOOD ', maxLength: 80 },
    ...fontParams('Type', 900),
    { key: 'lines', label: 'Lines', section: 'Waves', type: 'number', default: 9, min: 1, max: 40, step: 1 },
    { key: 'amplitude', label: 'Height', section: 'Waves', type: 'number', default: 0.5, min: 0, max: 2, step: 0.01, hint: 'Relative to the line gap' },
    { key: 'frequency', label: 'Crests', section: 'Waves', type: 'number', default: 1.5, min: 0.25, max: 8, step: 0.25 },
    { key: 'phase', label: 'Drift', section: 'Waves', type: 'number', default: 0.6, min: 0, max: 3.14, step: 0.01 },
    { key: 'outline', label: 'Alternate outline', section: 'Waves', type: 'toggle', default: true },
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'line', label: 'Line' }, { value: 'gradient', label: 'Gradient' }],
    },
  ],
  render({ params: p, width, height, background }) {
    const n = num(p, 'lines')
    const gap = height / n
    const size = gap * 0.78
    const amp = gap * num(p, 'amplitude')
    const words = str(p, 'text') || ' '
    const colors = palette(str(p, 'palette')).colors
    const by = str(p, 'colorBy')
    const steps = 48
    let defs = ''
    let body = ''
    for (let k = 0; k < n; k++) {
      const y0 = gap * (k + 0.5) + size * 0.35
      let d = ''
      // Start and end past the edges, so the words run off rather than stopping short.
      for (let s = 0; s <= steps; s++) {
        const x = -width * 0.1 + (s / steps) * width * 1.2
        const y = y0 + amp * Math.sin((s / steps) * Math.PI * 2 * num(p, 'frequency') + k * num(p, 'phase'))
        d += `${s ? 'L' : 'M'}${f(x)} ${f(y)}`
      }
      defs += el('path', { id: `wave-${k}`, d })
      const reps = Math.max(1, Math.ceil((width * 1.4) / (words.length * size * 0.6)))
      const c = by === 'single' ? colors[0] : by === 'line' ? colors[k % colors.length] : gradientAt(colors, k / Math.max(1, n - 1))
      const hollow = p.outline === true && k % 2 === 1
      const paint = hollow ? `fill="none" stroke="${c}" stroke-width="${f(Math.max(1, size * 0.025))}"` : `fill="${c}"`
      body += `<text ${paint}><textPath href="#wave-${k}">${esc(words.repeat(reps))}</textPath></text>`
    }
    const style = `text{font-family:${family(p.font)};font-size:${f(size)}px;font-weight:${num(p, 'weight')};letter-spacing:${num(p, 'tracking')}em}`
    return { svg: svgDoc({ width, height, background, defs, style, body }) }
  },
}
