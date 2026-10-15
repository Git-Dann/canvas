---
name: single-file-studio
description: Start a new Gitwork single-file studio app (like Canvas or Foundry Deck) for a different kind of tool suite - e.g. chart makers, icon builders, QR or badge generators, type specimens, colour tools. Use when the user wants another suite of browser tools with the same structure, saving, UI and brand, rather than a tool inside Canvas.
---

# A new single-file studio

Canvas is the template. Its structure separates three layers so you can lift the first two unchanged:

| Layer | Folder | Reuse |
|---|---|---|
| Kernel: self-saving file, recovery, versions | `kernel/` | Copy as is. Call `configureApp({ appName, dataBlockId, dataBlockMime, fileSuffix })` with new ids |
| Shell: frame, store with undo, controls from params, exports, theme, fonts, tokens | `src/shell/`, `src/styles/` | Copy, rename the wordmark in `shell/app.ts`, keep the CSS |
| Content: the tools and the doc model | `src/tools/`, `src/core/doc.ts` | Replace |

## Steps

1. Ask only what you can't infer: the suite name and two or three first tools. Pick everything else.
2. New repo, copy `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `kernel/`, `src/shell/`, `src/styles/`, `src/core/` (types, svg, rng, palette, raster), `scripts/`, `templates/`, `.claude/skills/`.
3. Change `configureApp` ids in `src/main.ts`, the `<title>` and wordmark, `DOC_FORMAT` in `core/doc.ts`, and the recovery DB name in `kernel/src/autosave.ts`, so files from different studios never mix.
4. If the output is not SVG (for example a table, audio or a 3D scene), keep the `Tool` contract but change `RenderResult` and the stage in `shell/app.ts`; keep the params-to-controls pattern, it is the main time saver.
5. Write the first tools with `canvas-new-tool`, keep the brand with `canvas-brand`, ship with `canvas-ship`.
