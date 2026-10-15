// Reading prepared rasters (uploaded images, rasterised text). Pure: works in
// Node tests with a hand-built Raster.

import type { Raster } from './types'

/** Luminance 0..1 at normalised (u, v), nearest pixel. Transparent reads as `empty`. */
export function lumAt(r: Raster, u: number, v: number, empty = 1): number {
  const x = Math.min(r.width - 1, Math.max(0, Math.floor(u * r.width)))
  const y = Math.min(r.height - 1, Math.max(0, Math.floor(v * r.height)))
  const i = (y * r.width + x) * 4
  const a = r.data[i + 3] / 255
  const l = (0.2126 * r.data[i] + 0.7152 * r.data[i + 1] + 0.0722 * r.data[i + 2]) / 255
  return l * a + empty * (1 - a)
}

/** Average luminance over a cell [u0,u1] x [v0,v1], sampling up to 4x4 points. */
export function lumCell(r: Raster, u0: number, v0: number, u1: number, v1: number, empty = 1): number {
  let sum = 0
  const n = 3
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) sum += lumAt(r, u0 + ((i + 0.5) / n) * (u1 - u0), v0 + ((j + 0.5) / n) * (v1 - v0), empty)
  }
  return sum / (n * n)
}

/** Colour at (u, v) as #rrggbb. */
export function colorAt(r: Raster, u: number, v: number): string {
  const x = Math.min(r.width - 1, Math.max(0, Math.floor(u * r.width)))
  const y = Math.min(r.height - 1, Math.max(0, Math.floor(v * r.height)))
  const i = (y * r.width + x) * 4
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(r.data[i])}${h(r.data[i + 1])}${h(r.data[i + 2])}`
}

/** Fit a raster into a box keeping aspect: returns the drawn rect. */
export function fitRect(r: Raster, boxW: number, boxH: number, mode: 'contain' | 'cover' = 'contain') {
  const s = mode === 'contain' ? Math.min(boxW / r.width, boxH / r.height) : Math.max(boxW / r.width, boxH / r.height)
  const w = r.width * s
  const h = r.height * s
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h }
}

/** Synthetic raster for tests and empty states: a soft radial blob. */
export function demoRaster(width = 64, height = 64): Raster {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x / width - 0.5
      const dy = y / height - 0.5
      const v = Math.max(0, Math.min(255, Math.hypot(dx, dy) * 2 * 255))
      const i = (y * width + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { width, height, data }
}
