// Exports: SVG (fonts embedded when text is used), PNG at a scale, plain text.

import { exportFile } from '../../kernel/src/save.ts'
import { embeddedFontCss } from './fonts'

export const MAX_PNG_SIDE = 8192

/** The SVG with any brand fonts it uses embedded, ready to leave the app. */
export async function portableSvg(svg: string): Promise<string> {
  const css = await embeddedFontCss(svg)
  if (!css) return svg
  return svg.replace(/^(<svg[^>]*>)/, `$1<style>${css}</style>`)
}

export async function svgToPng(svg: string, width: number, height: number, scale: number): Promise<Blob> {
  const s = Math.min(scale, MAX_PNG_SIDE / Math.max(width, height))
  const w = Math.round(width * s)
  const h = Math.round(height * s)
  const url = URL.createObjectURL(new Blob([await portableSvg(svg)], { type: 'image/svg+xml' }))
  try {
    const img = new Image(w, h)
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const slug = (s: string) => s.replace(/[^\w\d-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'artwork'

export async function exportSvg(svg: string, name: string) {
  return exportFile(new Blob([await portableSvg(svg)], { type: 'image/svg+xml' }), `${name}.svg`, 'SVG image', '.svg')
}

export async function exportPng(svg: string, width: number, height: number, scale: number, name: string) {
  const blob = await svgToPng(svg, width, height, scale)
  return exportFile(blob, `${name}${scale === 1 ? '' : `@${scale}x`}.png`, 'PNG image', '.png')
}

export async function exportText(text: string, name: string) {
  return exportFile(new Blob([text], { type: 'text/plain' }), `${name}.txt`, 'Plain text', '.txt')
}

export async function copySvg(svg: string) {
  await navigator.clipboard.writeText(await portableSvg(svg))
}
