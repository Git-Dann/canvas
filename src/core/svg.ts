// SVG building helpers. Tools return strings, never DOM nodes.

export type Pt = readonly [number, number]

/** Round to 2 decimals and drop trailing zeros: keeps files small. */
export const f = (n: number): string => {
  const r = Math.round(n * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Attribute string from an object. undefined / false / null are skipped. */
export function attrs(a: Record<string, string | number | boolean | undefined | null>): string {
  let out = ''
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null || v === false) continue
    out += ` ${k}="${typeof v === 'number' ? f(v) : esc(String(v))}"`
  }
  return out
}

export function el(tag: string, a: Record<string, string | number | boolean | undefined | null>, children?: string): string {
  return children === undefined ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${children}</${tag}>`
}

/** The root document. Every tool's render() ends with this. */
export function svgDoc(opts: { width: number; height: number; background?: string; body: string; defs?: string; style?: string }): string {
  const { width: w, height: h } = opts
  const bg = opts.background && opts.background !== 'transparent' ? el('rect', { width: w, height: h, fill: opts.background }) : ''
  const defs = opts.defs ? `<defs>${opts.defs}</defs>` : ''
  const style = opts.style ? `<style>${opts.style}</style>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${style}${defs}${bg}${opts.body}</svg>`
}

/** Straight polyline path data. */
export function linePath(points: readonly Pt[], closed = false): string {
  if (!points.length) return ''
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 1; i < points.length; i++) d += `L${f(points[i][0])} ${f(points[i][1])}`
  return closed ? d + 'Z' : d
}

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(points: readonly Pt[], closed = false, tension = 1): string {
  const n = points.length
  if (n < 3) return linePath(points, closed)
  const at = (i: number): Pt => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))])
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  const last = closed ? n : n - 1
  const k = tension / 6
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1[0] + (p2[0] - p0[0]) * k
    const c1y = p1[1] + (p2[1] - p0[1]) * k
    const c2x = p2[0] - (p3[0] - p1[0]) * k
    const c2y = p2[1] - (p3[1] - p1[1]) * k
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

/**
 * Closed polygon with rounded corners. `radius` 0..1 is a fraction of the
 * shorter adjacent edge, so it never overshoots.
 */
export function roundedPolygon(points: readonly Pt[], radius: number): string {
  const n = points.length
  if (radius <= 0 || n < 3) return linePath(points, true)
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const cur = points[i]
    const next = points[(i + 1) % n]
    const lenA = Math.hypot(cur[0] - prev[0], cur[1] - prev[1])
    const lenB = Math.hypot(next[0] - cur[0], next[1] - cur[1])
    const r = Math.min(lenA, lenB) * 0.5 * radius
    const a: Pt = [cur[0] + ((prev[0] - cur[0]) / lenA) * r, cur[1] + ((prev[1] - cur[1]) / lenA) * r]
    const b: Pt = [cur[0] + ((next[0] - cur[0]) / lenB) * r, cur[1] + ((next[1] - cur[1]) / lenB) * r]
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])}Q${f(cur[0])} ${f(cur[1])} ${f(b[0])} ${f(b[1])}`
  }
  return d + 'Z'
}

/** Total length of a polyline. Used for stroke-dash draw-on animation. */
export function polylineLength(points: readonly Pt[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return len
}

/**
 * CSS for a looping "draw the line on" animation. Apply class `draw` to a path
 * with pathLength="1". Plays in browsers and in exported SVG; PNG takes frame 0
 * of the finished state because rasterisers ignore animation.
 */
export function drawOnStyle(seconds: number): string {
  return `.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw ${seconds}s ease-in-out infinite alternate}@keyframes draw{to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.draw{animation:none;stroke-dashoffset:0}}`
}
