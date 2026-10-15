#!/usr/bin/env node
// Scaffold a tool: npm run new-tool -- <id> "<Name>" [Group]
// Creates src/tools/<id>.ts from templates/tool.ts.tmpl and registers it in
// src/tools/index.ts. The unit and e2e suites pick it up automatically.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const GROUPS = ['Shape', 'Line', 'Pattern', 'Type', 'Image', 'Colour']
const [id, name, group = 'Shape'] = process.argv.slice(2)

if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage: npm run new-tool -- <kebab-id> "<Display name>" [' + GROUPS.join('|') + ']')
  process.exit(1)
}
if (!GROUPS.includes(group)) {
  console.error(`Group must be one of: ${GROUPS.join(', ')}`)
  process.exit(1)
}
const file = `src/tools/${id}.ts`
if (existsSync(file)) {
  console.error(`${file} already exists`)
  process.exit(1)
}
const display = name || id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
const constName = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

writeFileSync(file, readFileSync('templates/tool.ts.tmpl', 'utf8')
  .replaceAll('__ID__', id).replaceAll('__NAME__', display).replaceAll('__CONST__', constName).replaceAll('__GROUP__', group))

const index = 'src/tools/index.ts'
let src = readFileSync(index, 'utf8')
src = src.replace('// new-tool:imports', `import { ${constName} } from './${id}'\n// new-tool:imports`)
src = src.replace('  // new-tool:registry', `  ${constName},\n  // new-tool:registry`)
writeFileSync(index, src)

const e2e = 'tests/e2e/app.spec.ts'
let spec = readFileSync(e2e, 'utf8')
spec = spec.replace(/const TOOLS = \[([^\]]*)\]/, (_, list) => `const TOOLS = [${list}, '${id}']`)
writeFileSync(e2e, spec)

console.log(`Created ${file}, registered it, and added it to the e2e list.
Next: write render(), set blurb and icon, then npm run verify.`)
