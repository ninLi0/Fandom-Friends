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

/** Reviewed seed data, rather than user-generated or inferred equivalences. */
export const CATALOG_TAGS: CatalogTag[] = [
  { id: 'frieren', name: 'Frieren', category: 'fandom', aliases: ['Sousou no Frieren', '葬送のフリーレン', "Frieren: Beyond Journey's End"], parents: [] },
  { id: 'frieren-character', name: 'Frieren (character)', category: 'character', aliases: ['フリーレン'], parents: ['frieren'] },
  { id: 'fern', name: 'Fern', category: 'character', aliases: ['フェルン'], parents: ['frieren'] },
  { id: 'stark', name: 'Stark', category: 'character', aliases: ['シュタルク'], parents: ['frieren'] },
  { id: 'himmel', name: 'Himmel', category: 'character', aliases: ['ヒンメル'], parents: ['frieren'] },
  { id: 'heiter', name: 'Heiter', category: 'character', aliases: ['ハイター'], parents: ['frieren'] },
  { id: 'eisen', name: 'Eisen', category: 'character', aliases: ['アイゼン'], parents: ['frieren'] },
  { id: 'serie', name: 'Serie', category: 'character', aliases: ['ゼーリエ'], parents: ['frieren'] },
  { id: 'fern-stark', name: 'Fern × Stark', category: 'pairing', aliases: ['Fern/Stark', 'Stark/Fern', 'Fern x Stark', 'Stark × Fern'], parents: ['fern', 'stark'] },
  { id: 'himmel-frieren', name: 'Himmel × Frieren', category: 'pairing', aliases: ['Himmel/Frieren', 'Frieren/Himmel', 'Himmel x Frieren'], parents: ['himmel', 'frieren-character'] },
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
