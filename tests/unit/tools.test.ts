import { describe, expect, it } from 'vitest'
import { TOOLS } from '../../src/tools'
import { defaultParams, newDoc, paramsFor, parseDoc } from '../../src/core/doc'
import { createRng } from '../../src/core/rng'
import { demoRaster } from '../../src/core/raster'
import type { Raster, Tool } from '../../src/core/types'

const SIZES = [
  [1080, 1080],
  [1920, 1080],
  [1080, 1920],
] as const

function render(tool: Tool, w: number, h: number, seed = 42, overrides = {}) {
  const params = { ...defaultParams(tool), ...overrides }
  const rasters: Record<string, Raster | null> = {}
  for (const k of Object.keys(tool.rasters?.(params, { width: w, height: h }) ?? {})) rasters[k] = demoRaster()
  return tool.render({ params, width: w, height: h, background: '#0A0A0A', seed, rng: createRng(seed), rasters })
}

describe('every tool', () => {
  it('has unique, kebab-case ids and unique param keys', () => {
    const ids = TOOLS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TOOLS) {
      expect(t.id).toMatch(/^[a-z][a-z0-9-]*$/)
      const keys = t.params.map((p) => p.key)
      expect(new Set(keys).size, t.id).toBe(keys.length)
    }
  })

  for (const tool of TOOLS) {
    describe(tool.id, () => {
      for (const [w, h] of SIZES) {
        it(`renders a valid, bounded SVG at ${w}x${h}`, () => {
          const { svg } = render(tool, w, h)
          expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
          expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`)
          expect(svg.endsWith('</svg>')).toBe(true)
          expect(svg).not.toMatch(/NaN|Infinity|undefined/)
          expect(svg.length).toBeLessThan(8_000_000)
        })
      }

      it('is deterministic for a seed', () => {
        expect(render(tool, 800, 600, 7).svg).toBe(render(tool, 800, 600, 7).svg)
      })

      it('renders at every select / segmented option', () => {
        for (const spec of tool.params) {
          if (spec.type !== 'select' && spec.type !== 'segmented') continue
          for (const o of spec.options) {
            const { svg } = render(tool, 600, 600, 3, { [spec.key]: o.value })
            expect(svg, `${spec.key}=${o.value}`).not.toMatch(/NaN|Infinity|undefined/)
          }
        }
      })

      it('renders at param extremes', () => {
        for (const bound of ['min', 'max'] as const) {
          const over: Record<string, number> = {}
          for (const spec of tool.params) if (spec.type === 'number') over[spec.key] = spec[bound]
          const { svg } = render(tool, 500, 500, 5, over)
          expect(svg, bound).not.toMatch(/NaN|Infinity|undefined/)
          expect(svg.length, bound).toBeLessThan(16_000_000)
        }
      })
    })
  }
})

describe('document', () => {
  it('round-trips and sanitises params', () => {
    const doc = newDoc('shapes', 9)
    doc.params.shapes = { sides: 999, kind: 'nope', fill: 'stroke' }
    const back = parseDoc(JSON.stringify(doc), 'shapes')!
    const p = paramsFor(back, TOOLS[0])
    expect(p.sides).toBe(32)
    expect(p.kind).toBe('star')
    expect(back.artboard.seed).toBe(9)
  })

  it('rejects foreign JSON', () => {
    expect(parseDoc('{"format":"bento"}', 'shapes')).toBeNull()
    expect(parseDoc('not json', 'shapes')).toBeNull()
  })
})

describe('contourLines', () => {
  it('joins a single peak into one closed ring', async () => {
    const { contourLines } = await import('../../src/tools/contours')
    const n = 10
    const values = new Float32Array((n + 1) * (n + 1))
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) values[j * (n + 1) + i] = -Math.hypot(i - 5, j - 5)
    const lines = contourLines(values, n, n, -3)
    expect(lines).toHaveLength(1)
    expect(lines[0].closed).toBe(true)
  })
})

describe('brand', () => {
  it('keeps text on Emergency Orange readable', async () => {
    const { contrast, EMERGENCY, NEUTRAL } = await import('../../src/core/palette')
    expect(contrast(EMERGENCY[500], NEUTRAL[950])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(EMERGENCY[700], NEUTRAL[0])).toBeGreaterThanOrEqual(4.5)
  })
})

describe('the suite', () => {
  it('has at least five tools in every group', async () => {
    const counts = new Map<string, number>()
    for (const t of TOOLS) counts.set(t.group, (counts.get(t.group) ?? 0) + 1)
    for (const g of ['Shape', 'Line', 'Pattern', 'Type', 'Image', 'Colour']) expect(counts.get(g), g).toBeGreaterThanOrEqual(5)
  })
})

describe('flow field blur', () => {
  const ff = TOOLS.find((t) => t.id === 'flow-field')!
  const paths = (svg: string) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join('').split('M').sort().join('M')

  it('adds blur filters only when asked', () => {
    expect(render(ff, 800, 800).svg).not.toContain('feGaussianBlur')
    expect(render(ff, 800, 800, 42, { blur: 8 }).svg).toContain('feGaussianBlur')
  })

  it('never moves a line when blur is turned on, in either mode', () => {
    const sharp = paths(render(ff, 800, 800).svg)
    expect(paths(render(ff, 800, 800, 42, { blur: 8, blurMode: 'depth' }).svg)).toBe(sharp)
    expect(paths(render(ff, 800, 800, 42, { blur: 8, blurMode: 'all' }).svg)).toBe(sharp)
  })

  it('keeps a sharp layer in depth of field, and none when blurring everything', () => {
    const depth = render(ff, 800, 800, 42, { blur: 8, blurMode: 'depth' }).svg
    expect(depth).toContain('ff-blur-1')
    expect(depth).toContain('ff-blur-2')
    expect(depth).toMatch(/<\/g><path/)
    const all = render(ff, 800, 800, 42, { blur: 8, blurMode: 'all' }).svg
    expect(all).not.toContain('ff-blur-1')
  })
})

describe('monogram', () => {
  it('sets near-black initials on Emergency Orange, never white', async () => {
    const { initials } = await import('../../src/tools/monogram')
    expect(initials('Dan Lindsay', 2)).toBe('DL')
    expect(initials('gitwork', 2)).toBe('GI')
    expect(initials('gitwork', 1)).toBe('G')
    const mono = TOOLS.find((t) => t.id === 'monogram')!
    expect(render(mono, 512, 512, 1, { palette: 'emergency', swatch: 1 }).svg).toMatch(/<text[^>]*fill="#0A0A0A"/)
  })
})

describe('dither', () => {
  it('inks dark tones and leaves light ones, for every method', async () => {
    const { ditherGrid } = await import('../../src/tools/dither')
    for (const m of ['bayer', 'floyd', 'atkinson']) {
      expect([...ditherGrid(new Float32Array(16).fill(0), 4, 4, m)].every((v) => v === 1), m).toBe(true)
      expect([...ditherGrid(new Float32Array(16).fill(1), 4, 4, m)].every((v) => v === 0), m).toBe(true)
    }
  })
})

describe('voronoi', () => {
  it('tiles the artboard with one cell per site', async () => {
    const { voronoiCells } = await import('../../src/tools/voronoi')
    const cells = voronoiCells([[100, 100], [300, 100], [200, 300]], 400, 400)
    expect(cells).toHaveLength(3)
    const area = (poly: readonly (readonly [number, number])[]) =>
      Math.abs(poly.reduce((s, [x0, y0], i) => { const [x1, y1] = poly[(i + 1) % poly.length]; return s + x0 * y1 - x1 * y0 }, 0)) / 2
    expect(cells.reduce((s, c) => s + area(c), 0)).toBeCloseTo(160000, 0)
  })
})

describe('artboard', () => {
  it('is one setting for the document, kept when the tool changes and through a save', () => {
    const doc = newDoc('shapes', 5)
    doc.artboard = { preset: 'story', width: 1080, height: 1920, background: '#FF4F00', seed: 77 }
    for (const t of TOOLS) {
      doc.tool = t.id
      const back = parseDoc(JSON.stringify(doc), 'shapes')!
      expect(back.tool).toBe(t.id)
      expect(back.artboard).toEqual(doc.artboard)
    }
  })

  it('names new work Gitwork, not Untitled', () => {
    expect(newDoc('shapes').title).toBe('Gitwork artwork')
  })
})

describe('variation names', () => {
  it('names a seed the same way every time, and these never change', async () => {
    const { variationName } = await import('../../src/core/variation-name')
    // Pinned: a saved artwork must keep its name. Reordering the word lists fails this.
    expect(variationName(0)).toBe('Amber Arch')
    expect(variationName(1234)).toBe(variationName(1234))
    expect(variationName(217262)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    const names = new Set(Array.from({ length: 500 }, (_, i) => variationName(i * 7919)))
    expect(names.size).toBeGreaterThan(400)
  })
})
