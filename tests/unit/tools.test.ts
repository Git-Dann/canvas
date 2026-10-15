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
