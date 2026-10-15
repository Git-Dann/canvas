// The Canvas shell: topbar, tool rail, stage, props rail. Mirrors Foundry
// Deck's editor frame, driven by the tool registry and the Store.

import type { CanvasDoc } from '../core/doc'
import type { ParamValue, RenderResult, Tool } from '../core/types'
import { ARTBOARDS, defaultParams, paramsFor, parseDoc } from '../core/doc'
import { createRng, freshSeed } from '../core/rng'
import { TOOLS, toolById } from '../tools'
import { saveFile, currentFileName } from '../../kernel/src/save.ts'
import { addVersion, clearRecovery, getRecovery, putRecovery } from '../../kernel/src/autosave.ts'
import { Store, type ChangeKind } from './store'
import { h } from './dom'
import { icon, toolIcon } from './icons'
import { applyVisibility, colourPicker, control } from './controls'
import { resolveRasters } from './rasters'
import { copySvg, exportPng, exportSvg, exportText, slug } from './export'

const FOUNDRY_THEME_KEY = 'gitwork.theme.v1'
const LAST_DOC_KEY = 'canvas-last-doc'

const store = (k: string, v?: string) => {
  try {
    if (v === undefined) return localStorage.getItem(k)
    localStorage.setItem(k, v)
  } catch {
    /* private mode: per-viewer conveniences only */
  }
  return null
}

/**
 * True when this shell is Foundry's hosted copy at /canvas, not a saved file on
 * someone's disk. Same test as Deck's: a saved artwork has no Foundry to go back
 * to, so it never shows a dead link.
 */
export const servedByFoundry = () =>
  /^https?:$/.test(location.protocol) && (location.pathname === '/canvas' || location.pathname.startsWith('/canvas/'))

export function mountApp(root: HTMLElement, doc: CanvasDoc, opts: { embedded: boolean }) {
  const s = new Store(doc)
  let lastSaved = opts.embedded ? JSON.stringify(doc) : ''
  let result: RenderResult | null = null
  let renderQueued = false

  // ── chrome ───────────────────────────────────────────────────────────────
  const title = h('input', { class: 'title-input', value: doc.title, 'aria-label': 'Artwork title', maxLength: 80 })
  const saveState = h('span', { class: 'save-state', 'aria-live': 'polite' })
  const undoBtn = h('button', { class: 'btn btn-tertiary btn-icon', 'aria-label': 'Undo', 'data-tip': 'Undo  ⌘Z', html: icon.undo })
  const redoBtn = h('button', { class: 'btn btn-tertiary btn-icon', 'aria-label': 'Redo', 'data-tip': 'Redo  ⇧⌘Z', html: icon.redo })
  const shuffleBtn = h('button', { class: 'btn btn-secondary', 'data-tip': 'New seed  R', html: `${icon.shuffle}<span class="label">Randomise</span>` })
  const saveBtn = h('button', { class: 'btn btn-secondary', 'data-tip': 'Save this file  ⌘S', html: `${icon.save}<span class="label">Save</span>` })
  const exportBtn = h('button', { class: 'btn btn-primary', 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: `${icon.download}<span class="label">Export</span>${icon.chevronDown}` })
  const menu = h('div', { class: 'menu', role: 'menu', hidden: true, style: 'right:0;top:calc(100% + 6px)' })
  // The artboard is one setting for the whole file, shared by every tool, so it
  // lives in the topbar rather than among a tool's settings.
  const artboardBtn = h('button', { class: 'btn btn-secondary artboard-btn', id: 'artboard-btn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'artboard-pop', 'data-tip': 'Artboard: size, background, seed' })
  const artboardBox = h('div', { class: 'popover', id: 'artboard-pop', role: 'dialog', 'aria-label': 'Artboard', hidden: true })
  const alert = h('div', { class: 'alert', role: 'status', hidden: true, style: 'grid-area:alert' })

  const topbar = h('header', { class: 'topbar' },
    // Same as Deck: when hosted in Foundry, the first slot is the way back.
    servedByFoundry()
      ? h('a', { class: 'back-link', href: '/app', title: 'Back to Foundry' }, '← Foundry')
      : null,
    h('a', { class: 'wordmark', href: '?', 'aria-label': 'Canvas by Gitwork, new artwork' },
      h('span', { class: 'wordmark-mark', html: icon.mark }),
      h('span', { class: 'wordmark-name' }, 'Canvas'),
      h('span', { class: 'wordmark-by' }, 'by Gitwork')),
    h('span', { class: 'topbar-divider' }),
    title,
    saveState,
    h('span', { class: 'topbar-spacer' }),
    h('div', { class: 'topbar-group' }, undoBtn, redoBtn),
    h('div', { class: 'topbar-group' }, artboardBtn, artboardBox),
    h('div', { class: 'topbar-group' }, shuffleBtn, saveBtn, h('div', { class: 'topbar-group' }, exportBtn, menu)))

  const toolsNav = h('nav', { class: 'tools', 'aria-label': 'Tools' })
  const groups = [...new Set(TOOLS.map((t) => t.group))]
  for (const g of groups) {
    const box = h('div', { class: 'tool-group' }, h('div', { class: 'tool-group-label' }, g))
    for (const t of TOOLS.filter((x) => x.group === g)) {
      const b = h('button', { class: 'tool-btn', 'data-tool': t.id, title: t.blurb }, h('span', { html: toolIcon(t.icon), style: 'display:contents' }), t.name)
      b.addEventListener('click', () => switchTool(t.id))
      box.append(b)
    }
    toolsNav.append(box)
  }

  const artboard = h('div', { class: 'artboard', role: 'img' })
  const viewport = h('div', { class: 'stage-viewport' }, artboard)
  const stageInfo = h('div', { class: 'stage-tool' })
  const sizeInfo = h('span', {})
  const stage = h('main', { class: 'stage' }, viewport, h('div', { class: 'stage-bar' }, stageInfo, sizeInfo))
  // The artboard is one setting for the whole document, shared by every tool,
  // so it sits in its own block above the tool's settings and is not rebuilt
  // when the tool changes. Tool sections number from 01 under it.
  const toolBox = h('div', { class: 'props-tool' })
  const props = h('aside', { class: 'props', 'aria-label': 'Settings' }, toolBox)
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' })

  root.append(h('div', { class: 'app' }, topbar, alert, toolsNav, stage, props), toasts)

  // ── helpers ──────────────────────────────────────────────────────────────
  const tool = (): Tool => toolById(s.doc.tool)
  const params = () => paramsFor(s.doc, tool())

  const toast = (msg: string, error = false) => {
    const t = h('div', { class: `toast${error ? ' is-error' : ''}` }, msg)
    toasts.append(t)
    setTimeout(() => t.remove(), 3200)
  }

  const setParam = (key: string, value: ParamValue, transient: boolean) => {
    const id = tool().id
    s.update((d) => {
      d.params[id] = { ...paramsFor(d, toolById(id)), [key]: value }
    }, { transient })
  }

  const setArtboard = (patch: Partial<CanvasDoc['artboard']>, transient = false) =>
    s.update((d) => Object.assign(d.artboard, patch), { transient })

  // ── rendering ────────────────────────────────────────────────────────────
  const queueRender = () => {
    if (renderQueued) return
    renderQueued = true
    requestAnimationFrame(() => {
      renderQueued = false
      renderNow()
    })
  }

  function renderNow() {
    const t = tool()
    const p = params()
    const { width, height, background, seed } = s.doc.artboard
    const reqs = t.rasters?.(p, { width, height }) ?? {}
    const { rasters, pending } = resolveRasters(reqs, queueRender)
    artboard.classList.toggle('is-busy', pending)
    try {
      result = t.render({ params: p, width, height, background, seed, rng: createRng(seed), rasters })
      artboard.innerHTML = result.svg
      artboard.setAttribute('aria-label', `${t.name} artwork, ${width} by ${height}`)
    } catch (err) {
      console.error(err)
      toast(`${t.name} could not draw with these settings.`, true)
    }
    fit()
  }

  function fit() {
    const { width, height } = s.doc.artboard
    const r = viewport.getBoundingClientRect()
    const pad = parseFloat(getComputedStyle(viewport).paddingLeft) * 2
    const scale = Math.min((r.width - pad) / width, (r.height - pad) / height, 1)
    artboard.style.width = `${Math.max(1, Math.floor(width * scale))}px`
    artboard.style.height = `${Math.max(1, Math.floor(height * scale))}px`
    sizeInfo.textContent = `${width} × ${height} · ${Math.round(scale * 100)}% · seed ${s.doc.artboard.seed}`
  }
  new ResizeObserver(fit).observe(viewport)

  // ── props rail ───────────────────────────────────────────────────────────
  const collapsed = new Set<string>()

  function section(name: string, ...children: HTMLElement[]) {
    const id = `sec-${slug(name)}`
    const open = !collapsed.has(name)
    const body = h('div', { class: 'props-body', id, hidden: !open }, ...children)
    const head = h('button', { class: 'props-head', 'aria-expanded': String(open), 'aria-controls': id }, name)
    head.addEventListener('click', () => {
      const nowOpen = body.hidden
      body.hidden = !nowOpen
      head.setAttribute('aria-expanded', String(nowOpen))
      nowOpen ? collapsed.delete(name) : collapsed.add(name)
    })
    return h('section', { class: 'props-section' }, head, body)
  }

  function buildProps() {
    const t = tool()
    const p = params()
    const ev = { set: setParam, commit: () => s.commit(), error: (m: string) => toast(m, true) }
    const bySection = new Map<string, HTMLElement[]>()
    for (const spec of t.params) {
      const list = bySection.get(spec.section) ?? []
      list.push(control(spec, p[spec.key], ev))
      bySection.set(spec.section, list)
    }
    const reset = h('div', { class: 'props-reset' }, h('button', { class: 'btn btn-tertiary', onclick: resetTool }, `Reset ${t.name} settings`))
    toolBox.replaceChildren(...[...bySection].map(([name, els]) => section(name, ...els)), reset)
    applyVisibility(toolBox, t.params, p)
  }

  /** Rebuild the artboard block only when it shows something out of date. */
  let shownArtboard = ''
  function syncArtboard(force = false) {
    const ab = s.doc.artboard
    const swatch = ab.background === 'transparent' ? 'is-transparent' : ''
    artboardBtn.innerHTML = `<span class="ab-dot ${swatch}" style="${swatch ? '' : `background:${ab.background}`}"></span><span class="label">${ab.width} × ${ab.height}</span>${icon.chevronDown}`
    const key = JSON.stringify(ab)
    if (!force && key === shownArtboard) return
    // Never yank a control out from under a person mid-edit; a structural
    // change (undo, restore, open) always wins.
    if (!force && artboardBox.contains(document.activeElement)) {
      const seed = artboardBox.querySelector<HTMLInputElement>('input[aria-label="Seed"]')
      if (seed && seed !== document.activeElement) seed.value = String(s.doc.artboard.seed)
      return
    }
    shownArtboard = key
    artboardBox.replaceChildren(artboardSection())
  }

  function artboardSection() {
    const ab = s.doc.artboard
    const preset = h('select', { class: 'select', id: 'artboard-size' },
      ...ARTBOARDS.map((a) => h('option', { value: a.id, selected: a.id === ab.preset }, `${a.label} · ${a.width}×${a.height}`)),
      h('option', { value: 'custom', selected: ab.preset === 'custom' }, 'Custom size'))
    const w = h('input', { class: 'input', type: 'number', min: 16, max: 8000, value: String(ab.width), 'aria-label': 'Width in pixels' })
    const hh = h('input', { class: 'input', type: 'number', min: 16, max: 8000, value: String(ab.height), 'aria-label': 'Height in pixels' })
    const custom = h('div', { class: 'seed-row', hidden: ab.preset !== 'custom' }, w, hh)
    preset.addEventListener('change', () => {
      const a = ARTBOARDS.find((x) => x.id === preset.value)
      custom.hidden = preset.value !== 'custom'
      setArtboard(a ? { preset: a.id, width: a.width, height: a.height } : { preset: 'custom' })
    })
    const dim = (input: HTMLInputElement, key: 'width' | 'height') =>
      input.addEventListener('change', () => {
        const n = Math.round(Math.min(8000, Math.max(16, Number(input.value) || 16)))
        input.value = String(n)
        setArtboard({ [key]: n })
      })
    dim(w, 'width')
    dim(hh, 'height')

    const seed = h('input', { class: 'input', type: 'number', min: 0, max: 999999, value: String(ab.seed), 'aria-label': 'Seed' })
    seed.addEventListener('change', () => setArtboard({ seed: Math.max(0, Math.round(Number(seed.value) || 0)) }))
    const roll = h('button', { class: 'btn btn-secondary btn-icon', 'aria-label': 'New seed', 'data-tip': 'New seed', html: icon.shuffle })
    roll.addEventListener('click', randomise)

    const bg = colourPicker('background', ab.background, {
      set: (_k, v, transient) => setArtboard({ background: String(v) }, transient),
    })
    const lbl = (text: string, el: HTMLElement, forId?: string) =>
      h('div', { class: 'field' }, h('label', { class: 'field-label', for: forId }, text), el)
    return h('div', { class: 'popover-body' },
      h('p', { class: 'popover-title' }, 'Artboard', h('span', { class: 'props-head-note' }, 'Every tool')),
      lbl('Size', h('div', { class: 'field' }, preset, custom), 'artboard-size'),
      lbl('Background', bg),
      lbl('Seed', h('div', { class: 'seed-row' }, seed, roll)))
  }

  // ── actions ──────────────────────────────────────────────────────────────
  function switchTool(id: string) {
    if (id === s.doc.tool) return
    s.update((d) => {
      d.tool = id
    }, { kind: 'structure' })
    const url = new URL(location.href)
    url.searchParams.set('tool', id)
    history.replaceState(null, '', url)
  }

  function randomise() {
    setArtboard({ seed: freshSeed() })
  }

  function resetTool() {
    const t = tool()
    s.update((d) => {
      d.params[t.id] = defaultParams(t)
    }, { kind: 'structure' })
    toast(`${t.name} is back to its defaults.`)
  }

  async function save(forcePicker = false) {
    s.commit()
    try {
      const res = await saveFile(s.doc, forcePicker)
      if (res === 'cancelled') return
      lastSaved = JSON.stringify(s.doc)
      void addVersion(s.doc)
      void clearRecovery(s.doc.docId)
      toast(res === 'downloaded' ? 'Downloaded. Open that file to keep working on it.' : `Saved to ${currentFileName() ?? 'file'}.`)
      paintChrome()
    } catch (err) {
      console.error(err)
      toast('Could not save. Try Save as, or check browser permissions.', true)
    }
  }

  const fileName = () => `${slug(s.doc.title)}-${tool().id}`

  const exportItems: [string, string, () => Promise<unknown>, (() => boolean)?][] = [
    ['SVG', 'vector', () => exportSvg(result!.svg, fileName())],
    ['PNG', '1×', () => exportPng(result!.svg, s.doc.artboard.width, s.doc.artboard.height, 1, fileName())],
    ['PNG', '2×', () => exportPng(result!.svg, s.doc.artboard.width, s.doc.artboard.height, 2, fileName())],
    ['PNG', '4×', () => exportPng(result!.svg, s.doc.artboard.width, s.doc.artboard.height, 4, fileName())],
    ['Text', '.txt', () => exportText(result!.text!, fileName()), () => !!result?.text],
    ['Copy SVG', 'clipboard', () => copySvg(result!.svg).then(() => toast('SVG copied.'))],
    ['Save file as…', '⇧⌘S', () => save(true)],
  ]

  function buildMenu() {
    menu.replaceChildren()
    exportItems.forEach(([label, sub, run, enabled], i) => {
      if (i === exportItems.length - 1) menu.append(h('hr'))
      const b = h('button', { role: 'menuitem', disabled: enabled ? !enabled() : false }, label, h('kbd', {}, sub))
      b.addEventListener('click', async () => {
        closeMenu()
        if (!result) return
        try {
          await run()
        } catch (err) {
          console.error(err)
          toast('Export failed. Try a smaller PNG size.', true)
        }
      })
      menu.append(b)
    })
  }
  const closeMenu = () => {
    menu.hidden = true
    exportBtn.setAttribute('aria-expanded', 'false')
  }
  exportBtn.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu()
    closeArtboard()
    buildMenu()
    menu.hidden = false
    exportBtn.setAttribute('aria-expanded', 'true')
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  })
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node) && !exportBtn.contains(e.target as Node)) closeMenu()
  })
  menu.addEventListener('keydown', (e) => {
    const items = [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') items[(i + 1) % items.length]?.focus()
    else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus()
    else if (e.key === 'Escape') {
      closeMenu()
      exportBtn.focus()
    } else return
    e.preventDefault()
  })

  // ── artboard popover ───────────────────────────────────────────────────
  const closeArtboard = (focusBtn = false) => {
    if (artboardBox.hidden) return
    artboardBox.hidden = true
    artboardBtn.setAttribute('aria-expanded', 'false')
    if (focusBtn) artboardBtn.focus()
  }
  artboardBtn.addEventListener('click', () => {
    if (!artboardBox.hidden) return closeArtboard()
    closeMenu()
    syncArtboard(true)
    artboardBox.hidden = false
    artboardBtn.setAttribute('aria-expanded', 'true')
    artboardBox.querySelector<HTMLElement>('select, input, button')?.focus()
  })
  document.addEventListener('pointerdown', (e) => {
    if (!artboardBox.contains(e.target as Node) && !artboardBtn.contains(e.target as Node)) closeArtboard()
  })
  artboardBox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeArtboard(true)
    }
  })

  // ── theme ────────────────────────────────────────────────────────────────
  // No toggle of its own: Canvas follows Foundry's setting live, as Deck does.
  // Flipping it in a Foundry tab reaches this window through the storage event.
  const media = matchMedia('(prefers-color-scheme: dark)')
  const syncTheme = () => {
    const f = store(FOUNDRY_THEME_KEY)
    document.documentElement.dataset.theme = f === 'light' || f === 'dark' ? f : media.matches ? 'dark' : 'light'
  }
  addEventListener('storage', (e) => { if (e.key === FOUNDRY_THEME_KEY || e.key === null) syncTheme() })
  media.addEventListener('change', syncTheme)

  // ── chrome state ─────────────────────────────────────────────────────────
  function paintChrome() {
    const t = tool()
    toolsNav.querySelectorAll('.tool-btn').forEach((b) => {
      if ((b as HTMLElement).dataset.tool === t.id) b.setAttribute('aria-current', 'page')
      else b.removeAttribute('aria-current')
    })
    stageInfo.replaceChildren(h('span', { class: 'badge' }, t.group), h('span', { class: 'stage-blurb' }, t.blurb))
    undoBtn.disabled = !s.canUndo
    redoBtn.disabled = !s.canRedo
    const dirty = JSON.stringify(s.doc) !== lastSaved
    saveState.textContent = !lastSaved ? 'Not saved yet' : dirty ? 'Unsaved changes' : 'Saved'
    document.title = `${s.doc.title} · Canvas`
    if (title.value !== s.doc.title && document.activeElement !== title) title.value = s.doc.title
  }

  // ── wiring ───────────────────────────────────────────────────────────────
  let recoveryTimer = 0
  s.subscribe((kind: ChangeKind) => {
    if (kind === 'structure') buildProps()
    else if (kind === 'value') applyVisibility(toolBox, tool().params, params())
    if (kind !== 'meta') syncArtboard(kind === 'structure')
    paintChrome()
    if (kind !== 'meta') queueRender()
    clearTimeout(recoveryTimer)
    recoveryTimer = window.setTimeout(() => void putRecovery(s.doc), 800)
  })

  title.addEventListener('input', () => s.update((d) => (d.title = title.value.trim() || 'Gitwork artwork'), { transient: true, kind: 'meta' }))
  title.addEventListener('change', () => s.commit())
  title.addEventListener('keydown', (e) => e.key === 'Enter' && title.blur())
  undoBtn.addEventListener('click', () => s.undo())
  redoBtn.addEventListener('click', () => s.redo())
  shuffleBtn.addEventListener('click', randomise)
  saveBtn.addEventListener('click', () => save())

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey
    const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault()
      save(e.shiftKey)
    } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault()
      e.shiftKey ? s.redo() : s.undo()
    } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
      e.preventDefault()
      s.redo()
    } else if (!mod && !typing && e.key.toLowerCase() === 'r') {
      randomise()
    } else if (!mod && !typing && (e.key === '[' || e.key === ']')) {
      const i = TOOLS.findIndex((t) => t.id === s.doc.tool)
      switchTool(TOOLS[(i + (e.key === ']' ? 1 : TOOLS.length - 1)) % TOOLS.length].id)
    }
  })

  window.addEventListener('beforeunload', (e) => {
    if (lastSaved && JSON.stringify(s.doc) !== lastSaved) e.preventDefault()
  })

  // ── recovery: same idea as Deck. A hosted (unsaved) shell remembers the last
  //    doc it worked on, so a refresh never silently loses an artwork. ────────
  async function offerRecovery() {
    const lastId = opts.embedded ? s.doc.docId : store(LAST_DOC_KEY)
    store(LAST_DOC_KEY, s.doc.docId)
    if (!lastId) return
    const snap = await getRecovery(lastId)
    if (!snap || snap.json === JSON.stringify(s.doc)) return
    const when = new Date(snap.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    const restore = h('button', { class: 'btn btn-primary' }, 'Restore')
    const discard = h('button', { class: 'btn btn-secondary' }, 'Discard')
    alert.replaceChildren(h('span', {}, `Unsaved work on “${snap.title}” from ${when} was found.`), h('div', { class: 'alert-actions' }, discard, restore))
    alert.hidden = false
    restore.addEventListener('click', () => {
      alert.hidden = true
      const restored = parseDoc(snap.json, s.doc.tool)
      if (!restored) return toast('That snapshot could not be read.', true)
      s.replace(restored)
      store(LAST_DOC_KEY, restored.docId)
      toast('Restored.')
    })
    discard.addEventListener('click', () => {
      alert.hidden = true
      void clearRecovery(lastId)
    })
  }

  buildProps()
  syncArtboard(true)
  paintChrome()
  renderNow()
  void offerRecovery()

  // For tests and the console.
  ;(window as any).canvasApp = { store: s, switchTool, render: renderNow, result: () => result }
}
