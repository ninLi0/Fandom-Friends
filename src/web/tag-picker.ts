/**
 * A text box that suggests tags as a person types. The editor and the search page both use it.
 * Another name of a tag is shown with its main tag, as in "Sousou no Frieren (Frieren)".
 */
import { api, reason, refused, type Suggestion } from "./api.ts";
import { button, fill, h } from "./dom.ts";

let nextId = 0;

export function tagPicker({ label, pick, say }: {
  label: string;
  /** Called with the tag the person chose. */
  pick: (tag: Suggestion) => unknown;
  /** Shows a message to the person. */
  say: (message: string) => void;
}): HTMLElement {
  const id = `tag-picker-${(nextId += 1)}`;
  const input = h("input", { id, type: "search", autocomplete: "off", placeholder: "Type a tag, such as Frieren" });
  const list = h("ul", { className: "suggestions" });
  let latest = 0;

  async function suggest() {
    const asked = (latest += 1);
    const text = input.value.trim();
    if (text === "") return fill(list);
    const result = await api.tags.suggest({ text });
    // A slower, older answer must not replace a newer one.
    if (asked !== latest) return;
    if (refused(result)) return say(reason(result));
    fill(
      list,
      ...result.tags.slice(0, 8).map((tag) =>
        h(
          "li",
          {},
          button(tag.tag === tag.main ? tag.name : `${tag.name} (${tag.mainName})`, async () => {
            input.value = "";
            fill(list);
            await pick(tag);
            input.focus();
          }),
        ),
      ),
      result.tags.length === 0 ? h("li", { className: "quiet", textContent: "No tag matches." }) : null,
    );
  }

  input.addEventListener("input", () => void suggest());
  return h("div", { className: "tag-picker" }, h("label", { htmlFor: id, textContent: label }), input, list);
}
