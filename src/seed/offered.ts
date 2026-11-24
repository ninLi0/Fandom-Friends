/**
 * The names a bio's look may use, and the one tag that marks an interest.
 * This file is small on purpose: the pages import it, so it must not pull in the whole tag list.
 */

/** The fonts a bio may choose. The pages decide what each name looks like. */
export const fonts = ["Serif", "Sans", "Rounded", "Mono"] as const;

/** The color schemes a bio may choose. The pages decide what each name looks like. */
export const palettes = ["Parchment", "Midnight", "Sakura", "Forest", "Ocean", "Sunset"] as const;

/** The layouts a template may use. The pages decide how each one arranges a card. */
export const layouts = ["Stacked", "Two columns", "Spotlight", "poster", "columns", "minimal"] as const;

/** The one tag every interest lies under. A page uses it to list a bio's interests apart from its fandoms. */
export const interestsGroup = "Interests";
