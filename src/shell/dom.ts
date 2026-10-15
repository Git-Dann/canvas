// A tiny element builder. The shell is framework-free, like Deck.

type Attrs = Record<string, string | number | boolean | undefined | null | EventListener>

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener)
    else if (k === 'html') el.innerHTML = String(v)
    else if (k in el && typeof v !== 'string') (el as any)[k] = v
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) if (c !== null && c !== false && c !== undefined) el.append(c)
  return el
}

let uid = 0
export const nextId = (prefix: string) => `${prefix}-${++uid}`
