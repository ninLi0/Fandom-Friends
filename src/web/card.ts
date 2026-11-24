/** The same bio card is used in the live preview, public page, and discovery results. */
import { interestsGroup } from "../seed/offered.ts";
import type { Card, CardTag } from "./api.ts";
import { renderCard } from "./mvp-card.ts";
import type { Catalog } from "./mvp-types.ts";

export interface CardTagGroup {
  key: "fandom" | "character" | "pairing" | "interest";
  title: string;
  tags: CardTag[];
}

/** Classify the alpha's tag hierarchy without keeping a second catalog in the browser. */
export function groupCardTags(tags: readonly CardTag[]): CardTagGroup[] {
  const groups: CardTagGroup[] = [
    { key: "fandom", title: "My fandoms", tags: [] },
    { key: "character", title: "Favorite characters", tags: [] },
    { key: "pairing", title: "Pairings I love", tags: [] },
    { key: "interest", title: "Let’s connect over", tags: [] },
  ];

  for (const tag of tags) {
    // This root organizes interests; it is not itself a fan's interest.
    if (tag.name === interestsGroup) continue;
    const category = tag.under.some((parent) => parent.name === interestsGroup)
      ? "interest"
      : tag.under.length === 0
        ? "fandom"
        : tag.under.filter((parent) => parent.direct).length > 1
          ? "pairing"
          : "character";
    groups.find((group) => group.key === category)!.tags.push(tag);
  }

  return groups.filter((group) => group.tags.length > 0);
}

/** Render the same original card markup in the editor, public page, and search. */
export function drawCard(card: Card, handle?: string): HTMLElement {
  const groups = groupCardTags(card.tags);
  const catalog: Catalog = {
    tags: groups.flatMap((group) => group.tags.map((tag) => ({ id: tag.tag, name: tag.name, category: group.key, aliases: [], parents: [] }))),
    templates: [], fonts: [], palettes: [],
  };
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderCard({
    displayName: card.displayName, note: card.note, handle,
    tagIds: card.tags.map((tag) => tag.tag),
    look: { template: card.look.template ?? "", layout: card.look.layout ?? "poster", font: card.look.font ?? "Sans", palette: card.look.palette ?? "Ocean" },
  }, catalog);
  const article = wrapper.firstElementChild as HTMLElement;
  article.classList.add("card");
  return article;
}
