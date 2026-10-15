// Boot. Order matters: capture the pristine shell BEFORE anything touches the
// DOM, exactly as Deck does, so a save re-serialises a clean app around the doc.

import { capturePristine, readEmbeddedDoc } from '../kernel/src/save.ts'
import { configureApp } from '../kernel/src/app.ts'
import { pruneOld } from '../kernel/src/autosave.ts'
import { newDoc, parseDoc } from './core/doc'
import { freshSeed } from './core/rng'
import { DEFAULT_TOOL, TOOLS } from './tools'
import { injectFonts } from './shell/fonts'
import { mountApp } from './shell/app'
import './styles/tokens.css'
import './styles/components.css'
import './styles/shell.css'

configureApp({
  appName: 'Canvas',
  dataBlockId: 'canvas-doc',
  dataBlockMime: 'application/gitwork-canvas+json',
  fileSuffix: 'canvas',
})
capturePristine()
injectFonts()

const url = new URL(location.href)
const asked = url.searchParams.get('tool')
const startTool = TOOLS.some((t) => t.id === asked) ? asked! : DEFAULT_TOOL
const embedded = readEmbeddedDoc()
const parsed = embedded ? parseDoc(embedded, startTool) : null
// ?seed= pins the seed for a fresh artwork (handy for tests and shared links).
const seedParam = Number(url.searchParams.get('seed'))
const doc = parsed ?? newDoc(startTool, Number.isFinite(seedParam) && url.searchParams.has('seed') ? seedParam : freshSeed())
if (parsed && asked && TOOLS.some((t) => t.id === asked)) doc.tool = asked

mountApp(document.getElementById('app')!, doc, { embedded: !!parsed })
void pruneOld()
