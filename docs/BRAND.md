# Brand and design system

## Source of truth

Untitled UI PRO VARIABLES v8.0, Figma file `eE8CjxDnMcBDg7Yj6KfF9Q`. Canvas uses its collections:

| Figma collection | In code |
|---|---|
| `_Primitives` (Gray / Neutral, Error, Warning, Success, plus the scales in palettes) | `src/styles/tokens.css` primitives, `src/core/palette.ts` |
| `1. Color modes` (Light mode, Dark mode) | Semantic tokens in `tokens.css`, dark under `:root[data-theme='dark']` |
| `2. Radius` | `--radius-*` |
| `3. Spacing` | `--spacing-*` |
| Effects / Shadows | `--shadow-*`, including the skeuomorphic button shadow |

Token names follow the Figma variable path: `Colors/Text/text-secondary (700)` is `--color-text-secondary`.

The Figma file's Brand scale is purple. Canvas replaces it with Emergency Orange. The file has no variable called "Emergency orange", so the scale below was defined for Canvas around `#FF4F00` (International Orange, the rescue and aerospace safety colour). If Gitwork has an official hex for it, change `--color-brand-*` in `tokens.css` and `EMERGENCY` in `palette.ts`; nothing else hard-codes it apart from the favicon and theme-color in `index.html`.

## Emergency Orange

| Step | Hex | White text | Gray-950 text |
|---|---|---|---|
| 25 | #FFF9F5 | | 19.0 |
| 50 | #FFF2EB | | 18.1 |
| 100 | #FFE2D1 | | 16.1 |
| 200 | #FFC4A3 | | 12.9 |
| 300 | #FF9E6B | 2.0 | 9.8 |
| 400 | #FF7633 | 2.7 | 7.4 |
| **500** | **#FF4F00** | 3.3 | **6.0** |
| 600 | #E64700 | 4.0 | 5.0 |
| 700 | #C23A00 | **5.4** | 3.7 |
| 800 | #962D00 | 7.9 | |
| 900 | #6E2200 | 11.1 | |
| 950 | #3D1300 | 16.3 | |

Contrast ratios against each text colour. Bold means it passes WCAG AA for body text.

So: orange fills carry near-black text. Orange text sits on light surfaces at 700 and on dark surfaces at 400.

## Components

Untitled UI's components are React. Canvas, like Deck, is framework-free so the whole studio fits in one saveable file. `src/styles/components.css` rebuilds the ones Canvas uses with the same tokens, sizes and states:

| Untitled component | Class |
|---|---|
| Button (primary, secondary, tertiary; sm, md; icon) | `.btn .btn-primary` etc. |
| Input, Textarea, Select (native) | `.input`, `.textarea`, `.select` |
| Toggle (sm) | `.toggle` |
| Slider | `.slider` |
| Button group | `.segmented` |
| Dropdown menu | `.menu` |
| Tooltip | `[data-tip]` |
| Badge (pill, brand) | `.badge` |
| File upload (compact) | `.dropzone` |
| Alert (floating) | `.alert` |
| Notification (simple) | `.toast` |

## Deck grammar

From Foundry Deck: numbered rail headers (`01 // SHAPE`) set in mono caps with a CSS counter, so numbering stays right as sections change. The number carries the brand colour.

## Artwork palettes

Defined in `src/core/palette.ts` from Untitled primitives. Emergency is the default everywhere. The lead colour (first) is used where a tool needs one ink.
