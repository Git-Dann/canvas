// The tool registry. Order here is the order in the tool rail.
// `npm run new-tool <id>` adds new tools between the markers below.

import type { Tool } from '../core/types'
import { shapes } from './shapes'
import { infiniteLine } from './infinite-line'
import { flowField } from './flow-field'
import { contours } from './contours'
import { ridges } from './ridges'
import { tiles } from './tiles'
import { halftone } from './halftone'
import { ascii } from './ascii'
import { aura } from './aura'
// new-tool:imports

export const TOOLS: Tool[] = [
  shapes,
  infiniteLine,
  flowField,
  contours,
  ridges,
  tiles,
  halftone,
  ascii,
  aura,
  // new-tool:registry
]

export const DEFAULT_TOOL = 'shapes'

export function toolById(id: string): Tool {
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0]
}
