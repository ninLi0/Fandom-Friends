/**
 * The bio editor: a person's saved bios, the tags and look of the one being edited, a live preview, and sharing.
 *
 * Every change is one request that answers with the updated card, so only the parts that changed are redrawn:
 * the page never reloads, and the keyboard focus stays where the person is working.
 */
import { fonts, palettes } from "../../seed/offered.ts";
import { api, reason, refused, type Card, type SavedBio, type Sharing, type Template } from "../api.ts";
import { drawCard } from "../card.ts";
import { button, fill, h } from "../dom.ts";
import type { Page } from "../client.ts";
import { tagPicker } from "../tag-picker.ts";

type Bio = SavedBio["bio"];

/** A labelled drop-down. */
function choice(id: string, label: string, options: readonly { value: string; label: string }[], change: (value: string) => unknown) {
  const select = h("select", { id }, ...options.map((option) => h("option", { value: option.value, textContent: option.label })));
  select.addEventListener("change", () => void change(select.value));
  return { select, row: h("div", { className: "row" }, h("label", { htmlFor: id, textContent: label }), select) };
}

export const editorPage: Page = ({ say, go }) => {
  let bios: SavedBio[] = [];
  let templates: Template[] = [];
  let sharing: Sharing = { handle: null, displayed: null, open: null };
  let current: { bio: Bio; name: string; card: Card } | undefined;

  const list = h("nav", { className: "bio-list", ariaLabel: "Saved bios" });
  const editing = h("div", { className: "editing" });
  const preview = h("div", { className: "preview" });
  const share = h("div", { className: "sharing" });
  /** Redraws the tags, the look choices, and the preview from the current card. Set when a bio is opened. */
  let showCard = () => {};

  /** Runs a request. Says why if it was refused; otherwise hands the answer on. */
  async function attempt<Answer extends object>(request: Promise<Answer>): Promise<Exclude<Answer, { error: unknown }> | undefined> {
    const result = await request;
    if (refused(result)) {
      say(reason(result));
      return undefined;
    }
    say("");
    return result as Exclude<Answer, { error: unknown }>;
  }

  /** Takes the card a change answered with and redraws what shows it. */
  function changed(answer: { card: Card } | undefined) {
    if (!answer || !current) return;
    current = { ...current, card: answer.card };
    showCard();
  }

  async function loadAll(open?: Bio) {
    const [saved, offered, status] = await Promise.all([api.bios.list({}), api.templates.list({}), api.sharing.status({})]);
    if (refused(saved)) return say(reason(saved));
    if (refused(offered)) return say(reason(offered));
    if (refused(status)) return say(reason(status));
    bios = saved.bios;
    templates = offered.templates;
    sharing = status.sharing;
    const next = open ?? current?.bio ?? sharing.displayed ?? bios[0]?.bio;
    if (next !== undefined && bios.some((saved) => saved.bio === next)) return openBio(next);
    current = undefined;
    drawList();
    drawEditing();
    drawSharing();
  }

  async function openBio(bio: Bio) {
    const viewed = await attempt(api.bios.view({ bio }));
    if (viewed) current = viewed;
    drawList();
    drawEditing();
    drawSharing();
  }

  async function refreshSharing() {
    const status = await attempt(api.sharing.status({}));
    if (status) sharing = status.sharing;
    drawList();
    drawSharing();
    showCard();
  }

  function drawList() {
    const name = h("input", { id: "new-bio-name", placeholder: "Frieren and sketch swaps", maxLength: 80 });
    const start = h("form", { className: "row" }, h("label", { htmlFor: "new-bio-name", textContent: "New bio" }), name, h("button", { type: "submit", textContent: "Start" }));
    start.addEventListener("submit", async (event) => {
      event.preventDefault();
      const started = await attempt(api.bios.start({ name: name.value }));
      if (!started) return;
      await loadAll(started.bio);
      say(`Started "${name.value}". Add tags to it below.`);
    });
    fill(
      list,
      h("h2", { textContent: "My bios" }),
      bios.length === 0 ? h("p", { textContent: "You have no bios yet. Name your first one to start." }) : null,
      h(
        "ul",
        {},
        ...bios.map((saved) =>
          h(
            "li",
            {},
            button(saved.name, () => openBio(saved.bio), { ariaPressed: String(saved.bio === current?.bio) }),
            saved.bio === sharing.displayed ? h("span", { className: "quiet", textContent: " (displayed)" }) : null,
          ),
        ),
      ),
      start,
    );
  }

  function drawEditing() {
    if (!current) {
      showCard = () => {};
      fill(editing);
      fill(preview);
      return;
    }
    const { bio, name } = current;

    const rename = h("input", { id: "bio-name", value: name, maxLength: 80 });
    const renameForm = h("form", { className: "row" }, h("label", { htmlFor: "bio-name", textContent: "Name" }), rename, h("button", { type: "submit", textContent: "Rename" }));
    renameForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!(await attempt(api.bios.rename({ bio, name: rename.value })))) return;
      await loadAll(bio);
      say("Renamed.");
    });

    const tags = h("ul", { className: "tags" });
    const picker = tagPicker({ label: "Add a tag", pick: async (tag) => changed(await attempt(api.bios.tags.add({ bio, tag: tag.tag }))), say });
    const template = choice("template", "Template", templates.map((offered) => ({ value: offered.template, label: offered.name })), async (value) =>
      changed(await attempt(api.bios.look.template({ bio, template: value as Template["template"] }))),
    );
    const font = choice("font", "Font", fonts.map((offered) => ({ value: offered, label: offered })), async (value) =>
      changed(await attempt(api.bios.look.font({ bio, font: value }))),
    );
    const palette = choice("palette", "Color scheme", palettes.map((offered) => ({ value: offered, label: offered })), async (value) =>
      changed(await attempt(api.bios.look.palette({ bio, palette: value }))),
    );

    showCard = () => {
      if (!current) return;
      const { card } = current;
      fill(
        tags,
        ...card.tags.map((tag) =>
          h(
            "li",
            {},
            tag.name,
            " ",
            button(
              "×",
              async () => {
                changed(await attempt(api.bios.tags.remove({ bio, tag: tag.tag })));
                // The pressed button is gone now, so put the focus somewhere useful.
                picker.querySelector("input")?.focus();
              },
              { ariaLabel: `Remove ${tag.name}` },
            ),
          ),
        ),
        card.tags.length === 0 ? h("li", { className: "quiet", textContent: "No tags yet." }) : null,
      );
      // After a refused change the choices go back to what is saved.
      template.select.value = card.look.template ?? "";
      font.select.value = card.look.font ?? "";
      palette.select.value = card.look.palette ?? "";
      fill(preview, h("h2", { textContent: "Preview" }), drawCard(card, sharing.handle ?? undefined));
    };

    fill(
      editing,
      h("h2", { textContent: `Editing "${name}"` }),
      renameForm,
      h("h3", { textContent: "Tags" }),
      tags,
      picker,
      h("h3", { textContent: "Look" }),
      template.row,
      font.row,
      palette.row,
      button("Use the template's own font and colors", async () => changed(await attempt(api.bios.look.reset({ bio })))),
      h("h3", { textContent: "Remove" }),
      button("Discard this bio", async () => {
        if (!confirm(`Discard "${name}"? This cannot be undone.`)) return;
        if (!(await attempt(api.bios.discard({ bio })))) return;
        current = undefined;
        await loadAll();
        say(`Discarded "${name}".`);
      }),
    );
    showCard();
  }

  function drawSharing() {
    if (sharing.handle === null) {
      const handle = h("input", { id: "handle", placeholder: "alice-draws", maxLength: 30 });
      const claim = h("form", { className: "row" }, h("label", { htmlFor: "handle", textContent: "Handle" }), handle, h("button", { type: "submit", textContent: "Claim" }));
      claim.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!(await attempt(api.sharing.claim({ handle: handle.value })))) return;
        await refreshSharing();
        say("The handle is yours. Display a bio to put it at your address.");
      });
      return fill(
        share,
        h("h2", { textContent: "Sharing" }),
        h("p", { textContent: "Claim a handle to get an address for your bio. Use 3 to 30 lowercase letters, digits, and hyphens." }),
        claim,
      );
    }

    const address = `/u/${sharing.handle}`;
    const link = h("a", { href: address, textContent: `${location.origin}${address}` });
    link.addEventListener("click", (event) => {
      event.preventDefault();
      go(address);
    });
    const displayedName = bios.find((saved) => saved.bio === sharing.displayed)?.name;
    const open = h("input", { id: "open", type: "checkbox", checked: sharing.open === true, disabled: sharing.displayed === null });
    open.addEventListener("change", async () => {
      const answer = open.checked ? await attempt(api.sharing.open({})) : await attempt(api.sharing.close({}));
      await refreshSharing();
      if (answer) say(answer.open ? "You are open to new friends. People can find your displayed bio by search." : "You are no longer open to new friends. Your link still works.");
      share.querySelector<HTMLInputElement>("#open")?.focus();
    });

    fill(
      share,
      h("h2", { textContent: "Sharing" }),
      h("p", {}, "Your address: ", link),
      h("p", { textContent: displayedName ? `Displayed bio: "${displayedName}". Only this bio is public.` : "No bio is displayed, so your address shows nothing yet." }),
      h(
        "div",
        { className: "row" },
        current && current.bio !== sharing.displayed
          ? button("Display This Bio", async () => {
              const { bio, name } = current!;
              const displayed = await attempt(api.sharing.display({ bio }));
              await refreshSharing();
              if (displayed) say(`"${name}" is now your public bio.`);
            })
          : null,
        sharing.displayed !== null
          ? button("Stop displaying", async () => {
              const hidden = await attempt(api.sharing.hide({}));
              await refreshSharing();
              if (hidden) say("No bio is displayed now.");
            })
          : null,
      ),
      h("div", { className: "row" }, open, h("label", { htmlFor: "open", textContent: "Open to New Friends" })),
      sharing.displayed === null ? h("p", { className: "quiet", textContent: "Display a bio first to turn this on." }) : null,
    );
  }

  void loadAll();
  return h("section", { className: "editor" }, list, editing, preview, share);
};
