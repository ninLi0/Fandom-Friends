/**
 * The starter vocabulary: the tags, their other names, what lies under what, and the templates.
 *
 * This file is the hand-built list the team reviews. The server loads it at startup (see apply.ts) and only
 * ever adds what is missing, so editing a name here adds a new tag; it does not rename the old one.
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
const pairing = (name: string, of: readonly [string, string], ...alsoCalled: string[]): SeedTag => ({
  name,
  alsoCalled,
  under: of,
});
const interest = (name: string, ...alsoCalled: string[]): SeedTag => ({ name, alsoCalled, under: [INTERESTS] });

export const tags: readonly SeedTag[] = [
  // The series.
  {
    name: SERIES,
    alsoCalled: ["Sousou no Frieren", "Frieren: Beyond Journey's End", "葬送のフリーレン"],
  },

  // Characters. The elf shares her name with the series, so her tag says which one it is.
  character("Frieren (character)", "フリーレン"),
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

  // Pairings.
  pairing("Fern/Stark", ["Fern", "Stark"], "Fern × Stark", "Stark/Fern"),
  pairing("Frieren/Himmel", ["Frieren (character)", "Himmel"], "Frieren × Himmel", "Himmel/Frieren"),
  pairing("Übel/Land", ["Übel", "Land"], "Ubel/Land", "Übel × Land", "Land/Übel"),
  pairing("Kanne/Lawine", ["Kanne", "Lawine"], "Kanne × Lawine", "Lawine/Kanne"),

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
