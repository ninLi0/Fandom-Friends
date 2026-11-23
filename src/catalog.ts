import type { DatabaseSync } from 'node:sqlite';
import { Tagging } from './concepts/Tagging.js';
import { Synonymizing } from './concepts/Synonymizing.js';
import { Grouping } from './concepts/Grouping.js';
import { Templating } from './concepts/Templating.js';

export interface CatalogTag {
  id: string;
  name: string;
  category: 'fandom' | 'character' | 'pairing' | 'interest';
  aliases: string[];
  parents: string[];
}

type CharacterTag = CatalogTag & { category: 'character'; pairingName?: string };

const CHARACTER_TAGS: CharacterTag[] = [
  { id: 'frieren-character', name: 'Frieren (character)', pairingName: 'Frieren', category: 'character', aliases: ['フリーレン'], parents: ['frieren'] },
  { id: 'fern', name: 'Fern', category: 'character', aliases: ['フェルン'], parents: ['frieren'] },
  { id: 'stark', name: 'Stark', category: 'character', aliases: ['シュタルク'], parents: ['frieren'] },
  { id: 'himmel', name: 'Himmel', category: 'character', aliases: ['ヒンメル'], parents: ['frieren'] },
  { id: 'heiter', name: 'Heiter', category: 'character', aliases: ['ハイター'], parents: ['frieren'] },
  { id: 'eisen', name: 'Eisen', category: 'character', aliases: ['アイゼン'], parents: ['frieren'] },
  { id: 'serie', name: 'Serie', category: 'character', aliases: ['ゼーリエ'], parents: ['frieren'] },
];

// Keep the IDs and name order already used by saved bios and seeded aliases.
const LEGACY_PAIRINGS = new Map([
  ['fern:stark', { id: 'fern-stark', first: 'fern' }],
  ['frieren-character:himmel', { id: 'himmel-frieren', first: 'himmel' }],
]);

function generatePairings(characters: readonly CharacterTag[]): CatalogTag[] {
  const ordered = [...characters].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const pairings: CatalogTag[] = [];

  for (const [index, a] of ordered.entries()) {
    for (const b of ordered.slice(index + 1)) {
      const key = `${a.id}:${b.id}`;
      const legacy = LEGACY_PAIRINGS.get(key);
      const [first, second] = legacy?.first === b.id ? [b, a] : [a, b];
      const left = first.pairingName ?? first.name;
      const right = second.pairingName ?? second.name;
      pairings.push({
        id: legacy?.id ?? `pairing:${key}`,
        name: `${left} × ${right}`,
        category: 'pairing',
        // Alias positions are persisted, so append new spellings after these.
        aliases: [
          `${left}/${right}`, `${right}/${left}`,
          `${left} x ${right}`, `${right} × ${left}`, `${right} x ${left}`,
          `${left} ${right}`, `${right} ${left}`,
        ],
        parents: [first.id, second.id],
      });
    }
  }
  return pairings;
}

/** Curated tags with pairings derived from the character catalog. */
export const CATALOG_TAGS: CatalogTag[] = [
  { id: 'frieren', name: 'Frieren', category: 'fandom', aliases: ['Sousou no Frieren', '葬送のフリーレン', "Frieren: Beyond Journey's End"], parents: [] },
  ...CHARACTER_TAGS.map(({ pairingName, ...tag }) => tag),
  ...generatePairings(CHARACTER_TAGS),
  { id: 'sketch-swaps', name: 'Sketch swaps', category: 'interest', aliases: ['Art trades', 'Drawing swaps'], parents: ['fan-art'] },
  { id: 'episode-discussions', name: 'Episode discussions', category: 'interest', aliases: ['Episode chats', 'Anime discussions'], parents: [] },
  { id: 'fan-art', name: 'Fan art', category: 'interest', aliases: ['Fanart'], parents: [] },
  { id: 'fanfiction', name: 'Fanfiction', category: 'interest', aliases: ['Fan fiction', 'Fanfic'], parents: [] },
  { id: 'cosplay', name: 'Cosplay', category: 'interest', aliases: [], parents: [] },
  { id: 'manga-discussions', name: 'Manga discussions', category: 'interest', aliases: ['Manga chats'], parents: [] },
  { id: 'theories', name: 'Theories & analysis', category: 'interest', aliases: ['Theory crafting', 'Character analysis'], parents: [] },
  { id: 'watch-parties', name: 'Watch parties', category: 'interest', aliases: ['Watchalongs', 'Watch alongs'], parents: [] },
  { id: 'conventions', name: 'Conventions', category: 'interest', aliases: ['Anime cons'], parents: [] },
];

export const FONTS = ['Sans', 'Serif', 'Mono'] as const;
export const PALETTES = ['Ocean', 'Sunset', 'Forest'] as const;
export const TEMPLATES = [
  { id: 'poster', name: 'Convention poster', layout: 'poster', font: 'Sans', palette: 'Ocean' },
  { id: 'columns', name: 'Side by side', layout: 'columns', font: 'Serif', palette: 'Sunset' },
  { id: 'minimal', name: 'Quiet notes', layout: 'minimal', font: 'Mono', palette: 'Forest' },
] as const;

/** Safe to call on every startup; existing bios and presentation choices are untouched. */
export function seedCatalog(db: DatabaseSync): void {
  const tagging = new Tagging(db);
  const synonyms = new Synonymizing(db);
  const grouping = new Grouping(db);
  const templating = new Templating(db);
  const existing = new Set(tagging.all().map(tag => tag.id));
  for (const tag of CATALOG_TAGS) {
    if (!existing.has(tag.id)) tagging.define(tag.name, tag.id);
    for (const [index, alias] of tag.aliases.entries()) {
      const aliasId = `${tag.id}-alias-${index + 1}`;
      if (!existing.has(aliasId)) tagging.define(alias, aliasId);
      if (synonyms._canonical(aliasId) === aliasId) synonyms.link(aliasId, tag.id);
    }
    for (const parent of tag.parents) {
      if (!grouping._above(tag.id).some(row => row.broader === parent && row.direct)) grouping.place(tag.id, parent);
    }
  }
  const templates = new Set(templating._templates().map(template => template.template));
  for (const template of TEMPLATES) {
    if (!templates.has(template.id)) templating.define(template.name, template.layout, template.font, template.palette, template.id);
  }
  if (!templating._templates().some(template => template.default)) templating.makeDefault('poster');
}
