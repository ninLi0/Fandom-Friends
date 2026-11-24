/** The MVP editor, adapted to the alpha's typed, per-change API. */
import { fonts, palettes } from "../../seed/offered.ts";
import { api, codeOf, reason, refused, type Card, type SavedBio, type Sharing, type Template } from "../api.ts";
import { drawCard, groupCardTags } from "../card.ts";
import { button, fill, h } from "../dom.ts";
import type { Page } from "../client.ts";
import { tagPicker } from "../tag-picker.ts";

type Bio = SavedBio["bio"];
type OpenBio = { bio: Bio; name: string; card: Card };
type Success<Answer> = Exclude<Answer, { error: unknown }>;

const editorTagLabels = { fandom: "Fandoms", character: "Characters", pairing: "Pairings", interest: "Interests & activities" };

export const editorPage: Page = ({ say, go }) => {
  let bios: SavedBio[] = [];
  let templates: Template[] = [];
  let sharing: Sharing = { handle: null, displayed: null, open: null };
  let current: OpenBio | undefined;
  let busy = false;
  let creating = false;
  let showCard = () => {};

  const list = h("div", { className: "saved-toolbar" });
  const createArea = h("div", { className: "bio-create", hidden: true });
  const editing = h("div", { className: "editing" });
  const preview = h("div", { className: "preview-stage" });
  const share = h("section", { className: "panel publish-panel" });
  const saved = h("span", { className: "save-status", role: "status" });
  const recovery = h("div", { className: "notice", hidden: true },
    h("p", { textContent: "Reload your saved bios to check the latest state." }),
    button("Reload saved bios", () => run(() => loadAll(), false), { className: "button secondary small" }),
  );
  const root = h("section", { className: "editor-page" },
    h("div", { className: "editor-layout" },
      h("div", { className: "editor-main" }, list, createArea, editing),
      h("aside", { className: "editor-aside", ariaLabel: "Bio preview and sharing" },
        h("div", { className: "preview-label", textContent: "LIVE PREVIEW" }), preview,
        h("p", { className: "preview-footer", textContent: "Only one saved bio is public at a time. The rest stay yours." }), share,
      ),
    ),
    recovery,
  );

  function report(message: string) {
    if (root.isConnected) say(message);
  }

  /** Serialize requests so an older response cannot overwrite a newer edit. */
  async function run(task: () => Promise<void>, saving = true) {
    if (busy) return false;
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : null;
    busy = true;
    root.inert = true;
    root.setAttribute("aria-busy", "true");
    report("");
    saved.textContent = saving ? "Saving…" : "Loading…";
    try {
      await task();
      saved.textContent = "";
      return true;
    } catch (error) {
      saved.textContent = saving ? "Could not complete this update. Please try again." : "Could not load your bios.";
      report(error instanceof Error ? error.message : "That did not work. Try again.");
      recovery.hidden = false;
      showCard();
      // Roll back the optimistic switch without losing a handle someone has typed.
      const open = share.querySelector<HTMLInputElement>("#open-to-friends");
      if (open) open.checked = sharing.open === true;
      return false;
    } finally {
      root.inert = false;
      root.removeAttribute("aria-busy");
      busy = false;
      // The button helper enables its button after the action resolves.
      requestAnimationFrame(() => {
        if (root.isConnected && focused?.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true });
      });
    }
  }

  async function answer<Answer extends object>(request: Promise<Answer>): Promise<Success<Answer>> {
    const result = await request;
    if (refused(result)) throw new Error(reason(result));
    return result as Success<Answer>;
  }

  async function openBio(bio: Bio) {
    current = await answer(api.bios.view({ bio }));
    creating = false;
    drawList();
    drawEditing();
    drawSharing();
  }

  async function loadAll(preferred?: Bio) {
    const [savedBios, offered, status] = await Promise.all([
      answer(api.bios.list({})), answer(api.templates.list({})), answer(api.sharing.status({})),
    ]);
    bios = savedBios.bios;
    templates = offered.templates;
    sharing = status.sharing;
    const next = preferred ?? current?.bio ?? sharing.displayed ?? bios[0]?.bio;
    if (next !== undefined && bios.some((bio) => bio.bio === next)) {
      await openBio(next);
      recovery.hidden = true;
      return;
    }
    current = undefined;
    creating = bios.length === 0;
    drawList();
    drawEditing();
    drawSharing();
    recovery.hidden = true;
  }

  async function refreshSharing() {
    sharing = (await answer(api.sharing.status({}))).sharing;
    drawList();
    drawSharing();
    showCard();
  }

  function changed(result: { card: Card }) {
    if (!current) return;
    current = { ...current, card: result.card };
    showCard();
  }

  function drawList() {
    const pendingName = createArea.querySelector<HTMLInputElement>("input")?.value ?? "";
    const tabs = h("div", { className: "bio-tabs", role: "group", ariaLabel: "Saved bios" },
      ...bios.map((bio) => {
        const tab = button("", () => {
          if (bio.bio === current?.bio) return;
          return run(() => openBio(bio.bio), false);
        }, {
          className: `bio-tab${bio.bio === current?.bio ? " active" : ""}${bio.bio === sharing.displayed ? " published" : ""}`,
          ariaPressed: String(bio.bio === current?.bio), title: bio.name,
        });
        tab.append(h("span", { className: "bio-tab-name", textContent: bio.name }));
        if (bio.bio === sharing.displayed) tab.append(h("span", { className: "bio-status", textContent: "Public" }));
        return tab;
      }),
    );
    const start = button("+ New bio", () => {
      creating = !creating;
      createArea.hidden = !creating;
      list.querySelector(".new-bio-tab")?.setAttribute("aria-expanded", String(creating));
      if (creating) createArea.querySelector("input")?.focus();
    }, { className: "new-bio-tab", ariaExpanded: String(creating) });
    start.setAttribute("aria-controls", "new-bio-form");
    fill(list, tabs, start);

    const name = h("input", { id: "new-bio-name", className: "input", value: pendingName || (bios.length === 0 ? "My first bio" : "Untitled bio"), maxLength: 80, required: true });
    const form = h("form", { id: "new-bio-form", className: "panel editor-intro" },
      h("label", { className: "field-label", htmlFor: name.id }, "Saved bio name ", h("span", { className: "help-inline", textContent: "Only you see this" })),
      h("div", { className: "row" }, name,
        h("button", { type: "submit", className: "button primary", textContent: "Save bio" }),
        button("Cancel", () => {
          creating = false;
          createArea.hidden = true;
          list.querySelector(".new-bio-tab")?.setAttribute("aria-expanded", "false");
          list.querySelector<HTMLButtonElement>(".new-bio-tab")?.focus();
        }, { className: "button ghost" }),
      ),
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void run(async () => {
        const started = await answer(api.bios.start({ name: name.value }));
        await loadAll(started.bio);
        report("Bio saved.");
      });
    });
    fill(createArea, form);
    createArea.hidden = !creating;
  }

  function drawEditing() {
    if (!current) {
      showCard = () => {};
      fill(editing);
      const template = templates.find((offered) => offered.default) ?? templates[0];
      fill(preview, drawCard({ tags: [], look: {
        template: template?.template ?? null, layout: template?.layout ?? null,
        font: template?.font ?? null, palette: template?.palette ?? null,
      } }, sharing.handle ?? undefined));
      return;
    }
    const { bio, name } = current;
    const rename = h("input", { id: "bio-name", className: "input", value: name, maxLength: 80, required: true });
    const renameForm = h("form", { className: "field" },
      h("label", { className: "field-label", htmlFor: rename.id }, "Saved bio name ", h("span", { className: "help-inline", textContent: "Only you see this" })),
      h("div", { className: "row" }, rename, h("button", { type: "submit", className: "button secondary small", textContent: "Rename" })),
    );
    renameForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (rename.value === current?.name) return;
      void run(async () => {
        await answer(api.bios.rename({ bio, name: rename.value }));
        await loadAll(bio);
        report("Bio renamed.");
      });
    });
    rename.addEventListener("keydown", (event) => {
      if (event.key === "Escape") rename.value = current?.name ?? name;
    });

    const selected = h("div", { className: "selected-tags" });
    const picker = tagPicker({
      label: "Find a tag", selected: () => current?.card.tags.map((tag) => tag.tag) ?? [],
      pick: (tag) => run(async () => changed(await answer(api.bios.tags.add({ bio, tag: tag.main })))), say: report,
    });
    const templateChoices = templates.map((template) => {
      const control = button("", () => {
        if (current?.card.look.template === template.template) return;
        return run(async () => changed(await answer(api.bios.look.template({ bio, template: template.template }))));
      }, {
        className: "template-option", ariaPressed: "false",
      });
      const miniature = h("span", { className: "template-mini", ariaHidden: "true" });
      miniature.dataset.layout = template.layout;
      control.append(miniature, h("span", { className: "template-name", textContent: template.name }));
      return { template, control };
    });
    const fontChoices = fonts.map((font) => ({ font, control: button(font, () => run(async () => changed(await answer(api.bios.look.font({ bio, font })))), {
      className: "choice-button", ariaPressed: "false",
    }) }));
    const paletteChoices = palettes.map((palette) => {
      const control = button("", () => run(async () => changed(await answer(api.bios.look.palette({ bio, palette })))), { className: "choice-button", ariaPressed: "false" });
      const swatch = h("span", { className: "palette-swatch", ariaHidden: "true" });
      swatch.dataset.palette = palette;
      control.append(swatch, palette);
      return { palette, control };
    });

    showCard = () => {
      if (!current || current.bio !== bio) return;
      const { card } = current;
      const groups = groupCardTags(card.tags);
      fill(selected, ...groups.map((group) => h("section", { className: "tag-group" },
        h("h3", { className: "tag-group-label", textContent: editorTagLabels[group.key] }),
        h("ul", { className: "selected-tags" }, ...group.tags.map((tag) => h("li", { className: `tag-chip ${group.key}` },
          tag.name,
          button("×", async () => {
            await run(async () => changed(await answer(api.bios.tags.remove({ bio, tag: tag.tag }))));
            picker.querySelector<HTMLInputElement>("input")?.focus();
          }, { className: "tag-remove", ariaLabel: `Remove ${tag.name}` }),
        ))),
      )), groups.length === 0 ? h("p", { className: "tag-empty", textContent: "Your favorites go here. Pick a few tags below." }) : null);
      for (const { template, control } of templateChoices) {
        const active = card.look.template === template.template;
        control.classList.toggle("selected", active);
        control.setAttribute("aria-pressed", String(active));
      }
      for (const { font, control } of fontChoices) {
        const active = card.look.font === font;
        control.classList.toggle("selected", active);
        control.setAttribute("aria-pressed", String(active));
      }
      for (const { palette, control } of paletteChoices) {
        const active = card.look.palette === palette;
        control.classList.toggle("selected", active);
        control.setAttribute("aria-pressed", String(active));
      }
      fill(preview, drawCard(card, sharing.handle ?? undefined));
    };

    fill(editing,
      h("section", { className: "panel editor-intro" },
        current.bio === sharing.displayed ? h("p", { className: "editor-public-note", textContent: "Saving updates your public card." }) : null,
        renameForm,
        h("div", { className: "section-heading" }, h("h2", { textContent: "Your very specific interests" }),
          h("p", { className: "panel-description", textContent: "Choose the things you’d love to talk about." })),
        selected, picker,
      ),
      h("section", { className: "panel look-panel" },
        h("div", { className: "panel-heading" }, h("h2", { textContent: "Layout" }),
          button("Reset font & color", () => run(async () => {
            const result = await api.bios.look.reset({ bio });
            if (refused(result)) {
              if (codeOf(result) === "LOOK_NOT_CUSTOMIZED") return report("Already using the template’s font and colors.");
              throw new Error(reason(result));
            }
            changed(result);
          }), { className: "button ghost small" })),
        h("p", { className: "field-label", textContent: "Layout" }),
        h("div", { className: "template-options", role: "group", ariaLabel: "Card layout" }, ...templateChoices.map(({ control }) => control)),
        h("p", { className: "field-label", textContent: "Font" }),
        h("div", { className: "choice-row", role: "group", ariaLabel: "Card font" }, ...fontChoices.map(({ control }) => control)),
        h("p", { className: "field-label", textContent: "Color story" }),
        h("div", { className: "choice-row", role: "group", ariaLabel: "Card palette" }, ...paletteChoices.map(({ control }) => control)),
        h("p", { className: "help-text", textContent: "Your font and color choices carry over when you switch layouts." }),
      ),
      h("div", { className: "save-bar" }, saved,
        h("div", { className: "save-actions" }, button("Delete", async () => {
          if (!confirm(`Delete "${current?.name ?? name}"? This cannot be undone.`)) return;
          await run(async () => {
            await answer(api.bios.discard({ bio }));
            current = undefined;
            await loadAll();
            report("Bio deleted.");
          });
        }, { className: "button ghost small" })),
      ),
    );
    showCard();
  }

  function drawSharing() {
    if (sharing.handle === null) {
      const handle = h("input", {
        id: "public-handle", className: "input", placeholder: "your-fandom-corner", minLength: 3, maxLength: 30,
        pattern: "[a-z0-9-]+", required: true, autocapitalize: "none", spellcheck: false,
      });
      const claim = h("form", {},
        h("label", { className: "field-label", htmlFor: handle.id, textContent: "Choose your public handle" }), handle,
        h("p", { className: "help-text", textContent: "3–30 lowercase letters, numbers, or hyphens. This becomes your stable public address." }),
        h("button", { className: "button secondary wide", type: "submit", textContent: "Claim this handle" }),
      );
      claim.addEventListener("submit", (event) => {
        event.preventDefault();
        void run(async () => {
          await answer(api.sharing.claim({ handle: handle.value }));
          await refreshSharing();
          report("Your handle is yours. Display a bio when you’re ready to share.");
        });
      });
      fill(share, h("h2", { textContent: "Share at your own pace" }),
        h("p", { className: "panel-description", textContent: "Publishing makes a bio readable by anyone with its link." }), claim,
        h("p", { className: "help-text", textContent: "Unpublishing removes your hosted card." }));
      return;
    }

    const address = `/u/${encodeURIComponent(sharing.handle)}`;
    const publicURL = `${location.origin}${address}`;
    const link = h("a", { href: address, textContent: address });
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      go(address);
    });
    const displayedName = bios.find((bio) => bio.bio === sharing.displayed)?.name;
    const isPublic = current?.bio === sharing.displayed;
    const copy = button("Copy link", async () => {
      try {
        await navigator.clipboard.writeText(publicURL);
        report("Public link copied.");
      } catch {
        report("Could not copy the link. Select the address above and copy it.");
      }
    }, { className: "button ghost small" });
    const open = h("input", { id: "open-to-friends", type: "checkbox", role: "switch", checked: sharing.open === true, disabled: sharing.displayed === null });
    open.addEventListener("change", () => void run(async () => {
      const result = open.checked ? await answer(api.sharing.open({})) : await answer(api.sharing.close({}));
      await refreshSharing();
      report(result.open ? "You’re open to new friends. Your public bio appears in search." : "Discovery is off. Your public link still works.");
    }));

    fill(share,
      h("h2", { textContent: "Share at your own pace" }),
      h("p", { className: "panel-description", textContent: "Publishing makes a bio readable by anyone with its link." }),
      h("div", { className: "public-link" }, link, copy),
      sharing.displayed === null
        ? h("p", { className: "help-text", textContent: "Your handle is reserved. Publish a bio to make this link work." })
        : !isPublic ? h("div", { className: "notice" }, "Your link currently displays ",
          h("strong", { textContent: displayedName ?? "another saved bio" }), ". Displaying this bio replaces it.") : null,
      current ? button(isPublic ? "Your bio is public" : "Display this bio", () => run(async () => {
          await answer(api.sharing.display({ bio: current!.bio }));
          await refreshSharing();
          drawEditing();
          report("This bio is now public. Anyone with the link can read it.");
        }), { className: `button ${isPublic ? "secondary" : "primary"} wide`, disabled: isPublic }) : null,
      sharing.displayed !== null ? h("div", { className: "toggle-row" },
        h("div", {}, h("label", { className: "field-label", htmlFor: open.id, textContent: "Open to New Friends" }),
          h("p", { className: "help-text", textContent: `List ${!isPublic && displayedName ? `“${displayedName}”` : "your public bio"} in discovery. People can find it by its tags.` })),
        h("label", { className: "switch" }, open, h("span", { className: "switch-track", ariaHidden: "true" })),
      ) : h("p", { className: "help-text", textContent: "Publishing won’t list you in discovery. You can opt in after publishing." }),
      sharing.displayed !== null ? button("Unpublish public bio", () => run(async () => {
          await answer(api.sharing.hide({}));
          await refreshSharing();
          drawEditing();
          report("Your bio is private again. It no longer appears at your link or in search.");
        }), { className: "button ghost small" }) : null,
      h("p", { className: "help-text", textContent: "Unpublishing removes your hosted card." }),
    );
  }

  void run(async () => {
    try {
      await loadAll();
    } catch (error) {
      fill(editing, h("section", { className: "panel empty-state" },
        h("h2", { textContent: "Your bios couldn’t load." }),
        h("p", { textContent: "Check your connection and try again." }),
        button("Try again", () => run(loadAll, false), { className: "button primary" }),
      ));
      throw error;
    }
  }, false);
  return root;
};
