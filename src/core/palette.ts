// Artwork palettes. Built from the Untitled UI v8 primitives (Figma file
// eE8CjxDnMcBDg7Yj6KfF9Q) plus Emergency Orange. See docs/BRAND.md.
//
// `colors[0]` is the lead colour. Tools that need one ink use it; tools that
// need several cycle through the list.

export interface Palette {
  id: string
  name: string
  colors: string[]
}

export const EMERGENCY = {
  25: '#FFF9F5', 50: '#FFF2EB', 100: '#FFE2D1', 200: '#FFC4A3', 300: '#FF9E6B', 400: '#FF7633',
  500: '#FF4F00', 600: '#E64700', 700: '#C23A00', 800: '#962D00', 900: '#6E2200', 950: '#3D1300',
} as const

export const NEUTRAL = {
  0: '#FFFFFF', 50: '#FAFAFA', 100: '#F5F5F5', 200: '#E5E5E5', 300: '#D4D4D4', 400: '#A3A3A3',
  500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0A0A0A',
} as const

export const PALETTES: Palette[] = [
  { id: 'emergency', name: 'Emergency', colors: [EMERGENCY[500], EMERGENCY[300], NEUTRAL[50], EMERGENCY[700]] },
  { id: 'signal', name: 'Signal', colors: [EMERGENCY[500], '#FACC15', NEUTRAL[50], '#EF4444', NEUTRAL[400]] },
  { id: 'ember', name: 'Ember', colors: [EMERGENCY[500], EMERGENCY[400], EMERGENCY[600], EMERGENCY[800], EMERGENCY[200]] },
  { id: 'hazard', name: 'Hazard', colors: [EMERGENCY[500], NEUTRAL[950], NEUTRAL[50]] },
  { id: 'mono-light', name: 'Mono light', colors: [NEUTRAL[50], NEUTRAL[300], NEUTRAL[500]] },
  { id: 'mono-dark', name: 'Mono dark', colors: [NEUTRAL[950], NEUTRAL[700], NEUTRAL[400]] },
  { id: 'blueprint', name: 'Blueprint', colors: ['#BFDBFE', '#60A5FA', NEUTRAL[50], EMERGENCY[500]] },
  { id: 'untitled', name: 'Untitled', colors: [EMERGENCY[500], '#7C3AED', '#2563EB', '#0D9488', '#16A34A', '#FACC15'] },
  { id: 'dusk', name: 'Dusk', colors: ['#6D28D9', '#DB2777', EMERGENCY[500], '#FACC15'] },
  { id: 'sea', name: 'Sea', colors: ['#14B8A6', '#2563EB', '#99F6E4', NEUTRAL[50]] },
]

export const DEFAULT_PALETTE = 'emergency'

export function palette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

/** Background swatches offered in the artboard section. */
export const BACKGROUNDS = [NEUTRAL[950], NEUTRAL[900], NEUTRAL[50], NEUTRAL[0], EMERGENCY[500], EMERGENCY[950], '#0C1222', 'transparent']

/** Parse #rgb or #rrggbb. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

/** Relative luminance 0..1 (WCAG). */
export function luminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Sample a palette as a continuous gradient at t in [0, 1]. */
export function gradientAt(colors: readonly string[], t: number): string {
  if (colors.length === 1) return colors[0]
  const x = Math.max(0, Math.min(0.9999, t)) * (colors.length - 1)
  const i = Math.floor(x)
  return mix(colors[i], colors[i + 1], x - i)
}
