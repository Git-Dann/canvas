import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { createNoise2D, noiseTone } from '../core/rng'
import { gradientAt, palette } from '../core/palette'
import { num, opacityParam, paletteParam, str } from './common'

export const dotGrid: Tool = {
  id: 'dot-grid',
  name: 'Dot grid',
  group: 'Pattern',
  blurb: 'A grid of dots whose size swells with noise, a radial fade or a wave.',
  icon: '<circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="2.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1"/>',
  params: [
    { key: 'spacing', label: 'Spacing', section: 'Grid', type: 'number', default: 36, min: 6, max: 200, step: 1, unit: 'px' },
    { key: 'offset', label: 'Offset rows', section: 'Grid', type: 'toggle', default: true, hint: 'Staggers every other row, like a honeycomb' },
    {
      key: 'field', label: 'Size from', section: 'Grid', type: 'segmented', default: 'radial',
      options: [{ value: 'noise', label: 'Noise' }, { value: 'radial', label: 'Radial' }, { value: 'wave', label: 'Wave' }, { value: 'even', label: 'Even' }],
    },
    { key: 'noiseScale', label: 'Noise zoom', section: 'Grid', type: 'number', default: 2.5, min: 0.3, max: 10, step: 0.1, visibleIf: (p) => p.field === 'noise' || p.field === 'wave' },
    { key: 'minSize', label: 'Smallest dot', section: 'Grid', type: 'number', default: 0.05, min: 0, max: 1, step: 0.01, hint: 'Share of the spacing' },
    { key: 'maxSize', label: 'Largest dot', section: 'Grid', type: 'number', default: 0.85, min: 0.05, max: 1.4, step: 0.01 },
    opacityParam(1),
    paletteParam('emergency'),
    {
      key: 'colorBy', label: 'Colour by', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'size', label: 'Size' }],
    },
  ],
  render({ params: p, width, height, background, seed }) {
    const sp = num(p, 'spacing') * (Math.max(width, height) / 1080)
    const noise = createNoise2D(seed)
    const ns = num(p, 'noiseScale')
    const colors = palette(str(p, 'palette')).colors
    const field = str(p, 'field')
    const rowH = p.offset === true ? sp * 0.866 : sp
    const cols = Math.ceil(width / sp) + 1
    const rows = Math.ceil(height / rowH) + 1
    const ox = (width - (cols - 1) * sp) / 2
    const oy = (height - (rows - 1) * rowH) / 2
    const groups = new Map<string, string>()
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = ox + i * sp + (p.offset === true && j % 2 ? sp / 2 : 0)
        const y = oy + j * rowH
        const u = x / width, v = y / height
        const t = field === 'noise' ? noiseTone(noise, u * ns * (width / height), v * ns)
          : field === 'radial' ? 1 - Math.min(1, Math.hypot(u - 0.5, (v - 0.5) * (height / width)) * 1.6)
          : field === 'wave' ? 0.5 + 0.5 * Math.sin(u * ns * Math.PI * 2 + Math.sin(v * ns * 3) * 1.5)
          : 1
        const r = (sp / 2) * (num(p, 'minSize') + (num(p, 'maxSize') - num(p, 'minSize')) * t)
        if (r < 0.15) continue
        const c = str(p, 'colorBy') === 'size' ? gradientAt(colors, t) : colors[0]
        groups.set(c, (groups.get(c) ?? '') + `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`)
      }
    }
    let body = ''
    for (const [c, d] of groups) body += el('path', { d, fill: c })
    return { svg: svgDoc({ width, height, background, body: `<g opacity="${num(p, 'opacity')}">${body}</g>` }) }
  },
}
