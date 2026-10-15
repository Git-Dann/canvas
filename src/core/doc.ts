// The Canvas document: what a saved .canvas.html carries in its data block.
// Changing this shape is a file-format change: add fields with defaults in
// parseDoc(), never rename or repurpose one.

import type { KernelDoc } from '../../kernel/src/doc.ts'
import type { ParamSpec, Params, Tool } from './types'
import { PALETTES } from './palette'

export const DOC_FORMAT = 'gitwork-canvas'
export const DOC_VERSION = 1

export interface Artboard {
  preset: string
  width: number
  height: number
  background: string
  seed: number
}

export interface CanvasDoc extends KernelDoc {
  format: typeof DOC_FORMAT
  v: number
  /** Active tool id. */
  tool: string
  artboard: Artboard
  /** Params per tool id, so switching tools keeps each tool's settings. */
  params: Record<string, Params>
  created: number
  modified: number
}

export interface ArtboardPreset {
  id: string
  label: string
  width: number
  height: number
}

export const ARTBOARDS: ArtboardPreset[] = [
  { id: 'square', label: 'Square 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait 4:5', width: 1080, height: 1350 },
  { id: 'story', label: 'Story 9:16', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape 16:9', width: 1920, height: 1080 },
  { id: 'og', label: 'Social card', width: 1200, height: 630 },
  { id: 'hero', label: 'Web hero', width: 2400, height: 1200 },
  { id: 'poster', label: 'Poster A-ratio', width: 1414, height: 2000 },
  { id: 'avatar', label: 'Avatar 512', width: 512, height: 512 },
]

export function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >>> 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
}

export function newDoc(tool: string, seed = 1): CanvasDoc {
  const now = Date.now()
  return {
    docId: uuid(),
    title: 'Gitwork artwork',
    format: DOC_FORMAT,
    v: DOC_VERSION,
    tool,
    artboard: { preset: 'square', width: 1080, height: 1080, background: '#0A0A0A', seed },
    params: {},
    created: now,
    modified: now,
  }
}

/** Defaults for a tool, from its param specs. */
export function defaultParams(tool: Tool): Params {
  const out: Params = {}
  for (const s of tool.params) out[s.key] = s.default
  return out
}

/** Coerce one stored value to what its spec allows. Unknown or bad values fall back to the default. */
export function sanitiseValue(spec: ParamSpec, v: unknown): Params[string] {
  switch (spec.type) {
    case 'number': {
      const n = typeof v === 'number' && Number.isFinite(v) ? v : spec.default
      return Math.min(spec.max, Math.max(spec.min, n))
    }
    case 'select':
    case 'segmented':
      return typeof v === 'string' && spec.options.some((o) => o.value === v) ? v : spec.default
    case 'toggle':
      return typeof v === 'boolean' ? v : spec.default
    case 'color':
      return typeof v === 'string' && (/^#[0-9a-f]{6}$/i.test(v) || v === 'transparent') ? v : spec.default
    case 'palette':
      return typeof v === 'string' && PALETTES.some((p) => p.id === v) ? v : spec.default
    case 'text': {
      const s = typeof v === 'string' ? v : spec.default
      return spec.maxLength ? s.slice(0, spec.maxLength) : s
    }
    case 'image':
      return typeof v === 'string' && (v === '' || v.startsWith('data:image/')) ? v : ''
  }
}

/** The full, valid params for `tool` in `doc` (defaults merged, values sanitised). */
export function paramsFor(doc: CanvasDoc, tool: Tool): Params {
  const stored = doc.params[tool.id] ?? {}
  const out: Params = {}
  for (const s of tool.params) out[s.key] = sanitiseValue(s, stored[s.key])
  return out
}

/** Parse and migrate a stored document. Returns null if it isn't one of ours. */
export function parseDoc(json: string, fallbackTool: string): CanvasDoc | null {
  let raw: any
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (!raw || raw.format !== DOC_FORMAT) return null
  const base = newDoc(typeof raw.tool === 'string' ? raw.tool : fallbackTool)
  const ab = raw.artboard ?? {}
  return {
    ...base,
    docId: typeof raw.docId === 'string' ? raw.docId : base.docId,
    title: typeof raw.title === 'string' ? raw.title : base.title,
    v: DOC_VERSION,
    artboard: {
      preset: typeof ab.preset === 'string' ? ab.preset : 'square',
      width: clampDim(ab.width, base.artboard.width),
      height: clampDim(ab.height, base.artboard.height),
      background: typeof ab.background === 'string' ? ab.background : base.artboard.background,
      seed: Number.isFinite(ab.seed) ? ab.seed : 1,
    },
    params: raw.params && typeof raw.params === 'object' ? raw.params : {},
    created: Number.isFinite(raw.created) ? raw.created : base.created,
    modified: Number.isFinite(raw.modified) ? raw.modified : base.modified,
  }
}

const clampDim = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(8000, Math.max(16, v))) : fallback
