// UI icons: the real Untitled UI paths (FlipBackward, FlipForward, Shuffle01,
// Save01, Download01, ChevronDown, XClose, UploadCloud01), 24px
// grid, 2px stroke. Kept inline so the single file needs no icon font.

const wrap = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

export const icon = {
  undo: wrap('<path d="M3 9h13.5a4.5 4.5 0 1 1 0 9H12M3 9l4-4M3 9l4 4"/>'),
  redo: wrap('<path d="M21 9H7.5a4.5 4.5 0 1 0 0 9H12m9-9-4-4m4 4-4 4"/>'),
  shuffle: wrap('<path d="m18 15 3 3m0 0-3 3m3-3h-2.431c-.94 0-1.409 0-1.835-.13a2.998 2.998 0 0 1-1.033-.552c-.345-.283-.605-.674-1.126-1.455l-.242-.363M18 3l3 3m0 0-3 3m3-3h-2.431c-.94 0-1.409 0-1.835.13a3 3 0 0 0-1.033.552c-.345.283-.605.674-1.126 1.455l-5.15 7.726c-.521.781-.782 1.172-1.126 1.455-.304.25-.655.438-1.033.552-.426.13-.896.13-1.835.13H3M3 6h2.431c.94 0 1.409 0 1.835.13a3 3 0 0 1 1.033.552c.344.283.605.674 1.126 1.455l.242.363"/>'),
  save: wrap('<path d="M7 3v3.4c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C7.76 8 8.04 8 8.6 8h6.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C17 7.24 17 6.96 17 6.4V4m0 17v-6.4c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C16.24 13 15.96 13 15.4 13H8.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C7 13.76 7 14.04 7 14.6V21M21 9.325V16.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V7.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C5.28 3 6.12 3 7.8 3h6.875c.489 0 .733 0 .963.055.204.05.4.13.579.24.201.123.374.296.72.642l3.126 3.126c.346.346.519.519.642.72.11.18.19.374.24.579.055.23.055.474.055.963Z"/>'),
  download: wrap('<path d="M21 15v1.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V15m14-5-5 5m0 0-5-5m5 5V3"/>'),
  chevronDown: wrap('<path d="m6 9 6 6 6-6"/>'),
  x: wrap('<path d="M18 6 6 18M6 6l12 12"/>'),
  upload: wrap('<path d="M4 16.242A4.5 4.5 0 0 1 6.08 8.02a6.002 6.002 0 0 1 11.84 0A4.5 4.5 0 0 1 20 16.242M8 16l4-4m0 0 4 4m-4-4v9"/>'),
  mark: `<svg viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 15c2.5-7 5-7 7 0s4.5 7 7 0"/></svg>`,
}

/** A tool's own icon body wrapped for the rail. */
export const toolIcon = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`
