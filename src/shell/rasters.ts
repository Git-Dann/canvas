// Turns a tool's RasterRequests into pixels. Async (image decode, font load),
// cached by request, and reported back through onReady so the app re-renders.

import type { Raster, RasterRequest } from '../core/types'

const MAX_SIDE = 480
const cache = new Map<string, Raster | 'loading' | 'error'>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

async function loadImage(src: string): Promise<Raster> {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await img.decode()
  const s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * s))
  const h = Math.max(1, Math.round(img.naturalHeight * s))
  const c = canvas(w, h)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data }
}

async function setText(req: Extract<RasterRequest, { kind: 'text' }>): Promise<Raster> {
  const family = req.family === 'mono' ? 'JetBrains Mono' : 'Inter'
  await document.fonts.load(`${req.weight} 100px "${family}"`).catch(() => undefined)
  const s = Math.min(1, MAX_SIDE / Math.max(req.width, req.height))
  const w = Math.max(1, Math.round(req.width * s))
  const h = Math.max(1, Math.round(req.height * s))
  const c = canvas(w, h)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  const lines = req.text.split('\n').filter((l, _i, all) => l.trim() || all.length === 1)
  ctx.font = `${req.weight} 100px "${family}", sans-serif`
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1)
  // Fit the block into 88% of the width and 80% of the height.
  const size = Math.min((w * 0.88 * 100) / widest, (h * 0.8) / (lines.length * 1.05))
  ctx.font = `${req.weight} ${size}px "${family}", sans-serif`
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineH = size * 1.05
  const top = h / 2 - ((lines.length - 1) * lineH) / 2
  lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * lineH))
  return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data }
}

/** Ready rasters now; anything still loading is null and triggers onReady later. */
export function resolveRasters(reqs: Record<string, RasterRequest>, onReady: () => void): { rasters: Record<string, Raster | null>; pending: boolean } {
  const rasters: Record<string, Raster | null> = {}
  let pending = false
  for (const [key, req] of Object.entries(reqs)) {
    const id = JSON.stringify(req)
    const hit = cache.get(id)
    if (hit && hit !== 'loading' && hit !== 'error') {
      rasters[key] = hit
      continue
    }
    rasters[key] = null
    if (hit === 'error') continue
    pending = true
    if (!hit) {
      cache.set(id, 'loading')
      const job = req.kind === 'image' ? loadImage(req.src) : setText(req)
      job.then((r) => cache.set(id, r), () => cache.set(id, 'error')).finally(onReady)
      // Keep the cache from growing without bound across a long session.
      if (cache.size > 24) cache.delete(cache.keys().next().value!)
    }
  }
  return { rasters, pending }
}

/** Downscale an uploaded file to a data URL small enough to live in the doc. */
export async function fileToDataUrl(file: File, maxSide = 1200): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const c = canvas(Math.round(img.naturalWidth * s), Math.round(img.naturalHeight * s))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86)
  } finally {
    URL.revokeObjectURL(url)
  }
}
