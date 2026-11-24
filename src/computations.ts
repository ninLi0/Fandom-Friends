/**
 * Small pure calculations the reactions use. A computation reads only its inputs: no state, no clock.
 * Each one is declared in the design document of the composition that uses it.
 */
import type { Tag } from "./concepts/Tagging/Tagging.ts";

/** The most tags one search may ask for. The request validator and the search rule both use it. */
export const mostSearchedTags = 10;

/** The tags a search asks for, each once, in the order first given. */
export function searchedTags({ tags }: { tags: Tag[] }): Tag[] {
  return [...new Set(tags)];
}

/**
 * The searched tag at one position. `found` is false when the search has fewer tags than that.
 * The search rule asks for positions 0 to mostSearchedTags - 1, which is how it visits every searched tag.
 */
export function searchedTagAt({ tags, at }: { tags: Tag[]; at: number }): { found: boolean; tag: Tag | null } {
  const tag = tags[at];
  return tag === undefined ? { found: false, tag: null } : { found: true, tag };
}
