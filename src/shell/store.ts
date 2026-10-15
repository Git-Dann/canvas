// Document state with undo/redo. Slider drags are "transient": they update the
// artwork live but only land on the undo stack once, when the drag ends.

import type { CanvasDoc } from '../core/doc'

export type ChangeKind =
  /** Values changed; controls already show them (a drag, a typed value). */
  | 'value'
  /** Structure changed: tool switch, undo, restore. Controls must rebuild. */
  | 'structure'
  /** Title only. */
  | 'meta'

type Listener = (kind: ChangeKind) => void

const MAX_HISTORY = 200

export class Store {
  doc: CanvasDoc
  private past: string[] = []
  private future: string[] = []
  private pendingBase: string | null = null
  private listeners = new Set<Listener>()

  constructor(doc: CanvasDoc) {
    this.doc = doc
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(kind: ChangeKind) {
    for (const fn of this.listeners) fn(kind)
  }

  /**
   * Mutate the document. `transient` changes (mid-drag) are grouped into one
   * undo step that closes on the next commit() or non-transient update.
   */
  update(mutate: (doc: CanvasDoc) => void, opts: { transient?: boolean; kind?: ChangeKind } = {}) {
    const before = JSON.stringify(this.doc)
    if (opts.transient) {
      if (this.pendingBase === null) this.pendingBase = before
    } else {
      this.pushPast(this.pendingBase ?? before)
      this.pendingBase = null
    }
    mutate(this.doc)
    this.doc.modified = Date.now()
    this.emit(opts.kind ?? 'value')
  }

  /** Close an open transient group (slider released). */
  commit() {
    if (this.pendingBase === null) return
    if (this.pendingBase !== JSON.stringify(this.doc)) this.pushPast(this.pendingBase)
    this.pendingBase = null
  }

  private pushPast(json: string) {
    this.past.push(json)
    if (this.past.length > MAX_HISTORY) this.past.shift()
    this.future = []
  }

  get canUndo() {
    return this.past.length > 0 || this.pendingBase !== null
  }

  get canRedo() {
    return this.future.length > 0
  }

  undo() {
    this.commit()
    const prev = this.past.pop()
    if (!prev) return
    this.future.push(JSON.stringify(this.doc))
    this.doc = JSON.parse(prev)
    this.emit('structure')
  }

  redo() {
    const next = this.future.pop()
    if (!next) return
    this.past.push(JSON.stringify(this.doc))
    this.doc = JSON.parse(next)
    this.emit('structure')
  }

  /** Swap in a whole document (recovery restore), as one undoable step. */
  replace(doc: CanvasDoc) {
    this.commit()
    this.pushPast(JSON.stringify(this.doc))
    this.doc = doc
    this.emit('structure')
  }
}
