/** A shared tag browser, with canonical names for matching aliases and keyboard navigation. */
import { interestsGroup } from "../seed/offered.ts";
import { tags as seedTags } from "../seed/vocabulary.ts";
import { api, reason, refused, type Suggestion } from "./api.ts";
import { button, fill, h } from "./dom.ts";

let nextId = 0;

const categories = [
  { key: "fandom", label: "Fandoms" },
  { key: "character", label: "Characters" },
  { key: "pairing", label: "Pairings" },
  { key: "interest", label: "Interests & activities" },
] as const;
type Category = typeof categories[number]["key"];

// Only label names whose place in the team's vocabulary is known. Suggestions
// and their identities still come from the API, including any additional tags.
const tagCategories = new Map<string, Category>();
for (const tag of seedTags) {
  if (tag.name === interestsGroup) continue;
  tagCategories.set(tag.name, tag.under?.includes(interestsGroup)
    ? "interest"
    : !tag.under?.length
      ? "fandom"
      : tag.under.length > 1
        ? "pairing"
        : "character");
}

export function tagPicker({ label, pick, say, selected = () => [] }: {
  label: string;
  /** Called with the tag the person chose. The API resolves aliases to their main tag. */
  pick: (tag: Suggestion) => unknown;
  /** Shows a message to the person. */
  say: (message: string) => void;
  /** Main tag identities already selected in the editor or discovery filters. */
  selected?: () => readonly string[];
}): HTMLElement {
  const id = `tag-picker-${(nextId += 1)}`;
  const input = h("input", {
    id,
    className: "input tag-search",
    type: "search",
    autocomplete: "off",
    placeholder: "Try Fern, sketch swaps, or 葬送…",
    maxLength: 64,
  });
  const list = h("ul", { id: `${id}-suggestions`, className: "suggestions tag-suggestions", ariaLabel: "Suggested tags" });
  input.setAttribute("aria-controls", list.id);
  const root = h("div", { className: "tag-picker" }, h("label", { className: "field-label", htmlFor: id, textContent: label }), input, list);
  let latest = 0;
  let choosing = false;
  let keepClosed = false;

  function options() {
    if (list.hidden || list.getAttribute("aria-busy") === "true") return [];
    return [...list.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
  }

  function close() {
    keepClosed = true;
    input.focus();
    keepClosed = false;
    latest += 1;
    list.hidden = true;
  }

  async function choose(tag: Suggestion) {
    if (choosing) return;
    choosing = true;
    latest += 1;
    input.disabled = true;
    list.inert = true;
    root.setAttribute("aria-busy", "true");
    try {
      const picked = await pick(tag);
      // The editor reports its own refusal and returns false; keep the query ready to retry.
      if (picked !== false) input.value = "";
    } catch (error) {
      say(error instanceof Error ? error.message : "That tag could not be selected. Try again.");
    } finally {
      choosing = false;
      input.disabled = false;
      list.inert = false;
      root.removeAttribute("aria-busy");
      if (root.isConnected) {
        keepClosed = true;
        input.focus();
        keepClosed = false;
        void suggest();
      }
    }
  }

  async function suggest() {
    if (choosing) return;
    const asked = (latest += 1);
    const text = input.value.trim();
    list.hidden = false;
    list.inert = true;
    list.setAttribute("aria-busy", "true");
    const result = await api.tags.suggest({ text });
    // Slower answers and answers from before a selection cannot replace the current list.
    if (asked !== latest) return;
    list.inert = false;
    list.removeAttribute("aria-busy");
    if (refused(result)) {
      fill(list, h("li", { className: "tag-empty", textContent: reason(result) }));
      return;
    }

    const chosen = new Set(selected());
    const mainTags = new Map<string, Suggestion>();
    for (const tag of result.tags) {
      if (tag.mainName === interestsGroup || chosen.has(tag.main)) continue;
      // Show each main tag once, preferring its own name when both it and an alias match.
      if (!mainTags.has(tag.main) || tag.tag === tag.main) mainTags.set(tag.main, tag);
    }
    const available = [...mainTags.values()];
    const matches = text ? available : [
      ...categories.flatMap((category) => available.filter((tag) => tagCategories.get(tag.mainName) === category.key).slice(0, 2)),
      ...available.filter((tag) => !tagCategories.has(tag.mainName)),
    ];
    const suggestions = matches.slice(0, text ? 12 : 8);
    fill(
      list,
      ...suggestions.map((tag) =>
        h(
          "li",
          {},
          button("", () => choose(tag), { className: "tag-option", ariaLabel: `Choose ${tag.mainName}` }),
        ),
      ),
      suggestions.length === 0
        ? h("li", {
            className: "tag-empty",
            textContent: "No more matching tags. Try a character, pairing, or activity from Frieren.",
          })
        : null,
    );
    // Build labels as text nodes so tag names cannot become markup.
    options().forEach((option, index) => {
      const tag = suggestions[index]!;
      const category = categories.find((item) => item.key === tagCategories.get(tag.mainName));
      fill(
        option,
        h(
          "span",
          {},
          h("span", { className: "tag-option-name", textContent: tag.mainName }),
          text && tag.tag !== tag.main ? h("span", { className: "tag-alias", textContent: `Also known as ${tag.name}` }) : null,
        ),
        category ? h("span", { className: "tag-category", textContent: category.label }) : null,
        h("span", { ariaHidden: "true", textContent: "+" }),
      );
    });
  }

  input.addEventListener("input", () => void suggest());
  input.addEventListener("focus", () => {
    if (!keepClosed) void suggest();
  });
  input.addEventListener("keydown", (event) => {
    // Enter and arrows belong to the input method while composing Japanese/Chinese text.
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (list.hidden) {
        void suggest().then(() => (event.key === "ArrowDown" ? options()[0] : options().at(-1))?.focus());
      } else {
        (event.key === "ArrowDown" ? options()[0] : options().at(-1))?.focus();
      }
    } else if (event.key === "Enter") {
      // A tag search inside another form must never submit that form.
      event.preventDefault();
      if (!list.hidden) options()[0]?.click();
    }
  });
  list.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = options();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? at + 1 : at - 1;
    if (next < 0 || next >= buttons.length) {
      keepClosed = true;
      input.focus();
      keepClosed = false;
    } else buttons[next]?.focus();
  });

  // Empty text is supported by the vocabulary API, so useful tags appear before the first keystroke.
  void suggest();
  return root;
}
