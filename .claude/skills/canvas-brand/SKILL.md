---
name: canvas-brand
description: Gitwork Canvas brand and UI rules - Emergency Orange, Untitled UI v8 tokens from the Figma library, component classes and accessibility rules. Use before changing any shell UI, CSS, colours, palettes or adding controls in this repo, or when the user asks to apply the brand elsewhere.
---

# Canvas brand

Full reference: `docs/BRAND.md`. The short version:

## Sources

- **Tokens:** Untitled UI PRO VARIABLES v8.0, Figma file `eE8CjxDnMcBDg7Yj6KfF9Q`. CSS lives in `src/styles/tokens.css`, named exactly as the Figma variables (`Colors/Background/bg-primary` is `--color-bg-primary`). To check or refresh a value, use the Figma MCP (`search_design_system` with that file key, or `get_variable_defs` on a node).
- **Components:** Untitled UI components rebuilt as plain CSS in `src/styles/components.css` (button, input, select, toggle, slider, button group, dropdown, tooltip, badge, file upload, alert, toast). The app is framework-free like Foundry Deck, so the React components can't be used directly; match their sizes, radii, shadows and tokens instead.
- **Frame:** Foundry Deck's editor layout and its numbered `NN // SECTION` rail headers (`src/styles/shell.css`).

## Emergency Orange

| Step | Hex | Use |
|---|---|---|
| 500 | `#FF4F00` | The brand. Primary buttons, logo tile, slider fill, focus ring, active accents, the lead colour in artwork palettes |
| 600 | `#E64700` | Primary button hover (light mode) |
| 700 | `#C23A00` | Brand text on light surfaces (5.4:1 on white) |
| 400 | `#FF7633` | Brand text on dark surfaces, dark-mode hover |
| 50 / 100 | `#FFF2EB` / `#FFE2D1` | Selected nav, selected segment, soft backgrounds |

Full scale 25 to 950 in `tokens.css` and `src/core/palette.ts` (`EMERGENCY`).

**The one rule people break:** text on an orange fill is near-black (`--color-text-on-brand`, gray-950), never white. White on `#FF4F00` is 3.3:1 and fails WCAG AA; gray-950 is 6.0:1. This keeps the true orange on buttons instead of darkening it into brown.

## Rules

- Use semantic tokens (`--color-bg-primary`, `--color-text-secondary`), never primitives, in UI CSS. Primitives are for palettes and token definitions.
- Every new colour pair: check contrast with `contrast()` in `core/palette.ts`. Body text 4.5:1, large text and UI parts 3:1.
- Both themes, always. Dark mode is `:root[data-theme='dark']`; check both screenshots.
- Radius: controls `--radius-md` (8px), cards and drop zones `--radius-lg`, pills only for badges and toggles.
- Type: Inter for UI, JetBrains Mono for numbers, section headers and ASCII. Both embedded, zero external requests.
- Warnings use Untitled yellow, errors red. Never use orange to mean "warning": it is the brand.
- Copy: British English, sentence case, plain words, no em dashes.
- Phone width (375px): no sideways scroll. The e2e suite checks this.
