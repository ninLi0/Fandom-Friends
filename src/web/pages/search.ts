/**
 * The discovery page: the bios that are open to new friends, filtered by tag.
 * A bio must have every chosen tag. A tag under a chosen one counts, and so does another name of it.
 */
import { api, reason, refused, type Suggestion } from "../api.ts";
import { drawCard } from "../card.ts";
import { button, fill, h } from "../dom.ts";
import type { Page } from "../client.ts";
import { tagPicker } from "../tag-picker.ts";

export const searchPage: Page = ({ say, go }) => {
  /** The chosen filter tags. They are this page's own: searching never changes the searcher's bio. */
  let chosen: Suggestion[] = [];
  const chips = h("ul", { className: "tags" });
  const results = h("div", { className: "results" });

  async function search() {
    fill(
      chips,
      ...chosen.map((tag) =>
        h("li", {}, tag.mainName, " ", button("×", () => remove(tag), { ariaLabel: `Remove ${tag.mainName}` })),
      ),
    );
    const result = await api.search({ tags: chosen.map((tag) => tag.main) });
    if (refused(result)) return say(reason(result));
    say(result.people.length === 1 ? "1 person found." : `${result.people.length} people found.`);
    fill(
      results,
      ...result.people.map((person) => {
        const link = h("a", { href: `/u/${person.handle}`, textContent: "Open their page" });
        link.addEventListener("click", (event) => {
          event.preventDefault();
          go(`/u/${person.handle}`);
        });
        return h("div", { className: "result" }, drawCard(person.card, person.handle), link);
      }),
      result.people.length === 0
        ? h("p", { textContent: chosen.length === 0 ? "Nobody is open to new friends yet." : "Nobody has every one of these tags yet. Try fewer tags." })
        : null,
    );
  }

  function remove(tag: Suggestion) {
    chosen = chosen.filter((other) => other.main !== tag.main);
    return search();
  }

  function add(tag: Suggestion) {
    if (chosen.some((other) => other.main === tag.main)) return say(`${tag.mainName} is already chosen.`);
    if (chosen.length >= 10) return say("A search can use at most 10 tags.");
    chosen = [...chosen, tag];
    return search();
  }

  void search();
  return h(
    "section",
    { className: "search-page" },
    h("h1", { textContent: "Find friends" }),
    h("p", { textContent: "People appear here when they turn on Open to New Friends. Choose tags to narrow the list." }),
    tagPicker({ label: "Filter by tag", pick: add, say }),
    chips,
    results,
  );
};
