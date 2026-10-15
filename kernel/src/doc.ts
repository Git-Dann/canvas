// SPDX-License-Identifier: MIT
// Adapted from Foundry Deck (vendor/bento/kernel/src/doc.ts), © The Bento authors.
// The kernel document envelope: the ONLY doc fields kernel modules may read.

export interface KernelDoc {
  /** Stable uuid minted at creation, never regenerated. */
  docId: string
  /** Document title (window title, save filename). */
  title: string
}
