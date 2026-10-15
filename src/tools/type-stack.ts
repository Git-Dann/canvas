import type { Tool } from '../core/types'
import { esc, f, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { inkFor, innerBox, marginParam, num, paletteParam, str } from './common'
import { family } from './type-common'

export const typeStack: Tool = {
  id: 'type-stack',
  name: 'Type stack',
  group: 'Type',
  blurb: 'One word repeated in rows that run edge to edge, stepping through weights and outlines.',
  icon: '<path d="M4 5h16M4 9.5h16M4 14h16M4 18.5h16"/>',
  params: [
    { key: 'text', label: 'Word', section: 'Type', type: 'text', default: 'GITWORK', maxLength: 30 },
    {
      key: 'font', label: 'Typeface', section: 'Type', type: 'segmented', default: 'sans',
      options: [{ value: 'sans', label: 'Inter' }, { value: 'mono', label: 'Mono' }],
    },
    { key: 'rows', label: 'Rows', section: 'Stack', type: 'number', default: 8, min: 1, max: 40, step: 1 },
    { key: 'weightFrom', label: 'Top weight', section: 'Stack', type: 'number', default: 100, min: 100, max: 900, step: 100 },
    { key: 'weightTo', label: 'Bottom weight', section: 'Stack', type: 'number', default: 900, min: 100, max: 900, step: 100 },
    {
      key: 'pattern', label: 'Rows are', section: 'Stack', type: 'segmented', default: 'alternate',
      options: [{ value: 'solid', label: 'Solid' }, { value: 'alternate', label: 'Alternate' }, { value: 'outline', label: 'Outline' }],
    },
    { key: 'highlight', label: 'Highlight a row', section: 'Stack', type: 'number', default: 0, min: 0, max: 40, step: 1, hint: '0 for none. That row takes the lead colour' },
    marginParam(0.05),
    paletteParam('mono-light'),
  ],
  render({ params: p, width, height, background }) {
    const box = innerBox(width, height, num(p, 'margin'))
    const n = num(p, 'rows')
    const rowH = box.h / n
    const size = rowH * 0.9
    const word = str(p, 'text') || ' '
    const colors = palette(str(p, 'palette')).colors
    const ink = inkFor(colors, background)
    const lead = palette('emergency').colors[0]
    const pattern = str(p, 'pattern')
    let body = ''
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k / (n - 1)
      const w = Math.round((num(p, 'weightFrom') + (num(p, 'weightTo') - num(p, 'weightFrom')) * t) / 100) * 100
      const c = k + 1 === num(p, 'highlight') ? lead : ink
      const hollow = pattern === 'outline' || (pattern === 'alternate' && k % 2 === 1)
      const paint = hollow ? `fill="none" stroke="${c}" stroke-width="${f(Math.max(1, size * 0.02))}"` : `fill="${c}"`
      const y = box.y + rowH * (k + 1) - rowH * 0.14
      // textLength stretches each row to the full measure, whatever the weight.
      body += `<text x="${f(box.x)}" y="${f(y)}" font-weight="${w}" textLength="${f(box.w)}" lengthAdjust="spacingAndGlyphs" ${paint}>${esc(word)}</text>`
    }
    const style = `text{font-family:${family(p.font)};font-size:${f(size)}px}`
    return { svg: svgDoc({ width, height, background, style, body }) }
  },
}
