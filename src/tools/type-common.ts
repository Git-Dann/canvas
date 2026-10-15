// Shared bits for the Type tools. SVG <text> set in the embedded faces, so
// exported SVGs carry their fonts (see shell/fonts.ts portableSvg).

import type { ParamSpec } from '../core/types'

export const SANS = "Inter,'Helvetica Neue',Arial,sans-serif"
export const MONO = "'JetBrains Mono',ui-monospace,Menlo,monospace"

export const fontParams = (section = 'Type', weight = 800): ParamSpec[] => [
  {
    key: 'font', label: 'Typeface', section, type: 'segmented', default: 'sans',
    options: [{ value: 'sans', label: 'Inter' }, { value: 'mono', label: 'Mono' }],
  },
  { key: 'weight', label: 'Weight', section, type: 'number', default: weight, min: 100, max: 900, step: 100 },
  { key: 'tracking', label: 'Letter spacing', section, type: 'number', default: 0, min: -0.1, max: 0.6, step: 0.01, unit: 'em' },
]

export const family = (v: unknown) => (v === 'mono' ? MONO : SANS)
