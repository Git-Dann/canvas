---
name: canvas-ship
description: Verify, build and ship Canvas - the verify gate, screenshots, single-file build, publishing the shell into Foundry at /canvas next to /deck, and opening a PR. Use when the user asks to test, build, deploy, publish, release or open a PR for Canvas.
---

# Ship Canvas

## Gate (always)

```bash
npm run verify   # typecheck, unit (renders every tool), single-file build, Playwright
```

Report what it actually printed. Then open the screenshots in `tests/screenshots/` (every tool, light and dark, 1440px, plus 375px) and look at them. Never call something verified that wasn't run.

## The build

`npm run build` writes `dist/index.html`: one file holding the app, styles, fonts and code, with zero external requests. That file is the product. Opened anywhere (file://, any static host), it works; saved with ⌘S, it becomes a `.canvas.html` artwork that reopens exactly.

## Publishing into Foundry (next to Deck)

Deck ships as `public/deck/index.html` in `Git-Dann/docs-by-gitwork`. Canvas ships the same way:

1. Clone `docs-by-gitwork` beside this repo (or set `FOUNDRY_PUBLIC` to its `public/` path).
2. `npm run build:foundry` writes `<foundry>/public/canvas/index.html`.
3. In Foundry, follow its `CLAUDE.md` (it is strict): allow `/canvas` in `src/middleware.ts` the way `/deck` is (members only), add it to `robots.ts`, list it on `src/app/context/page.tsx`, and run Foundry's `npm run verify`.
4. Commit the built shell in the same commit as any Canvas change, or production keeps the old one.

## Any static host

Vercel, Netlify or S3: serve `dist/`. No server code, no env vars.

## PRs

Branch, commit with a plain message, push, open a draft PR describing what changed, the verify output and a screenshot or two.
