/**
 * The picture a tag shows on a card, when it has one.
 *
 * Each picture is a link to an image at AniList (https://anilist.co), a public anime database. The app does not
 * copy or store these images: the browser loads each one from AniList when a card is drawn. They are official
 * art owned by their publishers, so a page that shows any of them also shows `pictureCredit`.
 *
 * The list is keyed by a tag's main name, as written in vocabulary.ts. A tag that is not listed has no picture
 * and the card draws it without one (a pairing shows the pictures of its two characters). Like offered.ts, this
 * file is small on purpose: the pages import it, so it must not pull in the whole tag list.
 */

export interface TagPicture {
  /** The image, loaded by the browser from AniList. */
  readonly image: string;
  /** The AniList page the picture comes from. */
  readonly page: string;
  /** A wide version, for a card with room for a banner. Only a series has one. */
  readonly wide?: string;
}

/** The line a page shows wherever it shows one of these pictures. */
export const pictureCredit = { text: "Pictures from AniList", page: "https://anilist.co" } as const;

export const tagPictures: Readonly<Record<string, TagPicture>> = {
  // The series.
  "Frieren": {
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg",
    page: "https://anilist.co/anime/154587",
    wide: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg",
  },

  // Characters. "Mimic" has no page at AniList, so it has no picture.
  "Frieren (character)": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png",
    page: "https://anilist.co/character/176754",
  },
  "Fern": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b183965-uGFohBjlFoTp.png",
    page: "https://anilist.co/character/183965",
  },
  "Stark": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b184313-CQl6GSt4RSny.jpg",
    page: "https://anilist.co/character/184313",
  },
  "Himmel": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b184311-wQFySqYXEqf1.png",
    page: "https://anilist.co/character/184311",
  },
  "Heiter": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b184310-tiXvrq4FINXP.jpg",
    page: "https://anilist.co/character/184310",
  },
  "Eisen": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b184312-kxd5H6iOHIq4.png",
    page: "https://anilist.co/character/184312",
  },
  "Sein": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b205177-hLV4nVQjoBIC.png",
    page: "https://anilist.co/character/205177",
  },
  "Flamme": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b219733-FgXseEhMdDE9.png",
    page: "https://anilist.co/character/219733",
  },
  "Serie": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b219734-aS4UMAb16DGd.jpg",
    page: "https://anilist.co/character/219734",
  },
  "Übel": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b246057-ixvDfpng6I1S.png",
    page: "https://anilist.co/character/246057",
  },
  "Land": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b321719-GUHhBOb81K9H.png",
    page: "https://anilist.co/character/321719",
  },
  "Denken": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b246058-FOtuSIUBQ4WJ.png",
    page: "https://anilist.co/character/246058",
  },
  "Wirbel": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b321716-ORxrJOHaI4H4.png",
    page: "https://anilist.co/character/321716",
  },
  "Kanne": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b293728-0ylNRoIOORcD.png",
    page: "https://anilist.co/character/293728",
  },
  "Lawine": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b293727-Jaf2eiNfINWx.png",
    page: "https://anilist.co/character/293727",
  },
  "Methode": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b246054-TKwFFWVGISUd.png",
    page: "https://anilist.co/character/246054",
  },
  "Aura": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b219110-LEB5T4oG0gel.png",
    page: "https://anilist.co/character/219110",
  },
  "Lügner": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b316985-YkCeSIfDF7U1.png",
    page: "https://anilist.co/character/316985",
  },
  "Linie": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b316986-spmwGktNwX3W.png",
    page: "https://anilist.co/character/316986",
  },
  "Kraft": {
    image: "https://s4.anilist.co/file/anilistcdn/character/large/b219732-GKmSY9oTm6cR.jpg",
    page: "https://anilist.co/character/219732",
  },
};

/** The picture of a tag, by its main name, or nothing when it has none. */
export function pictureOf(name: string): TagPicture | undefined {
  return Object.hasOwn(tagPictures, name) ? tagPictures[name] : undefined;
}

/**
 * The pictures a tag shows: its own, or, for a tag with none that lies directly under two or more tags,
 * theirs. So a pairing shows its two characters, while a character with no picture does not borrow its series'.
 */
export function picturesFor(name: string, under: readonly string[] = []): TagPicture[] {
  const own = pictureOf(name);
  if (own) return [own];
  if (under.length < 2) return [];
  return under.flatMap((parent) => pictureOf(parent) ?? []);
}
