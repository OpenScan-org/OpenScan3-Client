const adverbs = [
  'perfectly',
  'precisely',
  'cleanly',
  'clearly',
  'fully',
  'faithfully',
  'reliably',
  'consistently',
  'repeatably',
  'smoothly',
  'evenly',
  'automatically',
  'digitally'
];

const adjectives = [
  'scannable',
  'reconstructable',
  'digitalized',
  'digitized',
  'meshed',
  'textured',
  'aligned',
  'calibrated',
  'clean',
  'smooth',
  'sharp',
  'detailed',
  'accurate',
  'complete',
  'solid',
  'stable',
  'precise'
];

const nouns = [
  'artifact',
  'relic',
  'object',
  'thing',
  'specimen',
  'sample',
  'replica',
  'copy',
  'fragment',
  'shard',
  'figurine',
  'statuette',
  'miniature',
  'model',
  'mold',
  'vessel',
  'token',
  'trinket',
  'keepsake',
  'bead',
  'pebble',
  'vial',
  'totem',
  'part'
];

function pick<T>(values: T[]): T {
  const index = Math.floor(Math.random() * values.length);
  return values[index];
}

export function generateDashedName(): string {
  return `${pick(adverbs)}-${pick(adjectives)}-${pick(nouns)}`;
}

export default generateDashedName;
