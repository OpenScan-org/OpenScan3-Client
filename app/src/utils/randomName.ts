const adjectives = [
  'accurate',
  'calibrated',
  'detailed',
  'geared',
  'macro',
  'meshed',
  'micro',
  'pixelated',
  'precise',
  'scanned',
  'stitched',
  'textured',
  'triangulated',
  'trimmed',
  'ultra',
  'voxel',
  'wired',
  'zoomed'
];

const nouns = [
  'artifact',
  'bead',
  'figurine',
  'fragment',
  'gear',
  'miniature',
  'model',
  'mold',
  'object',
  'pebble',
  'replica',
  'relic',
  'sample',
  'specimen',
  'statue',
  'token',
  'trinket',
  'vessel'
];

function pick<T>(values: T[]): T {
  const index = Math.floor(Math.random() * values.length);
  return values[index];
}

export function generateDashedName(): string {
  return `${pick(adjectives)}-${pick(nouns)}`;
}

export default generateDashedName;
