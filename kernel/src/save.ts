// SPDX-License-Identifier: MIT
// Adapted from Foundry Deck (vendor/bento/kernel/src/save.ts), © The Bento authors.
//
// Self-saving: the built file writes itself back to disk with new data.
// At boot, before the app touches the DOM, we deep-clone the document. On save
// we swap the clone's data block for the current model JSON and serialise the
// clone: byte-for-byte the same app shell, new document inside.

import type { KernelDoc } from './doc.ts'
import { appConfig } from './app.ts'

// Split so the literal never appears in the bundle (it would end the inline
// <script> that carries this very code inside a built file).
const SCRIPT_CLOSE = '</scr' + 'ipt>'

let pristine: Document | null = null

/** Call first thing at boot, before any DOM mutation. */
export function capturePristine(): void {
  pristine = document.cloneNode(true) as Document
}

/** The JSON body of the embedded document, or null for a fresh shell. */
export function readEmbeddedDoc(): string | null {
  const text = document.getElementById(appConfig().dataBlockId)?.textContent?.trim()
  return text || null
}

/** Serialise `doc` into a parsed app shell. Pure apart from cloning `shell`. */
export function serializeWith(shell: Document, doc: KernelDoc): string {
  const { dataBlockId, dataBlockMime, appName } = appConfig()
  const clone = shell.cloneNode(true) as Document
  let block = clone.getElementById(dataBlockId)
  if (!block) {
    block = clone.createElement('script')
    clone.head.appendChild(block)
  }
  block.setAttribute('type', dataBlockMime)
  block.id = dataBlockId
  // <-escape so the JSON can never contain a script close tag.
  block.textContent = '\n' + JSON.stringify(doc).replace(/</g, '\\u003c') + '\n'

  const titleEl = clone.querySelector('title')
  if (titleEl) titleEl.textContent = `${doc.title} · ${appName}`

  const html = '<!DOCTYPE html>\n' + clone.documentElement.outerHTML
  if (html.split(SCRIPT_CLOSE).length !== clone.querySelectorAll('script').length + 1) {
    console.warn('kernel: unexpected script-close count in serialised file')
  }
  return html
}

/** The full file content with `doc` embedded. */
export function serializeFile(doc: KernelDoc): string {
  if (!pristine) throw new Error('capturePristine() was not called at boot')
  return serializeWith(pristine, doc)
}

export function suggestedFileName(doc: KernelDoc, suffix = ''): string {
  const base = doc.title.replace(/[^\w\d-]+/g, '_').replace(/^_+|_+$/g, '') || 'Untitled'
  return `${base}${suffix ? `-${suffix}` : ''}.${appConfig().fileSuffix}.html`
}

// --- writing to disk --------------------------------------------------------

export type SaveResult = 'saved' | 'saved-as' | 'downloaded' | 'cancelled'

interface FsFileHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
  name: string
}

let fileHandle: FsFileHandle | null = null

const hasFsAccess = () => typeof (window as any).showSaveFilePicker === 'function'

async function pickHandle(name: string, description: string, accept: Record<string, string[]>): Promise<FsFileHandle | null> {
  try {
    return await (window as any).showSaveFilePicker({ suggestedName: name, types: [{ description, accept }] })
  } catch (err: any) {
    if (err?.name === 'AbortError') return null
    throw err
  }
}

async function writeHandle(handle: FsFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
}

/** Trigger a browser download of any blob. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Save the document. Chrome and Edge: File System Access API (picker on first
 * save, silent rewrite after). Firefox and Safari: download a copy.
 */
export async function saveFile(doc: KernelDoc, forcePicker = false): Promise<SaveResult> {
  const blob = new Blob([serializeFile(doc)], { type: 'text/html' })
  if (hasFsAccess()) {
    if (forcePicker || !fileHandle) {
      const handle = await pickHandle(suggestedFileName(doc), appConfig().appName, { 'text/html': ['.html'] })
      if (!handle) return 'cancelled'
      fileHandle = handle
      await writeHandle(handle, blob)
      return 'saved-as'
    }
    await writeHandle(fileHandle, blob)
    return 'saved'
  }
  downloadBlob(blob, suggestedFileName(doc))
  return 'downloaded'
}

/**
 * Export a derived file (SVG, PNG, TXT). Never becomes the save target, so the
 * next save can't overwrite an export with the full app.
 */
export async function exportFile(blob: Blob, name: string, description: string, ext: string): Promise<boolean> {
  if (!hasFsAccess()) {
    downloadBlob(blob, name)
    return true
  }
  const handle = await pickHandle(name, description, { [blob.type || 'application/octet-stream']: [ext] })
  if (!handle) return false
  await writeHandle(handle, blob)
  return true
}

export const currentFileName = (): string | null => fileHandle?.name ?? null
