import type { Tool } from '../core/types'
import { el, esc, f, svgDoc } from '../core/svg'
import { contrast, palette } from '../core/palette'
import { num, paletteParam, str } from './common'
import { family, fontParams } from './type-common'

/** Up to `max` initials from a name: "Dan Lindsay" -> "DL". */
export function initials(name: string, max: number): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return [...words[0]].slice(0, max).join('').toUpperCase()
  return words.slice(0, max).map((w) => [...w][0]).join('').toUpperCase()
}

const INK_DARK = '#0A0A0A'
const INK_LIGHT = '#FFFFFF'

export const monogram: Tool = {
  id: 'monogram',
  name: 'Monogram',
  group: 'Type',
  blurb: 'Initials in a badge, for avatars, app icons and placeholders. Text colour picks itself for contrast.',
  icon: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 16V8l4 5 4-5v8"/>',
  params: [
    { key: 'text', label: 'Name', section: 'Type', type: 'text', default: 'Gitwork', maxLength: 60 },
    { key: 'letters', label: 'Letters', section: 'Type', type: 'number', default: 1, min: 1, max: 3, step: 1 },
    ...fontParams('Type', 700),
    {
      key: 'shape', label: 'Badge', section: 'Badge', type: 'segmented', default: 'squircle',
      options: [{ value: 'circle', label: 'Circle' }, { value: 'squircle', label: 'Rounded' }, { value: 'square', label: 'Square' }, { value: 'none', label: 'None' }],
    },
    { key: 'scale', label: 'Badge size', section: 'Badge', type: 'number', default: 0.8, min: 0.2, max: 1, step: 0.01 },
    { key: 'textScale', label: 'Letter size', section: 'Badge', type: 'number', default: 0.42, min: 0.1, max: 0.9, step: 0.01 },
    { key: 'ring', label: 'Ring', section: 'Badge', type: 'toggle', default: false },
    paletteParam('emergency'),
    { key: 'swatch', label: 'Badge colour', section: 'Colour', type: 'number', default: 1, min: 1, max: 6, step: 1, hint: 'Which colour of the palette' },
  ],
  render({ params: p, width, height, background }) {
    const colors = palette(str(p, 'palette')).colors
    const fill = colors[(num(p, 'swatch') - 1) % colors.length]
    const shape = str(p, 'shape')
    const S = Math.min(width, height) * num(p, 'scale')
    const cx = width / 2, cy = height / 2
    const behind = shape === 'none' ? (background === 'transparent' ? '#FFFFFF' : background) : fill
    // Near-black on Emergency Orange (6.0:1); white would fail AA there.
    const ink = contrast(INK_DARK, behind) >= contrast(INK_LIGHT, behind) ? INK_DARK : INK_LIGHT
    let body = ''
    if (shape === 'circle') body += el('circle', { cx, cy, r: S / 2, fill })
    else if (shape === 'squircle') body += el('rect', { x: cx - S / 2, y: cy - S / 2, width: S, height: S, rx: S * 0.22, fill })
    else if (shape === 'square') body += el('rect', { x: cx - S / 2, y: cy - S / 2, width: S, height: S, fill })
    if (p.ring === true && shape !== 'none') {
      const inset = S * 0.06
      const attrs = { fill: 'none', stroke: ink, 'stroke-width': f(S * 0.012), opacity: 0.6 }
      body += shape === 'circle'
        ? el('circle', { cx, cy, r: S / 2 - inset, ...attrs })
        : el('rect', { x: cx - S / 2 + inset, y: cy - S / 2 + inset, width: S - inset * 2, height: S - inset * 2, rx: shape === 'squircle' ? S * 0.17 : 0, ...attrs })
    }
    const size = S * num(p, 'textScale')
    body += `<text x="${f(cx)}" y="${f(cy)}" text-anchor="middle" dominant-baseline="central" fill="${ink}">${esc(initials(str(p, 'text'), num(p, 'letters')))}</text>`
    const style = `text{font-family:${family(p.font)};font-size:${f(size)}px;font-weight:${num(p, 'weight')};letter-spacing:${num(p, 'tracking')}em}`
    return { svg: svgDoc({ width, height, background, style, body }) }
  },
}
