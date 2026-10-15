---
name: canvas-new-tool
description: Add a new generative artwork tool to Canvas (shape makers, line art, patterns, ASCII, image effects, gradients, any web-based design generator). Use whenever the user asks for a new tool, generator, effect or "something that makes X" in this repo, or to change an existing tool's params or output.
---

# Add a Canvas tool

A tool is one file in `src/tools/` that exports a `Tool` (contract in `src/core/types.ts`). The shell builds every control from the tool's `params`, so a tool never writes UI code. Saving, undo, recovery, export (SVG, PNG 1/2/4x, TXT, copy) and theming come free.

## Steps

1. **Pin the brief.** From the user's request, decide: the `id` (kebab-case, permanent, it is saved in files), display name, `group` (`Shape`, `Line`, `Pattern`, `Type`, `Image`, `Colour`), and the 4 to 12 params that matter most. Don't ask the user for these unless the request is truly ambiguous; pick and say what you picked.
2. **Scaffold.** `npm run new-tool -- <id> "<Name>" <Group>`. This creates `src/tools/<id>.ts` from `templates/tool.ts.tmpl`, registers it in `src/tools/index.ts` and adds it to `tests/e2e/app.spec.ts`.
3. **Write `render()`.** Read `.claude/skills/canvas-recipes/SKILL.md` first and reuse what's there. Rules:
   - Pure: no DOM, no `fetch`, no `Date`, never `Math.random`. All randomness from `input.rng` or `createNoise2D(input.seed)`.
   - Return `svgDoc({ width, height, background, body, defs?, style? })` from `core/svg.ts`.
   - Scale sizes to the artboard (`Math.min(width, height) / 1080`) so a 512px avatar and a 2400px hero look alike.
   - Group same-colour paths into one `<path>` (see `flow-field.ts`, `halftone.ts`). Keep output under ~5 MB at max params; add a point budget if needed (`POINT_BUDGET` in `flow-field.ts`).
   - Text output: also return `text` to enable TXT export (see `ascii.ts`). Text in SVG uses `JetBrains Mono` or `Inter`; export embeds the font automatically.
   - Images or set words: declare `rasters(p, artboard)`; read pixels with `core/raster.ts` (`lumCell`, `colorAt`). The shell loads them async and re-renders.
   - Animation: CSS inside the SVG only (`drawOnStyle()` in `core/svg.ts`), with a `prefers-reduced-motion` fallback.
4. **Params.** Reuse `src/tools/common.ts` (`paletteParam`, `strokeWidthParam`, `opacityParam`, `marginParam`, `animateParams`) so the same idea has the same label and range everywhere. Labels in plain British English, sentence case. Use `segmented` for 2 to 4 short options, `select` for more. Use `visibleIf` to hide params that don't apply. Defaults must look good on the default dark artboard with the Emergency palette, because that is the first thing anyone sees.
5. **Blurb and icon.** One plain sentence. Icon: 24x24 stroke paths only, no `<svg>` wrapper, matching the rail's 1.67 stroke.
6. **Verify.** `npm run verify` (typecheck, unit tests that render every tool at three sizes, every option and both param extremes, build, Playwright). Then look at `tests/screenshots/<id>-1440-light.png` and `-dark.png` yourself and fix anything ugly before calling it done.
7. **Document.** Add a row to the tools table in `README.md`.

## Done means

- `npm run verify` passes and you read its output.
- Screenshots looked at, defaults look intentional.
- No param key renamed on an existing tool (that breaks saved files). Add new keys instead; `sanitiseValue` fills defaults for old files.
