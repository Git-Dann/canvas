# kernel: the Deck backend, adapted for Canvas

This is the part of Foundry Deck's "backend" Canvas reuses. Deck is a fork of
[bento](https://github.com/nyblnet/bento) (MIT); its kernel is the app-agnostic
machinery every Bento app shares. Canvas takes the same three ideas, unchanged
in behaviour:

| File | What it does | Deck source |
|---|---|---|
| `src/app.ts` | Per-app identity (`configureApp`) | `vendor/bento/kernel/src/app.ts` |
| `src/doc.ts` | The `KernelDoc` envelope (`docId`, `title`) | `vendor/bento/kernel/src/doc.ts` |
| `src/save.ts` | Self-saving file: the built HTML holds the app **and** the document in a `<script type="application/gitwork-canvas+json" id="canvas-doc">` block. Save rewrites that block and writes the whole file back (File System Access API on Chrome/Edge, download elsewhere) | `vendor/bento/kernel/src/save.ts` |
| `src/autosave.ts` | IndexedDB recovery snapshot and capped version history per `docId` | `vendor/bento/kernel/src/autosave.ts` |

Deliberate differences from Deck's copy:

- The data block id, MIME type and file suffix come from `configureApp()` rather
  than constants, so the same kernel serves any Gitwork single-file app
  (`.canvas.html` here, `.deck.html` in Deck).
- Password encryption and signed self-update are left out. Canvas is served by
  its host and updates on redeploy, and artwork files hold nothing secret.
  Port them from Deck if that changes.

Rules carried over from Bento:

- Nothing in `kernel/` imports from `src/`. The direction is app to kernel only.
- The kernel never reads the app's content shape. It sees only `KernelDoc`.
- The data-block splice is file-format surface. Treat every byte as shipped.
