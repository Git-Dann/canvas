// SPDX-License-Identifier: MIT
// Adapted from Foundry Deck (vendor/bento/kernel/src/autosave.ts), © The Bento authors.
//
// Local auto-save and light version history in IndexedDB.
//   · recovery: one latest snapshot per docId, overwritten each cycle. On
//     reopen, if it differs from the file we loaded, the app offers a restore.
//   · versions: a capped, newest-first timeline per docId.
// Snapshots hold the document JSON only (a few KB), never the HTML shell.

import type { KernelDoc } from './doc.ts'

const DB_NAME = 'gitwork-canvas-autosave'
const DB_VERSION = 1
const RECOVERY = 'recovery'
const VERSIONS = 'versions'
const MAX_VERSIONS = 20
const PRUNE_DAYS = 30

export interface Snapshot {
  id?: number
  docId: string
  at: number
  title: string
  json: string
}

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      return resolve(null)
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(RECOVERY)) db.createObjectStore(RECOVERY, { keyPath: 'docId' })
      if (!db.objectStoreNames.contains(VERSIONS)) {
        const s = db.createObjectStore(VERSIONS, { keyPath: 'id', autoIncrement: true })
        s.createIndex('docId', 'docId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null
    return new Promise<T | null>((resolve) => {
      let t: IDBTransaction
      try {
        t = db.transaction(store, mode)
      } catch {
        return resolve(null)
      }
      const req = fn(t.objectStore(store))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => resolve(null)
    })
  })
}

const snap = (doc: KernelDoc): Snapshot => ({ docId: doc.docId, at: Date.now(), title: doc.title, json: JSON.stringify(doc) })

export async function putRecovery(doc: KernelDoc): Promise<void> {
  await tx(RECOVERY, 'readwrite', (s) => s.put(snap(doc)))
}

export async function getRecovery(docId: string): Promise<Snapshot | null> {
  return (await tx<Snapshot>(RECOVERY, 'readonly', (s) => s.get(docId))) ?? null
}

export async function clearRecovery(docId: string): Promise<void> {
  await tx(RECOVERY, 'readwrite', (s) => s.delete(docId))
}

export async function listVersions(docId: string): Promise<Snapshot[]> {
  const db = await openDb()
  if (!db) return []
  return new Promise((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction(VERSIONS, 'readonly')
    } catch {
      return resolve([])
    }
    const out: Snapshot[] = []
    const req = t.objectStore(VERSIONS).index('docId').openCursor(IDBKeyRange.only(docId))
    req.onsuccess = () => {
      const cur = req.result
      if (cur) {
        out.push(cur.value as Snapshot)
        cur.continue()
      } else resolve(out.sort((a, b) => b.at - a.at))
    }
    req.onerror = () => resolve([])
  })
}

export async function addVersion(doc: KernelDoc): Promise<void> {
  await tx(VERSIONS, 'readwrite', (s) => s.add(snap(doc)))
  const all = await listVersions(doc.docId)
  const doomed = all.slice(MAX_VERSIONS)
  await Promise.all(doomed.map((v) => tx(VERSIONS, 'readwrite', (s) => s.delete(v.id!))))
}

/** Drop snapshots older than PRUNE_DAYS across all docs. Best effort. */
export async function pruneOld(): Promise<void> {
  const cutoff = Date.now() - PRUNE_DAYS * 86_400_000
  const db = await openDb()
  if (!db) return
  for (const store of [VERSIONS, RECOVERY]) {
    try {
      const req = db.transaction(store, 'readwrite').objectStore(store).openCursor()
      req.onsuccess = () => {
        const cur = req.result
        if (!cur) return
        if ((cur.value as Snapshot).at < cutoff) cur.delete()
        cur.continue()
      }
    } catch {
      /* best effort */
    }
  }
}
