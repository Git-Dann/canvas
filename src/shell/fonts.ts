// Brand faces, registered at boot the way Deck does it (foundry/boot.ts):
// the woff2 is inlined into the single-file build, so a saved artwork makes
// zero external requests. Latin subsets only. Both faces are SIL OFL 1.1.

import interUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import monoUrl from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url'

const STYLE_ID = 'canvas-fonts'

const FACES = [
  { family: 'Inter', url: interUrl, weight: '100 900' },
  { family: 'JetBrains Mono', url: monoUrl, weight: '100 800' },
]

const face = (family: string, src: string, weight: string) =>
  `@font-face{font-family:${JSON.stringify(family)};src:url(${src}) format('woff2');font-weight:${weight};font-style:normal;font-display:swap}`

export function injectFonts(): void {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = FACES.map((f) => face(f.family, f.url, f.weight)).join('\n')
  document.head.appendChild(el)
}

const dataUrlCache = new Map<string, Promise<string>>()

/** A data: URL for a face (already one in the built file; fetched in dev). */
function asDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return Promise.resolve(url)
  let p = dataUrlCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.blob())
      .then((b) => new Promise<string>((resolve) => {
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result).replace(/^data:[^;]*;/, 'data:font/woff2;'))
        fr.readAsDataURL(b)
      }))
    dataUrlCache.set(url, p)
  }
  return p
}

/**
 * @font-face CSS for the faces an SVG mentions, with the fonts embedded. Used
 * by export so an exported SVG or PNG renders text in the right face anywhere.
 */
export async function embeddedFontCss(svg: string): Promise<string> {
  const used = FACES.filter((f) => svg.includes(f.family))
  const parts = await Promise.all(used.map(async (f) => face(f.family, await asDataUrl(f.url), f.weight)))
  return parts.join('')
}
