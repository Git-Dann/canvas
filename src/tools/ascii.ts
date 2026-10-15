import type { Raster, RasterRequest, Tool } from '../core/types'
import { esc, f, svgDoc } from '../core/svg'
import { createNoise2D, noiseTone } from '../core/rng'
import { gradientAt, hexToRgb, palette, rgbToHex } from '../core/palette'
import { colorAt, lumCell } from '../core/raster'
import { bool, num, paletteParam, str } from './common'

export const CHARSETS: Record<string, string> = {
  standard: ' .:-=+*#%@',
  dense: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: ' ░▒▓█',
  dots: ' ·∙•●',
  binary: ' 01',
  hatch: ' -/\\X#',
}

/** JetBrains Mono's advance width is 0.6em; line height is set to 1.2em. */
export const CHAR_W = 0.6
export const LINE_H = 1.2

export function asciiGrid(sample: (u0: number, v0: number, u1: number, v1: number) => number, cols: number, rows: number, chars: string, gamma: number, invert: boolean): string[] {
  const out: string[] = []
  const n = [...chars]
  for (let j = 0; j < rows; j++) {
    let line = ''
    for (let i = 0; i < cols; i++) {
      let l = sample(i / cols, j / rows, (i + 1) / cols, (j + 1) / rows)
      l = Math.max(0, Math.min(1, l)) ** gamma
      // Dark pixels get dense glyphs (ink on a light page). Invert flips that.
      const ink = invert ? l : 1 - l
      line += n[Math.min(n.length - 1, Math.floor(ink * n.length))]
    }
    out.push(line)
  }
  return out
}

export const ascii: Tool = {
  id: 'ascii',
  name: 'ASCII generator',
  group: 'Type',
  blurb: 'Turn words, photos or noise into ASCII art. Export as SVG, PNG or plain text.',
  icon: '<path d="M4 7h4M4 12h7M4 17h3M13 7h7M15 12h5M11 17h9"/>',
  params: [
    {
      key: 'source', label: 'Source', section: 'Source', type: 'segmented', default: 'text',
      options: [{ value: 'text', label: 'Words' }, { value: 'image', label: 'Image' }, { value: 'noise', label: 'Noise' }],
    },
    { key: 'text', label: 'Words', section: 'Source', type: 'text', default: 'GITWORK', maxLength: 60, multiline: true, visibleIf: (p) => p.source === 'text' },
    { key: 'image', label: 'Image', section: 'Source', type: 'image', default: '', visibleIf: (p) => p.source === 'image', hint: 'Stays inside the file. Large images are scaled down' },
    { key: 'noiseScale', label: 'Noise zoom', section: 'Source', type: 'number', default: 3, min: 0.5, max: 12, step: 0.1, visibleIf: (p) => p.source === 'noise' },

    { key: 'cols', label: 'Columns', section: 'Characters', type: 'number', default: 72, min: 16, max: 260, step: 1 },
    {
      key: 'charset', label: 'Character set', section: 'Characters', type: 'select', default: 'standard',
      options: [
        { value: 'standard', label: 'Standard' }, { value: 'dense', label: 'Dense (70 levels)' }, { value: 'blocks', label: 'Blocks' },
        { value: 'dots', label: 'Dots' }, { value: 'binary', label: 'Binary' }, { value: 'hatch', label: 'Hatching' }, { value: 'custom', label: 'Custom' },
      ],
    },
    { key: 'custom', label: 'Custom characters', section: 'Characters', type: 'text', default: ' .oO@', maxLength: 40, visibleIf: (p) => p.charset === 'custom', hint: 'Lightest first' },
    { key: 'gamma', label: 'Contrast curve', section: 'Characters', type: 'number', default: 1, min: 0.2, max: 3, step: 0.05 },
    { key: 'invert', label: 'Invert', section: 'Characters', type: 'toggle', default: false, hint: 'Off: dark areas get dense characters (words, line art). On: bright areas do (photos on a dark artboard)' },

    paletteParam('emergency'),
    {
      key: 'colorMode', label: 'Colour', section: 'Colour', type: 'segmented', default: 'single',
      options: [{ value: 'single', label: 'Lead' }, { value: 'ramp', label: 'By tone' }, { value: 'source', label: 'From image' }],
    },
  ],
  rasters(p, artboard): Record<string, RasterRequest> {
    if (p.source === 'image' && p.image) return { src: { kind: 'image', src: p.image as string } }
    if (p.source === 'text') {
      const w = 900
      return { src: { kind: 'text', text: (p.text as string) || ' ', weight: 800, family: 'sans', width: w, height: Math.round((w * artboard.height) / artboard.width) } }
    }
    return {}
  },
  render({ params: p, width, height, background, seed, rasters }) {
    const cols = num(p, 'cols')
    const fontSize = width / cols / CHAR_W
    const lineH = fontSize * LINE_H
    const rows = Math.max(1, Math.floor(height / lineH))
    const chars = str(p, 'charset') === 'custom' ? str(p, 'custom') || ' #' : CHARSETS[str(p, 'charset')]
    const src: Raster | null = rasters.src ?? null
    const noise = createNoise2D(seed)
    const ns = num(p, 'noiseScale')
    const sample = src && p.source !== 'noise'
      ? (u0: number, v0: number, u1: number, v1: number) => lumCell(src, u0, v0, u1, v1)
      : (u0: number, v0: number) => noiseTone(noise, u0 * ns * (width / height), v0 * ns)
    const lines = asciiGrid(sample, cols, rows, chars, num(p, 'gamma'), bool(p, 'invert'))

    const colors = palette(str(p, 'palette')).colors
    const mode = str(p, 'colorMode')
    const glyphs = [...chars]
    const colourFor = (ch: string, u: number, v: number): string => {
      if (mode === 'ramp') return gradientAt(colors, glyphs.indexOf(ch) / Math.max(1, glyphs.length - 1))
      if (mode === 'source' && src) {
        // Quantise to 4 bits per channel so neighbouring glyphs share a run.
        const [r, g, b] = hexToRgb(colorAt(src, u, v)).map((c) => Math.round(c / 17) * 17)
        return rgbToHex(r, g, b)
      }
      return colors[0]
    }
    const yOff = (height - rows * lineH) / 2 + fontSize * 0.95
    let body = ''
    lines.forEach((line, j) => {
      const y = yOff + j * lineH
      if (mode === 'single' || (mode === 'source' && !src)) {
        body += `<text x="0" y="${f(y)}">${esc(line)}</text>`
        return
      }
      // Runs of one colour become one <tspan>.
      const glyphRow = [...line]
      let spans = ''
      let run = ''
      let runColour = ''
      glyphRow.forEach((ch, i) => {
        const c = ch === ' ' ? runColour || colors[0] : colourFor(ch, (i + 0.5) / cols, (j + 0.5) / rows)
        if (c !== runColour && run) {
          spans += `<tspan fill="${runColour}">${esc(run)}</tspan>`
          run = ''
        }
        runColour = c
        run += ch
      })
      if (run) spans += `<tspan fill="${runColour}">${esc(run)}</tspan>`
      body += `<text x="0" y="${f(y)}">${spans}</text>`
    })
    const style = `text{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:${f(fontSize)}px;white-space:pre;fill:${colors[0]}}`
    return {
      svg: svgDoc({ width, height, background, style, body: `<g xml:space="preserve">${body}</g>` }),
      text: lines.join('\n'),
    }
  },
}
