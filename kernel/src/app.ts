// SPDX-License-Identifier: MIT
// Adapted from Foundry Deck (vendor/bento/kernel/src/app.ts), © The Bento authors.
// Per-app identity. Every app calls configureApp() once at boot, before any
// kernel module is used.

export interface AppConfig {
  /** Human-facing product name: window-title suffix, save-picker label. */
  appName: string
  /** id of the <script> block that carries the document, e.g. 'canvas-doc'. */
  dataBlockId: string
  /** MIME type stamped on that block, e.g. 'application/gitwork-canvas+json'. */
  dataBlockMime: string
  /** Saved file suffix before .html, e.g. 'canvas' gives Title.canvas.html. */
  fileSuffix: string
}

let config: AppConfig | null = null

export function configureApp(cfg: AppConfig): void {
  config = cfg
}

/** Throws if the app forgot to configure itself: a loud failure at boot. */
export function appConfig(): AppConfig {
  if (!config) throw new Error('kernel: configureApp() was never called')
  return config
}
