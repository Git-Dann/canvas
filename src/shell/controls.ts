// Builds the props rail from a tool's ParamSpecs. No tool writes UI code:
// adding a param to a tool adds its control here automatically.

import type { ParamSpec, ParamValue, Params } from '../core/types'
import { BACKGROUNDS, PALETTES } from '../core/palette'
import { h, nextId } from './dom'
import { icon } from './icons'
import { fileToDataUrl } from './rasters'

export interface ControlEvents {
  /** transient = mid-drag; the store groups those into one undo step. */
  set(key: string, value: ParamValue, transient: boolean): void
  commit(): void
  error(message: string): void
}

const decimals = (step: number) => (String(step).split('.')[1] ?? '').length
const fmt = (v: number, step: number) => v.toFixed(decimals(step))

function field(spec: ParamSpec, control: HTMLElement, value?: HTMLElement, forId?: string): HTMLElement {
  const label = h('label', { class: 'field-label', for: forId }, h('span', {}, spec.label), value ?? null)
  return h('div', { class: 'field', 'data-key': spec.key }, label, control, spec.hint ? h('span', { class: 'field-hint' }, spec.hint) : null)
}

export function control(spec: ParamSpec, value: ParamValue, ev: ControlEvents): HTMLElement {
  const id = nextId(spec.key)
  switch (spec.type) {
    case 'number': {
      const v = value as number
      const readout = h('span', { class: 'field-value' }, `${fmt(v, spec.step)}${spec.unit ? ` ${spec.unit}` : ''}`)
      const slider = h('input', { id, class: 'slider', type: 'range', min: spec.min, max: spec.max, step: spec.step, value: String(v), 'aria-label': spec.label })
      const box = h('input', { class: 'input', type: 'number', min: spec.min, max: spec.max, step: spec.step, value: fmt(v, spec.step), 'aria-label': `${spec.label} value` })
      const paint = (n: number) => {
        slider.style.setProperty('--fill', `${((n - spec.min) / (spec.max - spec.min)) * 100}%`)
        readout.textContent = `${fmt(n, spec.step)}${spec.unit ? ` ${spec.unit}` : ''}`
      }
      paint(v)
      slider.addEventListener('input', () => {
        const n = Number(slider.value)
        paint(n)
        box.value = fmt(n, spec.step)
        ev.set(spec.key, n, true)
      })
      slider.addEventListener('change', () => ev.commit())
      box.addEventListener('change', () => {
        const n = Math.min(spec.max, Math.max(spec.min, Number(box.value)))
        if (!Number.isFinite(n)) return
        box.value = fmt(n, spec.step)
        slider.value = String(n)
        paint(n)
        ev.set(spec.key, n, false)
      })
      return field(spec, h('div', { class: 'number-row' }, slider, box), readout, id)
    }
    case 'select': {
      const sel = h('select', { id, class: 'select' }, ...spec.options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)))
      sel.addEventListener('change', () => ev.set(spec.key, sel.value, false))
      return field(spec, sel, undefined, id)
    }
    case 'segmented': {
      const group = h('div', { class: 'segmented', role: 'group', 'aria-label': spec.label })
      for (const o of spec.options) {
        const b = h('button', { type: 'button', 'aria-pressed': String(o.value === value), title: o.label }, o.label)
        b.addEventListener('click', () => {
          group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
          ev.set(spec.key, o.value, false)
        })
        group.append(b)
      }
      return field(spec, group)
    }
    case 'toggle': {
      const input = h('input', { id, type: 'checkbox', role: 'switch', checked: value as boolean })
      input.addEventListener('change', () => ev.set(spec.key, input.checked, false))
      return h('div', { class: 'field', 'data-key': spec.key },
        h('label', { class: 'toggle', for: id }, input, h('span', { class: 'toggle-track' }),
          h('span', { class: 'toggle-text' }, spec.label, spec.hint ? h('span', { class: 'field-hint' }, spec.hint) : null)))
    }
    case 'color':
      return field(spec, colourPicker(spec.key, value as string, ev))
    case 'palette': {
      const grid = h('div', { class: 'swatches', role: 'group', 'aria-label': spec.label })
      for (const p of PALETTES) {
        const b = h('button', { type: 'button', class: 'palette-chip', 'aria-pressed': String(p.id === value) },
          h('span', { class: 'palette-strip', html: p.colors.map((c) => `<span style="background:${c}"></span>`).join('') }),
          p.name)
        b.addEventListener('click', () => {
          grid.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
          ev.set(spec.key, p.id, false)
        })
        grid.append(b)
      }
      return field(spec, grid)
    }
    case 'text': {
      const input = spec.multiline
        ? h('textarea', { id, class: 'textarea', rows: 2, maxLength: spec.maxLength })
        : h('input', { id, class: 'input', type: 'text', maxLength: spec.maxLength })
      input.value = value as string
      input.addEventListener('input', () => ev.set(spec.key, input.value, true))
      input.addEventListener('change', () => ev.commit())
      return field(spec, input, undefined, id)
    }
    case 'image':
      return field(spec, imageDrop(spec, value as string, ev))
  }
}

export function colourPicker(key: string, value: string, ev: Pick<ControlEvents, 'set'>, swatches = BACKGROUNDS): HTMLElement {
  const row = h('div', { class: 'colour-row', role: 'group' })
  const custom = h('input', { type: 'color', class: 'colour-input', 'aria-label': 'Custom colour', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#ff4f00' })
  const mark = (v: string) =>
    row.querySelectorAll<HTMLButtonElement>('.colour-dot').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value?.toLowerCase() === v.toLowerCase())))
  for (const c of swatches) {
    const b = h('button', {
      type: 'button',
      class: `colour-dot${c === 'transparent' ? ' is-transparent' : ''}`,
      style: c === 'transparent' ? undefined : `background:${c}`,
      'aria-label': c === 'transparent' ? 'Transparent' : c,
      'data-tip': c === 'transparent' ? 'Transparent' : c.toUpperCase(),
      'data-value': c,
    })
    b.addEventListener('click', () => {
      mark(c)
      ev.set(key, c, false)
    })
    row.append(b)
  }
  custom.addEventListener('input', () => {
    mark(custom.value)
    ev.set(key, custom.value, true)
  })
  custom.addEventListener('change', () => (ev as ControlEvents).commit?.())
  row.append(custom)
  mark(value)
  return row
}

function imageDrop(spec: ParamSpec, value: string, ev: ControlEvents): HTMLElement {
  const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif' })
  const zone = h('label', { class: 'dropzone' }, input)
  const paint = (src: string) => {
    zone.querySelectorAll('img, span, button').forEach((n) => n.remove())
    if (src) {
      zone.append(h('img', { src, alt: '' }), h('span', {}, h('strong', {}, 'Replace image'), h('br'), 'or drop a new one here'))
      const clear = h('button', { type: 'button', class: 'btn btn-tertiary btn-icon', 'aria-label': 'Remove image', html: icon.x })
      clear.addEventListener('click', (e) => {
        e.preventDefault()
        paint('')
        ev.set(spec.key, '', false)
      })
      zone.append(clear)
    } else {
      zone.append(h('span', { html: icon.upload, style: 'width:20px;flex:none' }), h('span', {}, h('strong', {}, 'Click to upload'), ' or drag and drop', h('br'), 'PNG, JPG, WebP or GIF'))
    }
  }
  const take = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return ev.error('That file is not an image.')
    try {
      const url = await fileToDataUrl(file)
      paint(url)
      ev.set(spec.key, url, false)
    } catch {
      ev.error('Could not read that image.')
    }
  }
  input.addEventListener('change', () => take(input.files?.[0]))
  zone.addEventListener('dragover', (e) => {
    e.preventDefault()
    zone.classList.add('is-over')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', (e) => {
    e.preventDefault()
    zone.classList.remove('is-over')
    take(e.dataTransfer?.files?.[0])
  })
  paint(value)
  return zone
}

/** Show or hide fields whose visibleIf depends on other values. */
export function applyVisibility(root: HTMLElement, specs: ParamSpec[], params: Params) {
  for (const s of specs) {
    if (!s.visibleIf) continue
    const el = root.querySelector<HTMLElement>(`.field[data-key="${s.key}"]`)
    if (el) el.hidden = !s.visibleIf(params)
  }
  // A section with every field hidden collapses away.
  root.querySelectorAll<HTMLElement>('.props-section').forEach((sec) => {
    const fields = [...sec.querySelectorAll<HTMLElement>('.field')]
    sec.hidden = fields.length > 0 && fields.every((f) => f.hidden)
  })
}
