# Canvas: guide for Claude Code

Canvas is a single-file generative art studio built on Foundry Deck's kernel and frame. Read `README.md` once, then use the skills. They are the reason the user doesn't have to re-explain anything:

| Task | Skill |
|---|---|
| Add or change a tool | `.claude/skills/canvas-new-tool` |
| Any UI, CSS, colour or palette work | `.claude/skills/canvas-brand` |
| Writing render code | `.claude/skills/canvas-recipes` |
| Test, build, publish, PR | `.claude/skills/canvas-ship` |
| A new suite of tools in a new repo | `.claude/skills/single-file-studio` |

## Hard rules

- Tools are pure: no DOM, no network, no clock, no `Math.random`. Seeded `rng` only.
- Never rename or reuse a saved param key, tool id or doc field. Saved files depend on them.
- `kernel/` never imports from `src/`.
- The build must stay one file with zero external requests.
- Text on Emergency Orange is near-black, never white (contrast).
- British English, sentence case, no em dashes in UI copy and docs.
- Run `npm run verify` before any PR and report what it printed. Look at the screenshots.
