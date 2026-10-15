// UI icons, drawn to the Untitled UI icon grid (24px, 2px stroke rendered at
// 20px). Kept inline so the single file needs no icon font.

const wrap = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

export const icon = {
  undo: wrap('<path d="M3 7v6h6"/><path d="M3.5 13A9 9 0 1 0 6 6.3L3 9"/>'),
  redo: wrap('<path d="M21 7v6h-6"/><path d="M20.5 13A9 9 0 1 1 18 6.3l3 2.7"/>'),
  shuffle: wrap('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
  save: wrap('<path d="M7 3v4.4c0 .3 0 .5.1.6a.6.6 0 0 0 .3.3l.6.1h7l.6-.1a.6.6 0 0 0 .3-.3l.1-.6V4m0 17v-6.4c0-.6 0-.9-.1-1.1a1 1 0 0 0-.4-.4c-.2-.1-.5-.1-1.1-.1H8.6c-.6 0-.9 0-1.1.1a1 1 0 0 0-.4.4C7 13.7 7 14 7 14.6V21M21 9.3v7.5c0 1.7 0 2.5-.3 3.2a3 3 0 0 1-1.3 1.3c-.7.3-1.5.3-3.2.3H7.8c-1.7 0-2.5 0-3.2-.3a3 3 0 0 1-1.3-1.3C3 19.3 3 18.5 3 16.8V7.2c0-1.7 0-2.5.3-3.2a3 3 0 0 1 1.3-1.3C5.3 3 6.1 3 7.8 3h7c.5 0 .7 0 1 .1l.5.2.7.6 3.2 3.2c.4.4.5.5.6.7l.2.6c.1.2.1.4.1.9Z"/>'),
  download: wrap('<path d="M21 15v1.2c0 1.7 0 2.5-.3 3.2a3 3 0 0 1-1.3 1.3c-.7.3-1.5.3-3.2.3H7.8c-1.7 0-2.5 0-3.2-.3a3 3 0 0 1-1.3-1.3C3 18.7 3 17.9 3 16.2V15m14-5-5 5m0 0-5-5m5 5V3"/>'),
  chevronDown: wrap('<path d="m6 9 6 6 6-6"/>'),
  sun: wrap('<path d="M12 2v2m0 16v2M4 12H2m4.3-5.7L4.9 4.9m12.8 1.4 1.4-1.4M6.3 17.7l-1.4 1.4m12.8-1.4 1.4 1.4M22 12h-2m-3 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"/>'),
  moon: wrap('<path d="M22 15.8A10 10 0 0 1 8.2 2a10 10 0 1 0 13.8 13.8Z"/>'),
  x: wrap('<path d="M18 6 6 18M6 6l12 12"/>'),
  upload: wrap('<path d="M4 16.2A4.5 4.5 0 0 1 6.5 8h.1a6 6 0 0 1 11.8 0h.1a4.5 4.5 0 0 1 2.5 8.2M8 16l4-4m0 0 4 4m-4-4v9"/>'),
  mark: `<svg viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 15c2.5-7 5-7 7 0s4.5 7 7 0"/></svg>`,
}

/** A tool's own icon body wrapped for the rail. */
export const toolIcon = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`
