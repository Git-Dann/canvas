// The tool contract. Every generator in src/tools/ is one `Tool`.
//
// A tool is a pure function from params to SVG. It never touches the DOM,
// never fetches, never reads the clock, and never calls Math.random: all
// randomness comes from `input.rng` (seeded from the artboard seed). That is
// what makes a saved file reopen to exactly the same artwork, and what lets
// tests/unit render every tool in Node.
//
// The shell builds the controls from `params`, so a new tool needs no UI code.

export type ParamValue = number | string | boolean
export type Params = Record<string, ParamValue>

interface ParamBase {
  /** Key in the params object. camelCase, stable forever (it is saved in files). */
  key: string
  label: string
  /** Props-rail section heading. Sections render in first-seen order. */
  section: string
  /** One-line help shown under the control. */
  hint?: string
  /** Hide the control unless this returns true. */
  visibleIf?: (p: Params) => boolean
}

export type ParamSpec =
  | (ParamBase & { type: 'number'; default: number; min: number; max: number; step: number; unit?: string })
  | (ParamBase & { type: 'select'; default: string; options: Option[] })
  /** Button group. Use for 2 to 4 short options. */
  | (ParamBase & { type: 'segmented'; default: string; options: Option[] })
  | (ParamBase & { type: 'toggle'; default: boolean })
  | (ParamBase & { type: 'color'; default: string })
  /** Value is a palette id from core/palette.ts. */
  | (ParamBase & { type: 'palette'; default: string })
  | (ParamBase & { type: 'text'; default: string; multiline?: boolean; maxLength?: number })
  /** Value is a data URL (downscaled on upload) or '' for none. */
  | (ParamBase & { type: 'image'; default: '' })

export interface Option {
  value: string
  label: string
}

/** A raster the shell prepares before render: an uploaded image or set text. */
export type RasterRequest =
  | { kind: 'image'; src: string }
  /** Text set centred on a width x height canvas, black on white. */
  | { kind: 'text'; text: string; weight: number; family: 'sans' | 'mono'; width: number; height: number }

/** RGBA pixels, row-major. Prepared by the shell, read by tools via core/raster.ts. */
export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface Rng {
  /** Float in [0, 1). */
  (): number
  range(min: number, max: number): number
  int(min: number, maxInclusive: number): number
  pick<T>(items: readonly T[]): T
  chance(p: number): boolean
  /** Roughly normal, mean 0, sd 1. */
  gauss(): number
}

export interface RenderInput {
  params: Params
  width: number
  height: number
  background: string
  seed: number
  rng: Rng
  /** Resolved `rasters()` requests, by key. null while loading or if absent. */
  rasters: Record<string, Raster | null>
}

export interface RenderResult {
  /** Complete <svg> document, sized width x height. Build it with core/svg.ts. */
  svg: string
  /** Plain-text version for tools that make text (ASCII). Enables TXT export. */
  text?: string
}

export type ToolGroup = 'Shape' | 'Line' | 'Pattern' | 'Type' | 'Image' | 'Colour'

export interface Tool {
  /** URL and file id: lowercase-kebab, stable forever. */
  id: string
  name: string
  group: ToolGroup
  /** One sentence for the tool rail tooltip and the README. */
  blurb: string
  /** 24x24 icon body (paths only, stroke-based, no <svg> wrapper). */
  icon: string
  params: ParamSpec[]
  /** Optional: rasters the shell must prepare (images, rasterised text). */
  rasters?: (p: Params, artboard: { width: number; height: number }) => Record<string, RasterRequest>
  render(input: RenderInput): RenderResult
}
