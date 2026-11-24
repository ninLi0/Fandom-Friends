/**
 * Draws a card: the same picture in the editor's preview, on the public page, and in search results.
 *
 * The look arrives as three names (layout, font, palette). This file puts them on the card as data attributes,
 * and the style sheet in index.html decides what each name looks like.
 */
import { interestsGroup } from "../seed/offered.ts";
import type { Card, CardTag } from "./api.ts";
import { h } from "./dom.ts";

/** The three lists a card shows. A tag under "Interests" is an interest; a tag under nothing is a fandom. */
function sort(tags: readonly CardTag[]) {
  const shown = tags.filter((tag) => tag.name !== interestsGroup);
  const isInterest = (tag: CardTag) => tag.under.some((broader) => broader.name === interestsGroup);
  return [
    { title: "Fandoms", tags: shown.filter((tag) => tag.under.length === 0) },
    { title: "Characters and pairings", tags: shown.filter((tag) => tag.under.length > 0 && !isInterest(tag)) },
    { title: "Interests", tags: shown.filter(isInterest) },
  ].filter((group) => group.tags.length > 0);
}

export function drawCard(card: Card, handle?: string): HTMLElement {
  const groups = sort(card.tags);
  const article = h(
    "article",
    { className: "card" },
    handle ? h("h2", { className: "card-handle", textContent: `@${handle}` }) : null,
    ...groups.map((group) =>
      h(
        "section",
        {},
        h("h3", { textContent: group.title }),
        h("ul", { className: "tags" }, ...group.tags.map((tag) => h("li", { textContent: tag.name }))),
      ),
    ),
    groups.length === 0 ? h("p", { className: "quiet", textContent: "No tags yet." }) : null,
  );
  article.dataset.layout = card.look.layout ?? "";
  article.dataset.font = card.look.font ?? "";
  article.dataset.palette = card.look.palette ?? "";
  return article;
}
