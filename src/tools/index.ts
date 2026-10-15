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
import { phyllotaxis } from './phyllotaxis'
import { isometric } from './isometric'
import { starburst } from './starburst'
import { orbits } from './orbits'
import { waves } from './waves'
import { voronoi } from './voronoi'
import { dotGrid } from './dot-grid'
import { opArt } from './op-art'
import { hexGrid } from './hex-grid'
import { circleText } from './circle-text'
import { waveText } from './wave-text'
import { typeStack } from './type-stack'
import { monogram } from './monogram'
import { mosaic } from './mosaic'
import { dither } from './dither'
import { scanlines } from './scanlines'
import { stipple } from './stipple'
import { meshGradient } from './mesh-gradient'
import { linearGradient } from './linear-gradient'
import { colourBands } from './colour-bands'
import { paletteCards } from './palette-cards'
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
  phyllotaxis,
  isometric,
  starburst,
  orbits,
  waves,
  voronoi,
  dotGrid,
  opArt,
  hexGrid,
  circleText,
  waveText,
  typeStack,
  monogram,
  mosaic,
  dither,
  scanlines,
  stipple,
  meshGradient,
  linearGradient,
  colourBands,
  paletteCards,
  // new-tool:registry
]

export const DEFAULT_TOOL = 'shapes'

export function toolById(id: string): Tool {
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0]
}
