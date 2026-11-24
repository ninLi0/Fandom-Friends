/**
 * The starter vocabulary: the tags, their other names, what lies under what, and the templates.
 *
 * The team maintains the characters and interests; every two characters generate a pairing. The server
 * loads this vocabulary at startup (see apply.ts) and only adds what is missing, so editing a name here
 * adds a new tag; it does not rename the old one.
 *
 * How the list is shaped:
 * - A fandom (a series) has nothing above it.
 * - A character lies under its series.
 * - A pairing lies under each of its characters, so it also counts as its series.
 * - An interest lies under the one tag "Interests".
 * Groups are placed between main tags only, never on another name of a tag.
 */
import { interestsGroup } from "./offered.ts";

// The fonts, color schemes, and layouts a look may use are in offered.ts, so the pages can import them alone.
export { fonts, interestsGroup, layouts, palettes } from "./offered.ts";

export interface SeedTag {
  /** The main name, shown on bios. Names in this file must all differ. */
  readonly name: string;
  /** Other names that mean the same tag. Picking one adds the main tag. */
  readonly alsoCalled?: readonly string[];
  /** The main names of the broader tags this one lies directly under. */
  readonly under?: readonly string[];
}

export interface SeedCharacter extends SeedTag {
  /** A shorter pairing label when the character's tag needs disambiguation from the series. */
  readonly pairingName?: string;
}

export interface SeedTemplate {
  readonly name: string;
  readonly layout: string;
  readonly font: string;
  readonly palette: string;
  /** The template a bio shows before its owner picks one. Exactly one template has this. */
  readonly default?: true;
}

export const templates: readonly SeedTemplate[] = [
  { name: "Classic", layout: "Stacked", font: "Serif", palette: "Parchment", default: true },
  { name: "Side by side", layout: "Two columns", font: "Sans", palette: "Midnight" },
  { name: "Favorites first", layout: "Spotlight", font: "Rounded", palette: "Sakura" },
  // Keep existing alpha templates intact while restoring the MVP editor's choices.
  { name: "Convention poster", layout: "poster", font: "Sans", palette: "Ocean" },
  { name: "Side by side (MVP)", layout: "columns", font: "Serif", palette: "Sunset" },
  { name: "Quiet notes", layout: "minimal", font: "Mono", palette: "Forest" },
];

const SERIES = "Frieren";

const INTERESTS = interestsGroup;

const character = (name: string, ...alsoCalled: string[]): SeedTag => ({ name, alsoCalled, under: [SERIES] });
const interest = (name: string, ...alsoCalled: string[]): SeedTag => ({ name, alsoCalled, under: [INTERESTS] });

/** Add a character here and every pairing involving it is generated below. */
export const characters: readonly SeedCharacter[] = [
  // The elf's tag is disambiguated, while her existing pairing names stay "Frieren/...".
  { ...character("Frieren (character)", "フリーレン"), pairingName: "Frieren" },
  character("Fern", "フェルン"),
  character("Stark", "シュタルク"),
  character("Himmel", "ヒンメル"),
  character("Heiter", "ハイター"),
  character("Eisen", "アイゼン"),
  character("Sein", "ザイン"),
  character("Flamme", "フランメ"),
  character("Serie", "ゼーリエ"),
  character("Übel", "Ubel", "ユーベル"),
  character("Land", "ラント"),
  character("Denken", "デンケン"),
  character("Wirbel", "ヴィアベル"),
  character("Kanne", "カンネ"),
  character("Lawine", "ラヴィーネ"),
  character("Methode", "メトーデ"),
  character("Aura", "Aura the Guillotine", "アウラ"),
  character("Lügner", "Lugner", "リュグナー"),
  character("Linie", "リーニエ"),
  character("Kraft", "クラフト"),
  character("Mimic", "ミミック"),
];

/** One tag for each unordered pair: n characters produce n(n-1)/2 pairings, in catalog order. */
export function generatePairings(characters: readonly SeedCharacter[]): SeedTag[] {
  const pairings: SeedTag[] = [];
  for (const [index, first] of characters.entries()) {
    for (const second of characters.slice(index + 1)) {
      const left = first.pairingName ?? first.name;
      const right = second.pairingName ?? second.name;
      const name = `${left}/${right}`;
      const asciiName = name.normalize("NFD").replace(/\p{M}/gu, "");
      pairings.push({
        name,
        alsoCalled: [...new Set([`${right}/${left}`, `${left} × ${right}`, asciiName])].filter((alias) => alias !== name),
        under: [first.name, second.name],
      });
    }
  }
  return pairings;
}

export const tags: readonly SeedTag[] = [
  // The series.
  {
    name: SERIES,
    alsoCalled: ["Sousou no Frieren", "Frieren: Beyond Journey's End", "葬送のフリーレン"],
  },

  ...characters.map(({ pairingName: _pairingName, ...tag }) => tag),
  ...generatePairings(characters),

  // Interests: what a person wants to do with other fans.
  { name: INTERESTS },
  interest("Sketch swaps", "Art trades"),
  interest("Episode discussions"),
  interest("Manga discussions"),
  interest("Fan art", "Fanart"),
  interest("Fanfiction", "Fanfic"),
  interest("Cosplay"),
  interest("Watch parties"),
  interest("Rewatch parties"),
  interest("Theories"),
  interest("Edits and AMVs", "AMVs"),
  interest("Figure collecting"),
];
