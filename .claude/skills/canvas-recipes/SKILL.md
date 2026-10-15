---
name: canvas-recipes
description: Cookbook of reusable generative-art building blocks in Canvas (seeded random, noise, fbm, smooth paths, rounded polygons, marching squares contours, raster sampling, halftone marks, palettes, draw-on animation). Read before writing or changing any tool's render code, or when the user asks for a new algorithmic or generative effect.
---

# Canvas recipes

Reuse these before writing anything new. Each lives in one place; import it.

## Randomness and noise (`src/core/rng.ts`)

| Need | Use |
|---|---|
| Seeded random | `input.rng()`, `rng.range(a, b)`, `rng.int(a, b)`, `rng.pick(list)`, `rng.chance(p)`, `rng.gauss()` |
| Smooth 2D noise, -1..1 | `const noise = createNoise2D(seed); noise(x, y)` |
| Natural detail | `fbm(noise, x, y, octaves)` |
| Noise as a 0..1 tone with good contrast | `noiseTone(noise, x, y)` |
| Domain warp | offset `x, y` by `warp * fbm(noise, x + 5.2, y + 1.3)` (see `contours.ts`) |

Call rng in a fixed order. Adding an rng call earlier in render shifts every later value, which changes existing saved artworks. Add new random calls at the end, or use a separate `createRng(seed ^ 0xabc)`.

## Geometry and SVG (`src/core/svg.ts`)

| Need | Use |
|---|---|
| Document | `svgDoc({ width, height, background, body, defs, style })` |
| Element | `el('path', { d, fill, stroke })`; numbers are rounded to 2 dp by `f()` |
| Polyline | `linePath(points, closed)` |
| Smooth curve through points | `smoothPath(points, closed, tension)` (Catmull-Rom to cubic) |
| Polygon with rounded corners | `roundedPolygon(points, 0..1)` |
| Draw-on animation | `pathLength: 1`, `class: 'draw'`, `style: drawOnStyle(seconds)` |
| Fit any curve to a box | `fitPoints(points, innerBox(...))` from `tools/infinite-line.ts` |

## Ready-made algorithms

| Effect | Where |
|---|---|
| Polygon, star, superformula, blob points | `shapePoints()` in `tools/shapes.ts` |
| Harmonograph, spirograph, Lissajous, rose | `tracePoints()` in `tools/infinite-line.ts` |
| Particles following a noise field | `tools/flow-field.ts` |
| Contour lines from any value grid (joined polylines) | `contourLines(values, cols, rows, level)` in `tools/contours.ts` |
| Occluded ridge lines | `tools/ridges.ts` (fill each line down in the background colour) |
| Truchet and 10 PRINT tiles | `tools/tiles.ts` |
| Halftone marks on a rotated grid | `markPath()` in `tools/halftone.ts` |
| Brightness to characters | `asciiGrid()` and `CHARSETS` in `tools/ascii.ts` |
| Blur, grain and blend via SVG filters | `tools/aura.ts` |
| Depth-of-field blur by layer (never moves a line) | `tools/flow-field.ts` |
| Golden-angle spiral | `tools/phyllotaxis.ts` |
| Isometric projection with three shaded faces | `tools/isometric.ts` |
| Voronoi cells by half-plane clipping, Lloyd relaxation | `voronoiCells()` in `tools/voronoi.ts` |
| Hexagon grid, flat or pointy | `tools/hex-grid.ts` |
| Warping stripe boundaries around a lens | `tools/op-art.ts` |
| Text on a path (rings, waves) with `textPath` | `tools/circle-text.ts`, `tools/wave-text.ts` |
| Rows stretched to the measure with `textLength` | `tools/type-stack.ts` |
| Initials and a contrast-safe ink | `initials()` in `tools/monogram.ts`, `inkFor()` in `tools/common.ts` |
| One-bit dither (ordered, Floyd–Steinberg, Atkinson) | `ditherGrid()` in `tools/dither.ts` |
| Density sampling (stipple) | `tools/stipple.ts` |
| Mesh gradient from radial gradients | `tools/mesh-gradient.ts` |
| Image or noise source for any Image tool | `imageSourceParams()`, `imageRasters`, `toneSource()` in `tools/common.ts` |

## Colour (`src/core/palette.ts`)

`palette(id).colors` (lead colour first), `gradientAt(colors, t)`, `mix(a, b, t)`, `contrast(a, b)`. New palettes go in `PALETTES`, built from Untitled primitives plus `EMERGENCY`. Keep Emergency first in the list.

## Images and words (`src/core/raster.ts`)

Declare `rasters(p, artboard)` returning `{ key: { kind: 'image', src } }` or `{ key: { kind: 'text', text, weight, family, width, height } }`. In render, `input.rasters.key` is a `Raster` or null (still loading). Read with `lumCell(r, u0, v0, u1, v1)`, `lumAt`, `colorAt`, `fitRect`. Tests use `demoRaster()`.

## Performance budget

Render runs on every slider tick. Aim for under 50 ms at defaults. Batch paths by colour, cap point counts, and avoid per-element `<g>` wrappers.
