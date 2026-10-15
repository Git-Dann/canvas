import type { Tool } from '../core/types'
import { el, f, svgDoc } from '../core/svg'
import { palette } from '../core/palette'
import { imageRasters, imageSourceParams, num, paletteParam, str, toneSource } from './common'

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** 1-bit dither of a tone grid (0 dark, 1 light). Returns true where ink goes. */
export function ditherGrid(tones: Float32Array, cols: number, rows: number, method: string): Uint8Array {
  const ink = new Uint8Array(cols * rows)
  if (method === 'bayer') {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      ink[k] = tones[k] < (BAYER4[(j % 4) * 4 + (i % 4)] + 0.5) / 16 ? 1 : 0
    }
    return ink
  }
  // Error diffusion: Floyd–Steinberg or Atkinson.
  const t = Float32Array.from(tones)
  const spread: [number, number, number][] = method === 'atkinson'
    ? [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
    : [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]]
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i
    const out = t[k] < 0.5 ? 0 : 1
    ink[k] = out ? 0 : 1
    const err = t[k] - out
    for (const [dx, dy, w] of spread) {
      const x = i + dx, y = j + dy
      if (x >= 0 && x < cols && y < rows) t[y * cols + x] += err * w
    }
  }
  return ink
}

export const dither: Tool = {
  id: 'dither',
  name: 'Dither',
  group: 'Image',
  blurb: 'One-bit dithering, from a crisp ordered pattern to the soft grain of early Mac screens.',
  icon: '<path d="M4 4h2v2H4zM8 4h2v2H8zM6 6h2v2H6zM12 4h2v2h-2zM4 8h2v2H4zM10 8h2v2h-2zM16 4h4v4h-4zM14 10h6v10h-6zM4 14h2v2H4zM8 12h2v2H8z"/>',
  params: [
    ...imageSourceParams(),
    { key: 'pixel', label: 'Pixel size', section: 'Dither', type: 'number', default: 6, min: 2, max: 40, step: 1, unit: 'px' },
    {
      key: 'method', label: 'Method', section: 'Dither', type: 'segmented', default: 'atkinson',
      options: [{ value: 'bayer', label: 'Ordered' }, { value: 'floyd', label: 'Floyd' }, { value: 'atkinson', label: 'Atkinson' }],
    },
    { key: 'gamma', label: 'Contrast curve', section: 'Dither', type: 'number', default: 1, min: 0.3, max: 3, step: 0.05 },
    { key: 'invert', label: 'Invert', section: 'Dither', type: 'toggle', default: false },
    paletteParam('emergency'),
  ],
  rasters: imageRasters,
  render({ params: p, width, height, background, seed, rasters }) {
    const src = toneSource(p, rasters, seed, width, height)
    const px = num(p, 'pixel') * (Math.max(width, height) / 1080)
    const cols = Math.ceil(width / px), rows = Math.ceil(height / px)
    const tones = new Float32Array(cols * rows)
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let t = src.tone(i / cols, j / rows, (i + 1) / cols, (j + 1) / rows) ** num(p, 'gamma')
      if (p.invert === true) t = 1 - t
      tones[j * cols + i] = t
    }
    const ink = ditherGrid(tones, cols, rows, str(p, 'method'))
    // One path; runs of ink in a row become one rectangle.
    let d = ''
    for (let j = 0; j < rows; j++) {
      let i = 0
      while (i < cols) {
        if (!ink[j * cols + i]) { i++; continue }
        const start = i
        while (i < cols && ink[j * cols + i]) i++
        d += `M${f(start * px)} ${f(j * px)}h${f((i - start) * px)}v${f(px)}h${f(-(i - start) * px)}Z`
      }
    }
    return { svg: svgDoc({ width, height, background, body: el('path', { d, fill: palette(str(p, 'palette')).colors[0], 'shape-rendering': 'crispEdges' }) }) }
  },
}
