import type { Pt } from '../core/svg'
import type { Tool } from '../core/types'
import { drawOnStyle, el, f, linePath, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { animateParams, bool, innerBox, marginParam, num, opacityParam, paletteParam, str, strokeWidthParam } from './common'

type Mode = 'harmonograph' | 'spirograph' | 'lissajous' | 'rose'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** One continuous curve in its own units. Fitted to the artboard afterwards. */
export function tracePoints(mode: Mode, o: { a: number; b: number; detune: number; phase: number; damping: number; turns: number; R: number; r: number; pen: number; resolution: number }, phases: number[]): Pt[] {
  const pts: Pt[] = []
  const N = Math.round(o.resolution)
  const ph = (o.phase * Math.PI) / 180
  switch (mode) {
    case 'harmonograph': {
      const T = o.turns * Math.PI * 2
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * T
        const e = Math.exp(-o.damping * t)
        pts.push([
          (Math.sin(o.a * t + phases[0] + ph) + Math.sin((o.a + o.detune) * t + phases[1])) * e,
          (Math.sin(o.b * t + phases[2]) + Math.sin((o.b - o.detune) * t + phases[3] + ph)) * e,
        ])
      }
      return pts
    }
    case 'spirograph': {
      const R = Math.round(o.R)
      const r = Math.min(R - 1, Math.round(o.r))
      const d = o.pen * r
      const T = Math.PI * 2 * (r / gcd(R, r))
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * T
        pts.push([(R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t + ph), (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t + ph)])
      }
      return pts
    }
    case 'lissajous': {
      const T = o.turns * Math.PI * 2
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * T
        const e = Math.exp(-o.damping * t)
        pts.push([Math.sin(o.a * t + ph) * e, Math.sin((o.b + o.detune) * t) * e])
      }
      return pts
    }
    case 'rose': {
      const k = o.a / o.b
      const T = o.turns * Math.PI * 2 * o.b
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * T
        const rr = Math.cos(k * t + ph) * Math.exp(-o.damping * t * 0.2)
        pts.push([rr * Math.cos(t), rr * Math.sin(t)])
      }
      return pts
    }
  }
}

/** Scale and centre points into a box, keeping aspect. */
export function fitPoints(pts: Pt[], box: { x: number; y: number; w: number; h: number }): Pt[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const s = Math.min(box.w / (maxX - minX || 1), box.h / (maxY - minY || 1))
  const ox = box.x + (box.w - (maxX - minX) * s) / 2
  const oy = box.y + (box.h - (maxY - minY) * s) / 2
  return pts.map(([x, y]) => [ox + (x - minX) * s, oy + (y - minY) * s] as Pt)
}

export const infiniteLine: Tool = {
  id: 'infinite-line',
  name: 'Infinite line',
  group: 'Line',
  blurb: 'One unbroken vector line: harmonographs, spirographs, Lissajous figures and roses, with a draw-on animation.',
  icon: '<path d="M4 12c0-4 3-7 6-4s4 8 8 8 4-6 0-8-8 4-10 6-4 2-4-2z"/>',
  params: [
    {
      key: 'mode', label: 'Curve', section: 'Curve', type: 'select', default: 'harmonograph',
      options: [{ value: 'harmonograph', label: 'Harmonograph' }, { value: 'spirograph', label: 'Spirograph' }, { value: 'lissajous', label: 'Lissajous' }, { value: 'rose', label: 'Rose' }],
    },
    { key: 'a', label: 'Frequency A', section: 'Curve', type: 'number', default: 3, min: 1, max: 12, step: 0.01, visibleIf: (p) => p.mode !== 'spirograph' },
    { key: 'b', label: 'Frequency B', section: 'Curve', type: 'number', default: 2, min: 1, max: 12, step: 0.01, visibleIf: (p) => p.mode !== 'spirograph' },
    { key: 'detune', label: 'Detune', section: 'Curve', type: 'number', default: 0.012, min: 0, max: 0.2, step: 0.001, visibleIf: (p) => p.mode === 'harmonograph' || p.mode === 'lissajous', hint: 'Small values make the line drift into moiré' },
    { key: 'R', label: 'Ring teeth', section: 'Curve', type: 'number', default: 96, min: 10, max: 240, step: 1, visibleIf: (p) => p.mode === 'spirograph' },
    { key: 'r', label: 'Wheel teeth', section: 'Curve', type: 'number', default: 35, min: 2, max: 239, step: 1, visibleIf: (p) => p.mode === 'spirograph' },
    { key: 'pen', label: 'Pen offset', section: 'Curve', type: 'number', default: 0.8, min: 0, max: 1.6, step: 0.01, visibleIf: (p) => p.mode === 'spirograph' },
    { key: 'phase', label: 'Phase', section: 'Curve', type: 'number', default: 0, min: 0, max: 360, step: 1, unit: '°' },
    { key: 'damping', label: 'Damping', section: 'Curve', type: 'number', default: 0.004, min: 0, max: 0.05, step: 0.0005, visibleIf: (p) => p.mode !== 'spirograph' },
    { key: 'turns', label: 'Length', section: 'Curve', type: 'number', default: 60, min: 1, max: 300, step: 1, unit: 'turns', visibleIf: (p) => p.mode !== 'spirograph' },
    { key: 'resolution', label: 'Smoothness', section: 'Curve', type: 'number', default: 8000, min: 500, max: 30000, step: 500, unit: 'pts' },

    marginParam(0.1),
    strokeWidthParam(1.5, 12),
    opacityParam(0.9),
    paletteParam(),
    { key: 'gradient', label: 'Gradient along palette', section: 'Colour', type: 'toggle', default: true },
    ...animateParams(),
  ],
  render({ params: p, width, height, background, rng }) {
    const phases = [rng.range(0, Math.PI * 2), rng.range(0, Math.PI * 2), rng.range(0, Math.PI * 2), rng.range(0, Math.PI * 2)]
    const o = {
      a: num(p, 'a'), b: num(p, 'b'), detune: num(p, 'detune'), phase: num(p, 'phase'), damping: num(p, 'damping'), turns: num(p, 'turns'),
      R: num(p, 'R'), r: num(p, 'r'), pen: num(p, 'pen'), resolution: num(p, 'resolution'),
    }
    const pts = fitPoints(tracePoints(str(p, 'mode') as Mode, o, phases), innerBox(width, height, num(p, 'margin')))
    const colors = palette(str(p, 'palette')).colors
    const grad = bool(p, 'gradient') && colors.length > 1
    const defs = grad
      ? `<linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">${colors.map((c, i) => el('stop', { offset: f(i / (colors.length - 1)), 'stop-color': c })).join('')}</linearGradient>`
      : undefined
    const anim = bool(p, 'animate')
    const path = el('path', {
      d: linePath(pts),
      fill: 'none',
      stroke: grad ? 'url(#ink)' : colors[0],
      'stroke-width': num(p, 'strokeWidth'),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: num(p, 'opacity'),
      pathLength: anim ? 1 : undefined,
      class: anim ? 'draw' : undefined,
    })
    return { svg: svgDoc({ width, height, background, defs, style: anim ? drawOnStyle(num(p, 'duration')) : undefined, body: path }) }
  },
}
