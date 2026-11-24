/** The same bio card is used in the live preview, public page, and discovery results. */
import { interestsGroup } from "../seed/offered.ts";
import type { Card, CardTag } from "./api.ts";
import { h } from "./dom.ts";

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

export function drawCard(card: Card, handle?: string): HTMLElement {
  const groups = groupCardTags(card.tags);
  // A saved bio's name is private. The alpha exposes only its public handle on the card.
  const identity = handle ? `@${handle}` : "Your name here";
  const article = h(
    "article",
    { className: "card bio-card", ariaLabel: handle ? `${identity}’s bio card` : "Your bio card preview" },
    h("div", { className: "card-identity" }, h("h2", { className: "card-name", textContent: identity })),
    h("div", { className: "card-divider", ariaHidden: "true" }),
    h(
      "div",
      { className: "card-tags" },
      ...groups.map((group) =>
        h(
          "section",
          { className: "card-tag-group" },
          h("h3", { className: "card-group-label", textContent: group.title }),
          h("ul", { className: "card-tag-list" }, ...group.tags.map((tag) => h("li", { className: "card-tag", textContent: tag.name }))),
        ),
      ),
      groups.length === 0
        ? h("p", { className: "card-empty" }, "A favorite character. A niche pairing.", h("br"), "Add some tags and make yourself at home.")
        : null,
    ),
  );
  article.dataset.layout = card.look.layout ?? "";
  article.dataset.font = card.look.font ?? "";
  article.dataset.palette = card.look.palette ?? "";
  return article;
}
