/** The public page of one handle, at /u/<handle>. Anyone with the link can open it; no sign-in is needed. */
import { api, codeOf, reason, refused } from "../api.ts";
import { drawCard } from "../card.ts";
import { fill, h } from "../dom.ts";
import type { Page } from "../client.ts";

export function publicCardPage(typed: string): Page {
  // Handles are always lowercase, so a link typed with capitals still finds its page.
  const handle = typed.toLowerCase();
  return ({ say }) => {
    const section = h("section", {}, h("p", { textContent: "Loading…" }));
    void (async () => {
      const result = await api.cards.view({ handle });
      if (!refused(result)) return fill(section, drawCard(result.card, result.handle));
      if (codeOf(result) === "CARD_NOT_FOUND") {
        return fill(section, h("h1", { textContent: `@${handle}` }), h("p", { textContent: "Nobody is displaying a bio at this address right now." }));
      }
      fill(section);
      say(reason(result));
    })();
    return section;
  };
}
