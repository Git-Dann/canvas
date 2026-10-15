// Seeded randomness and noise. The only source of randomness tools may use.

import type { Rng } from './types'

/** mulberry32: tiny, fast, good enough for art. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng = next as Rng
  rng.range = (min, max) => min + next() * (max - min)
  rng.int = (min, max) => Math.floor(min + next() * (max - min + 1))
  rng.pick = (items) => items[Math.floor(next() * items.length)]
  rng.chance = (p) => next() < p
  rng.gauss = () => {
    const u = 1 - next()
    const v = next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return rng
}

/** A new random seed for the "Randomise" button. Uses crypto, never Math.random. */
export function freshSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % 1_000_000
}

export interface Noise2D {
  (x: number, y: number): number
}

/** 2D gradient (Perlin) noise in roughly [-1, 1], seeded. */
export function createNoise2D(seed: number): Noise2D {
  const rng = createRng(seed ^ 0x5bd1e995)
  const perm = new Uint8Array(512)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0: return x + y
      case 1: return -x + y
      case 2: return x - y
      case 3: return -x - y
      case 4: return x
      case 5: return -x
      case 6: return y
      default: return -y
    }
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + t * (b - a)
  return (x, y) => {
    const xi = Math.floor(x) & 255
    const yi = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)
    const aa = perm[perm[xi] + yi]
    const ab = perm[perm[xi] + yi + 1]
    const ba = perm[perm[xi + 1] + yi]
    const bb = perm[perm[xi + 1] + yi + 1]
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
    return lerp(x1, x2, v) * 1.414
  }
}

/** Fractal Brownian motion over a noise function. Output roughly [-1, 1]. */
export function fbm(noise: Noise2D, x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / norm
}

/** fbm mapped to [0, 1] with its narrow middle band stretched to full contrast. */
export function noiseTone(noise: Noise2D, x: number, y: number, octaves = 4): number {
  return Math.min(1, Math.max(0, fbm(noise, x, y, octaves) * 1.8 + 0.5))
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const map = (v: number, a: number, b: number, c: number, d: number) => c + ((v - a) / (b - a)) * (d - c)
