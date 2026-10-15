// A friendly name for a seed, so people pick between "Amber Fox" and "Quiet
// Harbour" rather than 217262 and 871944. Display only: the seed is still the
// number saved in the file. 48 × 48 = 2,304 names; the number shows beside the
// name, so a shared name is harmless.
//
// ⚠️ Never reorder or edit these lists. A name is derived from its position, so a
// change renames every saved artwork's variation.

const ADJECTIVES = [
  'Amber', 'Ash', 'Bold', 'Bright', 'Calm', 'Clear', 'Coral', 'Crisp',
  'Dawn', 'Deep', 'Dusky', 'Early', 'Ember', 'Fair', 'Fern', 'Fleet',
  'Gentle', 'Gilded', 'Golden', 'Hazel', 'Hidden', 'Ivory', 'Jade', 'Keen',
  'Late', 'Lucky', 'Lunar', 'Misty', 'Noble', 'Ochre', 'Pale', 'Quiet',
  'Rapid', 'Rosy', 'Russet', 'Sable', 'Silver', 'Slate', 'Soft', 'Solar',
  'Still', 'Swift', 'Tidal', 'Velvet', 'Vivid', 'Warm', 'Wild', 'Young',
]

const NOUNS = [
  'Arch', 'Bay', 'Birch', 'Brook', 'Canyon', 'Cedar', 'Cliff', 'Comet',
  'Cove', 'Crane', 'Delta', 'Dune', 'Echo', 'Falcon', 'Fern', 'Field',
  'Fjord', 'Flint', 'Fox', 'Glade', 'Grove', 'Harbour', 'Hare', 'Heron',
  'Hill', 'Isle', 'Kite', 'Lake', 'Lark', 'Marsh', 'Meadow', 'Moth',
  'Orbit', 'Otter', 'Peak', 'Pine', 'Quarry', 'Reef', 'Ridge', 'River',
  'Sparrow', 'Spire', 'Stone', 'Tide', 'Vale', 'Willow', 'Wren', 'Zephyr',
]

export function variationName(seed: number): string {
  const n = Math.abs(Math.floor(seed))
  return `${ADJECTIVES[n % ADJECTIVES.length]} ${NOUNS[Math.floor(n / ADJECTIVES.length) % NOUNS.length]}`
}
