# Architecture

## What was reused from Foundry Deck

Deck (`Git-Dann/docs-by-gitwork`, `vendor/bento`, served at `/deck`) is a fork of Bento. Its trick: the built HTML file carries the runtime and the document. Save rewrites the document block inside a pristine copy of the page and writes the whole file back.

Canvas takes:

- **The kernel** (`kernel/`): pristine capture at boot, the data-block splice, File System Access save with download fallback, IndexedDB recovery and versions. Adapted so ids and file suffix come from `configureApp()`. Encryption and signed self-update were left out (see `kernel/README.md`).
- **The frame**: topbar, left rail, stage, right props rail with numbered widget headers, single-file Vite build with fonts embedded.

## Flow

```
URL / embedded doc ──► parseDoc ──► Store (undo, transient drags)
                                        │ change
                                        ▼
            tool.params ──► controls ──► Store.update
                                        │
     tool.rasters() ──► resolveRasters (async, cached) ──┐
                                        ▼                │
            tool.render({ params, width, height, rng, rasters }) ──► SVG string ──► stage
                                        │
                     export: SVG (fonts embedded) · PNG · TXT · copy
                     save:   kernel serialises doc into a clean copy of the page
```

## The document

`CanvasDoc` in `src/core/doc.ts`: `docId`, `title`, `tool`, `artboard` (size, background, seed), which is one setting for the whole document and shared by every tool, and `params` per tool, so switching tools keeps each tool's settings. The shell shows the artboard as a topbar dropdown (`#artboard-btn` / `#artboard-pop`), apart from any tool, and never rebuilds it on a tool switch. Values are sanitised against the tool's specs on every read, so files survive param changes. Uploaded images are stored as downscaled data URLs inside the file.

## Tests

- `tests/unit`: renders every tool at three sizes, every select option and both param extremes; checks valid SVG, no NaN, size limits, determinism, doc round-trip.
- `tests/e2e`: runs the built single file. Every tool in both themes (switched through Foundry's setting, as a person would), phone width, the artboard surviving every tool switch and a save, no control able to scroll the frame, undo, conditional fields, randomise, PNG export, and save then reopen the saved file to the identical artwork.
