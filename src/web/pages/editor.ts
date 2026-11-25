/** The local MVP editor workflow, connected to the alpha's concept API. */
import { tags as seedTags } from "../../seed/vocabulary.ts";
import { interestsGroup } from "../../seed/offered.ts";
import { api, codeOf, reason, refused, type SavedBio, type Suggestion, type Template } from "../api.ts";
import type { Page } from "../client.ts";
import { h } from "../dom.ts";
import { editorView } from "../editor-view.ts";
import { effectiveLook, escapeHtml } from "../mvp-card.ts";
import type { Bio, Catalog, Category, Draft, Publication, Tag, User } from "../mvp-types.ts";

type BioID = SavedBio["bio"];
type TagID = Suggestion["tag"];
type TemplateID = Template["template"];
type Viewed = Exclude<Awaited<ReturnType<typeof api.bios.view>>, { error: unknown }>;
const maxBioNameLength = 60;

/** Raise the same readable refusal the alpha API supplies. */
async function answer<Result extends object>(request: Promise<Result>): Promise<Exclude<Result, { error: unknown }>> {
  const result = await request;
  if (refused(result)) throw new Error(reason(result));
  return result as Exclude<Result, { error: unknown }>;
}

export const editorPage: Page = (context) => {
  const root = document.createElement("div");
  root.innerHTML = '<div class="page editor-page loading-state" role="status"><span class="spinner" aria-hidden="true"></span>Getting things ready…</div>';
  const lifetime = new AbortController();
  context.onLeave(() => lifetime.abort());
  let catalog: Catalog;
  const user: User = { id: "", username: context.username ?? "", handle: null };
  let bios: Bio[] = [];
  let publication: Publication | null = null;
  let draft: Draft | null = null;
  let dirty = false;
  let busy = false;
  let editorQuery = "";
  let pendingSaveID: string | null = null;
  let nameInput: HTMLInputElement | undefined;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const toastRegion = document.createElement("div");
  toastRegion.className = "mvp-editor-toast";
  toastRegion.setAttribute("aria-live", "polite");
  toastRegion.setAttribute("aria-atomic", "true");
  document.body.append(toastRegion);
  context.onLeave(() => { clearTimeout(toastTimer); toastRegion.remove(); });

  function toast(message: string, error = false, duration = 6000) {
    if (!root.isConnected) return;
    clearTimeout(toastTimer);
    toastRegion.innerHTML = `<div class="toast ${error ? "error" : "success"}" role="status"><span>${escapeHtml(message)}</span><button class="toast-close" aria-label="Dismiss notification">×</button></div>`;
    toastRegion.querySelector("button")?.addEventListener("click", () => { toastRegion.innerHTML = ""; });
    toastTimer = setTimeout(() => { toastRegion.innerHTML = ""; }, duration);
  }

  const hasUnsavedChanges = () => dirty || (nameInput !== undefined && nameInput.value.trim() !== draft?.name);
  const mayDiscard = () => !hasUnsavedChanges() || window.confirm("You have unsaved changes. Leave without saving them?");
  context.beforeLeave(() => {
    if (busy) return false;
    nameInput?.blur();
    return mayDiscard();
  });
  window.addEventListener("beforeunload", (event) => {
    if (hasUnsavedChanges() || busy) { event.preventDefault(); event.returnValue = ""; }
  }, { signal: lifetime.signal });

  function newDraft(): Draft {
    return { id: null, name: bios.length ? "Untitled bio" : "My first bio", displayName: user.username, note: "", tagIds: [], templateId: catalog.templates[0]!.id, font: null, palette: null };
  }

  function fromBio(bio: Bio): Draft {
    return { id: bio.id, name: bio.name, displayName: bio.displayName, note: bio.note, tagIds: [...bio.tagIds], templateId: bio.templateId, font: bio.font, palette: bio.palette };
  }

  function fromViewed(viewed: Viewed): Bio {
    const { bio, name, card, overrides } = viewed;
    const currentTemplate = card.look.template ?? catalog.templates[0]!.id;
    const templateId = currentTemplate;
    return { id: bio, name, displayName: card.displayName, note: card.note, tagIds: card.tags.map((tag) => tag.tag),
      templateId, font: overrides.font, palette: overrides.palette,
      look: effectiveLook({ templateId, font: overrides.font, palette: overrides.palette }, catalog), updatedAt: "" };
  }

  async function loadCatalog(offered: Template[], suggestions: Suggestion[]) {
    const seedByName = new Map(seedTags.map((tag, index) => [tag.name, { tag, index }]));
    const mains = new Map<string, Suggestion>();
    for (const tag of suggestions) if (tag.mainName !== interestsGroup && !mains.has(tag.main)) mains.set(tag.main, tag);
    const categoryOf = (name: string): Category => {
      const parents = seedByName.get(name)?.tag.under ?? [];
      return parents.includes(interestsGroup) ? "interest" : parents.length > 1 ? "pairing" : parents.length ? "character" : "fandom";
    };
    const tags: Tag[] = [...mains.values()].sort((left, right) => (seedByName.get(left.mainName)?.index ?? Infinity) - (seedByName.get(right.mainName)?.index ?? Infinity)).map((tag) => ({
      id: tag.main, name: tag.mainName, category: categoryOf(tag.mainName), aliases: suggestions.filter((other) => other.main === tag.main && other.tag !== tag.main).map((other) => other.name),
      // By name, so the card can show a pairing its two characters' pictures.
      parents: [...(seedByName.get(tag.mainName)?.tag.under ?? [])],
    }));
    const wanted = ["Convention poster", "Side by side (MVP)", "Quiet notes"];
    const templates = wanted.map((name) => {
      const template = offered.find((item) => item.name === name);
      if (!template) throw new Error("The bio templates could not be loaded. Try again.");
      return { id: template.template, name: name === "Side by side (MVP)" ? "Side by side" : name, layout: template.layout, font: template.font, palette: template.palette };
    });
    // Existing alpha bios keep their saved template until their owner selects another layout.
    templates.push(...offered.filter((template) => !wanted.includes(template.name)).map((template) => ({
      id: template.template, name: template.name, layout: template.layout, font: template.font, palette: template.palette,
    })));
    catalog = { tags, templates, fonts: ["Sans", "Serif", "Mono"], palettes: ["Ocean", "Sunset", "Forest"] };
  }

  async function loadAll() {
    const [list, templates, vocabulary, sharing] = await Promise.all([
      answer(api.bios.list({})), answer(api.templates.list({})), answer(api.tags.suggest({ text: "" })), answer(api.sharing.status({})),
    ]);
    await loadCatalog(templates.templates, vocabulary.tags);
    user.handle = sharing.sharing.handle;
    publication = sharing.sharing.displayed ? { item: sharing.sharing.displayed, listed: sharing.sharing.open === true } : null;
    bios = [];
    for (const entry of list.bios) {
      const viewed = await answer(api.bios.view({ bio: entry.bio }));
      // Preserve any server tag not yet present in the starter vocabulary.
      for (const tag of viewed.card.tags) {
        if (catalog.tags.some((item) => item.id === tag.tag) || tag.name === interestsGroup) continue;
        catalog.tags.push({ id: tag.tag, name: tag.name, aliases: [], parents: tag.under.filter((parent) => parent.direct).map((parent) => parent.name), category: tag.under.some((parent) => parent.name === interestsGroup) ? "interest" : tag.under.filter((parent) => parent.direct).length > 1 ? "pairing" : tag.under.length ? "character" : "fandom" });
      }
      bios.push(fromViewed(viewed));
    }
    draft = bios.length ? fromBio(bios.find((bio) => bio.id === publication?.item) ?? bios[0]!) : newDraft();
    dirty = false;
    render();
  }

  function state() {
    return { draft: draft!, catalog, bios, publication, user, dirty, editorQuery };
  }

  function showTabName(tab: HTMLButtonElement, name: string) {
    tab.querySelector(".bio-tab-name")!.textContent = name;
    tab.title = `${name} · Double-click to rename`;
  }

  function render(focusId?: string, selectedTab?: HTMLButtonElement) {
    if (!draft || lifetime.signal.aborted) return;
    document.title = "My bios · Fandom Friends";
    const view = editorView(state());
    if (selectedTab) {
      // Keep the clicked tab and its label mounted so the second click can land on the same element.
      const previous = root.querySelector<HTMLButtonElement>('.bio-tab[aria-pressed="true"]');
      if (previous?.hasAttribute("data-unsaved-tab")) previous.remove();
      else if (previous) {
        previous.classList.remove("active");
        previous.setAttribute("aria-pressed", "false");
        const saved = bios.find((bio) => bio.id === previous.dataset.id);
        if (saved) showTabName(previous, saved.name);
      }
      selectedTab.classList.add("active");
      selectedTab.setAttribute("aria-pressed", "true");
      root.querySelector(".editor-fields")!.innerHTML = view.fields;
      root.querySelector(".editor-aside")!.innerHTML = view.aside;
    } else {
      root.innerHTML = view.html;
    }
    const tabs = root.querySelector<HTMLElement>(".bio-tabs");
    const active = tabs?.querySelector(".bio-tab.active");
    if (tabs && active) {
      const overflow = active.getBoundingClientRect().right - tabs.getBoundingClientRect().right;
      if (overflow > 0) tabs.scrollLeft += Math.ceil(overflow);
    }
    if (focusId) root.querySelector<HTMLElement>(`[id="${CSS.escape(focusId)}"]`)?.focus({ preventScroll: true });
  }

  function selectBio(tab: HTMLButtonElement) {
    if (tab.getAttribute("aria-pressed") === "true") return true;
    const bio = bios.find((item) => item.id === tab.dataset.id);
    nameInput?.blur();
    if (!bio || !mayDiscard()) return false;
    draft = fromBio(bio);
    pendingSaveID = null;
    dirty = false;
    editorQuery = "";
    render(undefined, tab);
    tab.focus({ preventScroll: true });
    return true;
  }

  function renameTab(tab: HTMLButtonElement) {
    if (!draft || busy || nameInput || tab.getAttribute("aria-pressed") !== "true") return;
    const editing = draft;
    const input = h("input", {
      className: `${tab.className} bio-tab-rename`, type: "text", value: editing.name,
      maxLength: maxBioNameLength, ariaLabel: "Private bio name",
    });
    nameInput = input;

    function finish(apply: boolean, restoreFocus: boolean) {
      if (nameInput !== input) return;
      nameInput = undefined;
      if (!root.contains(input)) return;
      input.replaceWith(tab);
      const name = input.value.trim();
      if (apply && name && name.length <= maxBioNameLength && name !== editing.name) {
        editing.name = name;
        dirty = true;
        showTabName(tab, name);
        updateEditor();
      }
      if (restoreFocus) tab.focus({ preventScroll: true });
    }

    input.addEventListener("blur", () => finish(true, false));
    input.addEventListener("input", () => input.setCustomValidity(""));
    input.addEventListener("keydown", (event) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false, true);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const name = input.value.trim();
        if (!name) input.setCustomValidity("Enter a bio name.");
        else if (name.length > maxBioNameLength) input.setCustomValidity(`Use at most ${maxBioNameLength} characters.`);
        if (input.reportValidity()) finish(true, true);
      }
    });
    tab.replaceWith(input);
    input.focus();
    input.select();
  }

  function updateEditor(tagsChanged = false) {
    if (!draft) return;
    const view = editorView(state());
    root.querySelector("#card-preview")!.innerHTML = view.preview;
    root.querySelector("#save-status")!.textContent = dirty ? "Unsaved changes" : "";
    root.querySelector("#note-count")!.textContent = String(draft.note.length);
    if (tagsChanged) {
      root.querySelector("#editor-tags")!.innerHTML = view.tags;
      root.querySelector("#editor-suggestions")!.innerHTML = view.suggestions;
      const search = root.querySelector<HTMLInputElement>("#editor-search")!;
      search.value = editorQuery;
      search.focus({ preventScroll: true });
    }
    const publish = root.querySelector<HTMLButtonElement>('[data-action="publish"]');
    if (publish) publish.textContent = publication?.item === draft.id ? "Save public changes" : "Save & display this bio";
  }

  /** Keep the original explicit Save workflow; API calls happen only after Save or Publish. */
  async function save(asNew = false): Promise<Bio> {
    if (!draft) throw new Error("Choose a bio first.");
    if (!draft.name.trim() || !draft.displayName.trim()) throw new Error("Give your bio a saved name and a display name first.");
    if (draft.name.length > maxBioNameLength || draft.displayName.length > 60 || draft.note.length > 280) throw new Error("Check the length of your bio fields.");
    const input = { ...draft, tagIds: [...draft.tagIds] };
    // The alpha's Drafting concept requires unique saved names. A copy keeps a distinct private name.
    if (asNew && !pendingSaveID && bios.some((bio) => bio.name === input.name)) {
      let number = 1;
      do { const suffix = number === 1 ? " (copy)" : ` (copy ${number})`; input.name = `${draft.name.slice(0, maxBioNameLength - suffix.length)}${suffix}`; number += 1; }
      while (bios.some((bio) => bio.name === input.name));
    }
    let id = pendingSaveID ?? (asNew ? null : input.id);
    if (!id) {
      id = (await answer(api.bios.start({ name: input.name }))).bio;
      // Remember a created draft if a later request fails, so Retry Save edits it rather than creating another.
      draft.id = id;
      draft.name = input.name;
      pendingSaveID = id;
      dirty = true;
    }
    const bio = id as BioID;
    // Re-read after a failed save: earlier requests may already have persisted part of it.
    const before = await answer(api.bios.view({ bio }));
    if (before?.name !== input.name) await answer(api.bios.rename({ bio, name: input.name }));
    await answer(api.bios.details({ bio, displayName: input.displayName, note: input.note }));
    const previous = new Set(before?.card.tags.map((tag) => tag.tag) ?? []);
    for (const tag of previous) if (!input.tagIds.includes(tag)) await answer(api.bios.tags.remove({ bio, tag }));
    for (const tag of input.tagIds) if (!previous.has(tag as TagID)) await answer(api.bios.tags.add({ bio, tag: tag as TagID }));
    if (before?.card.look.template !== input.templateId) await answer(api.bios.look.template({ bio, template: input.templateId as TemplateID }));
    if (before?.overrides.font !== input.font || before?.overrides.palette !== input.palette) {
      // Only a look with its own font or palette can be reset; asking for any other is refused.
      if (before?.overrides.font != null || before?.overrides.palette != null) {
        const reset = await api.bios.look.reset({ bio });
        if (refused(reset) && codeOf(reset) !== "LOOK_NOT_CUSTOMIZED") throw new Error(reason(reset));
      }
      if (input.font !== null) await answer(api.bios.look.font({ bio, font: input.font }));
      if (input.palette !== null) await answer(api.bios.look.palette({ bio, palette: input.palette }));
    }
    const viewed = await answer(api.bios.view({ bio }));
    const persisted = fromViewed(viewed);
    const index = bios.findIndex((item) => item.id === id);
    if (index < 0) bios.push(persisted); else bios[index] = persisted;
    draft = fromBio(persisted);
    pendingSaveID = null;
    dirty = false;
    return persisted;
  }

  async function refreshSharing() {
    const { sharing } = await answer(api.sharing.status({}));
    user.handle = sharing.handle;
    publication = sharing.displayed ? { item: sharing.displayed, listed: sharing.open === true } : null;
  }

  async function action(name: string, id: string) {
    if (!draft) return;
    if (name === "new-bio") {
      if (!mayDiscard()) return;
      draft = newDraft();
      pendingSaveID = null;
      dirty = false; editorQuery = ""; render();
      root.querySelector<HTMLButtonElement>('.bio-tab[aria-pressed="true"]')?.focus({ preventScroll: true });
      return;
    }
    if (name === "add-tag" || name === "remove-tag") {
      draft.tagIds = name === "add-tag" ? [...new Set([...draft.tagIds, id])] : draft.tagIds.filter((tag) => tag !== id);
      dirty = true; editorQuery = ""; updateEditor(true); return;
    }
    if (["template", "font", "palette", "reset-style"].includes(name)) {
      if (name === "template") draft.templateId = id;
      if (name === "font") draft.font = id;
      if (name === "palette") draft.palette = id;
      if (name === "reset-style") { draft.font = null; draft.palette = null; }
      dirty = true; const focused = (document.activeElement as HTMLElement | null)?.id; render(focused); return;
    }
    if (name === "save" || name === "save-as-new") {
      await save(name === "save-as-new"); render(); toast("Bio saved.", false, 3000); return;
    }
    if (name === "publish") {
      if (dirty || !draft.id) await save();
      if (publication?.item !== draft!.id) await answer(api.sharing.display({ bio: draft!.id as BioID }));
      await refreshSharing(); render(); toast("Your bio is public at your link."); return;
    }
    if (name === "unpublish") {
      if (!window.confirm("Unpublish your public bio? Your saved bios will stay private, and discovery will turn off.")) return;
      await answer(api.sharing.hide({})); publication = null; render(); toast("Your bio is now private."); return;
    }
    if (name === "delete-bio") {
      if (!draft.id || !window.confirm(`Delete “${draft.name}”?${publication?.item === draft.id ? " This also removes your public card and discovery listing." : ""} This cannot be undone.`)) return;
      await answer(api.bios.discard({ bio: draft.id as BioID }));
      if (publication?.item === draft.id) publication = null;
      bios = bios.filter((bio) => bio.id !== draft!.id);
      draft = bios.length ? fromBio(bios[0]!) : newDraft(); dirty = false; render(); toast("Bio deleted."); return;
    }
    if (name === "copy-link") {
      const link = `${location.origin}/u/${user.handle}`;
      try { await navigator.clipboard.writeText(link); toast("Public link copied."); }
      catch { toast(`Your public link: ${link}`); }
    }
  }

  async function run(task: () => Promise<void>, lock = true) {
    if (busy) return;
    // Some browsers leave a text input focused when the user clicks a button.
    nameInput?.blur();
    busy = true;
    if (lock) { root.inert = true; root.setAttribute("aria-busy", "true"); }
    try { await task(); }
    catch (error) {
      if (draft) render();
      else {
        root.innerHTML = '<div class="page editor-page empty-state"><h1>We couldn’t load this page.</h1><p>Please try again.</p><button class="button primary" data-action="retry">Try again</button></div>';
      }
      toast(error instanceof Error ? error.message : "Please try again.", true);
    }
    finally { busy = false; root.inert = false; root.removeAttribute("aria-busy"); }
  }

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>("a[data-nav]");
    if (anchor && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); if (!busy) context.go(anchor.pathname); return;
    }
    const control = event.target.closest<HTMLElement>("[data-action]");
    if (!control || busy || control instanceof HTMLButtonElement && control.disabled) return;
    event.preventDefault();
    const name = control.dataset.action ?? "";
    if (name === "retry") { void run(loadAll); return; }
    if (name === "select-bio" && control instanceof HTMLButtonElement) {
      if (event.detail < 2) selectBio(control);
      return;
    }
    void run(() => action(name, control.dataset.id ?? ""), ["save", "save-as-new", "publish", "unpublish", "delete-bio", "copy-link"].includes(name));
  });

  root.addEventListener("dblclick", (event) => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest<HTMLButtonElement>("button.bio-tab");
    if (tab) renameTab(tab);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "F2" || event.isComposing || busy) return;
    const tab = event.target;
    if (tab instanceof HTMLButtonElement && tab.classList.contains("bio-tab")) {
      event.preventDefault();
      if (selectBio(tab)) renameTab(tab);
    }
  });

  root.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || !draft) return;
    if (input.id === "editor-search") {
      editorQuery = input.value; root.querySelector("#editor-suggestions")!.innerHTML = editorView(state()).suggestions; return;
    }
    if (input.dataset.field === "displayName" || input.dataset.field === "note") {
      draft[input.dataset.field] = input.value; dirty = true; updateEditor();
    }
  });

  root.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== "handle-form") return;
    event.preventDefault(); const form = event.target;
    void run(async () => {
      await answer(api.sharing.claim({ handle: String(new FormData(form).get("handle") ?? "") }));
      await refreshSharing(); render(); toast("Your public handle is reserved.");
    });
  });

  root.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== "listing-toggle") return;
    const input = event.target; const requested = input.checked;
    if (busy) { input.checked = publication?.listed ?? false; return; }
    void run(async () => {
      try {
        if (requested) await answer(api.sharing.open({})); else await answer(api.sharing.close({}));
        await refreshSharing(); render(); toast(requested ? "You’re open to new friends." : "Discovery is off. Your public link still works.");
      } catch (error) { input.checked = !requested; throw error; }
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!event.repeat && !busy) {
        root.querySelector<HTMLButtonElement>('[data-action="save"]')?.click();
      }
    } else if (event.key === "ArrowDown" && event.target instanceof HTMLInputElement && event.target.id === "editor-search") {
      event.preventDefault(); root.querySelector<HTMLElement>("#editor-suggestions button")?.focus();
    }
  }, { signal: lifetime.signal });

  void run(loadAll);
  return root;
};
