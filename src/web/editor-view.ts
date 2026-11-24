/** Editor markup taken from local MVP commit 89c72bf. */
import { effectiveLook, escapeHtml as e, renderCard } from "./mvp-card.ts";
import type { Bio, Catalog, Draft, Publication, User } from "./mvp-types.ts";

export const categories = [
  { id: "fandom", label: "Fandoms" }, { id: "character", label: "Characters" },
  { id: "pairing", label: "Pairings" }, { id: "interest", label: "Interests & activities" },
] as const;

export interface EditorViewState {
  draft: Draft;
  catalog: Catalog;
  bios: Bio[];
  publication: Publication | null;
  user: User;
  dirty: boolean;
  editorQuery: string;
}

export function editorView({ draft, catalog, bios, publication, user, dirty, editorQuery }: EditorViewState) {
function renderBioTabs(activeId: string | null): string {
  const tabs = bios.map((bio) => {
    const active = bio.id === activeId;
    const published = publication?.item === bio.id;
    return `<button type="button" class="bio-tab${active ? ' active' : ''}${published ? ' published' : ''}"
      data-action="select-bio" data-id="${e(bio.id)}" aria-pressed="${active}" title="${e(bio.name)}">
      <span class="bio-tab-name">${e(bio.name)}</span>${published ? '<span class="bio-status">Public</span>' : ''}
    </button>`;
  });
  if (!activeId) tabs.push('<span class="bio-tab active"><span class="bio-tab-name">New bio</span><span class="bio-status">Unsaved</span></span>');
  return `<div class="saved-toolbar">
    <div class="bio-tabs" role="group" aria-label="Saved bios">${tabs.join('')}</div>
    <button type="button" class="new-bio-tab" data-action="new-bio"><span aria-hidden="true">+</span> New bio</button>
  </div>`;
}

function renderEditor(): string {
  const current = publication?.item === draft.id;
  return `<div class="page editor-page">
    <div class="editor-layout"><div class="editor-main">
    ${renderBioTabs(draft.id)}
    <section class="panel editor-intro">
    ${current ? '<p class="editor-public-note">Saving updates your public card.</p>' : ''}
    <div class="field"><label class="field-label" for="bio-name">Saved bio name <span class="help-inline">Only you see this</span></label><input class="input" id="bio-name" data-field="name" value="${e(draft.name)}" maxlength="60" required></div><div class="field"><label class="field-label" for="display-name">Display name</label><input class="input" id="display-name" data-field="displayName" value="${e(draft.displayName)}" maxlength="60" required autocomplete="nickname"></div><div class="field"><label class="field-label" for="bio-note">A little about you <span class="help-inline">Optional</span></label><textarea class="textarea" id="bio-note" data-field="note" rows="3" maxlength="280" placeholder="Currently thinking about…">${e(draft.note)}</textarea><p class="help-text">Skip sensitive details such as your exact age or location. <span id="note-count">${draft.note.length}</span>/280</p></div>
    <div class="section-heading"><h2>Your very specific interests</h2><p class="panel-description">Choose the things you’d love to talk about.</p></div><div id="editor-tags">${tagSelection(draft.tagIds, 'editor')}</div><div class="tag-picker"><label class="field-label" for="editor-search">Find a tag</label><input class="input tag-search" id="editor-search" type="search" autocomplete="off" placeholder="Try Fern, sketch swaps, or 葬送…" value="${e(editorQuery)}" aria-controls="editor-suggestions"><div id="editor-suggestions" class="tag-suggestions" aria-label="Suggested tags">${suggestions(editorQuery, draft.tagIds, 'editor')}</div></div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Layout</h2></div><button class="button ghost small" data-action="reset-style">Reset font & color</button></div><p class="field-label">Layout</p><div class="template-options" role="group" aria-label="Card layout">${catalog.templates.filter((item) => ["poster", "columns", "minimal"].includes(item.layout)).map((item) => `<button id="template-${e(item.id)}" class="template-option ${draft!.templateId === item.id ? 'selected' : ''}" data-action="template" data-id="${e(item.id)}" aria-pressed="${draft!.templateId === item.id}"><span class="template-mini ${e(item.layout)}" aria-hidden="true"><span></span><span></span><span></span></span><span class="template-name">${e(item.name)}</span></button>`).join('')}</div><p class="field-label">Font</p><div class="choice-row" role="group" aria-label="Card font">${catalog.fonts.map((font) => `<button id="font-${e(font)}" class="choice-button ${effectiveLook(draft!, catalog).font === font ? 'selected' : ''}" data-action="font" data-id="${e(font)}" aria-pressed="${effectiveLook(draft!, catalog).font === font}">${e(font)}</button>`).join('')}</div><p class="field-label">Color story</p><div class="choice-row" role="group" aria-label="Card palette">${catalog.palettes.map((palette) => `<button id="palette-${e(palette)}" class="choice-button ${effectiveLook(draft!, catalog).palette === palette ? 'selected' : ''}" data-action="palette" data-id="${e(palette)}" aria-pressed="${effectiveLook(draft!, catalog).palette === palette}"><span class="palette-swatch ${e(palette)}" aria-hidden="true"></span>${e(palette)}</button>`).join('')}</div><p class="help-text">Your font and color choices carry over when you switch layouts.</p></section>
    <div class="save-bar">
      <span class="save-status" id="save-status" role="status">${dirty ? 'Unsaved changes' : ''}</span>
      <div class="save-actions">${draft.id ? '<button class="button ghost small" data-action="delete-bio">Delete</button><button class="button secondary" data-action="save-as-new">Save as new</button>' : ''}<button class="button primary" data-action="save" aria-keyshortcuts="Meta+S Control+S">Save bio</button></div>
    </div></div>
    <aside class="editor-aside"><div class="preview-label"><span>LIVE PREVIEW</span></div><div id="card-preview" class="preview-stage">${previewCard()}</div><p class="preview-footer">Only one saved bio is public at a time. The rest stay yours.</p><section class="panel publish-panel">${publishingPanel()}</section></aside></div></div>`;
}

function previewCard(): string {
  return renderCard({ ...draft!, look: effectiveLook(draft!, catalog), handle: user?.handle, listed: publication?.item === draft?.id && publication?.listed }, catalog);
}

function publishingPanel(): string {
  if (!user || !draft) return '';
  const isCurrent = publication?.item === draft.id;
  const publishedBio = bios.find((bio) => bio.id === publication?.item);
  return `<h2>Share at your own pace</h2><p class="panel-description">Publishing makes a bio readable by anyone with its link.</p>${!user.handle ? `<form id="handle-form"><div class="field"><label class="field-label" for="public-handle">Choose your public handle</label><input class="input" id="public-handle" name="handle" placeholder="your-fandom-corner" pattern="[a-z0-9\\-]+" minlength="3" maxlength="30" required autocapitalize="none" spellcheck="false" aria-describedby="handle-help"><p class="help-text" id="handle-help">3–30 lowercase letters, numbers, or hyphens. This becomes your stable public address.</p></div><button class="button secondary wide" type="submit">Claim this handle</button></form>` : `<p class="public-link"><a data-nav href="/u/${e(user.handle)}">/u/${e(user.handle)}</a><button class="button ghost small" data-action="copy-link" aria-label="Copy public card link">Copy link</button></p>${!publication ? '<p class="help-text">Your handle is reserved. Publish a bio to make this link work.</p>' : !isCurrent ? `<div class="notice info">Your link currently displays <strong>${e(publishedBio?.name ?? 'another saved bio')}</strong>. Displaying this bio replaces it.</div>` : ''}<button class="button ${isCurrent && !dirty ? 'secondary' : 'primary'} wide" data-action="publish">${isCurrent ? dirty ? 'Save public changes' : 'Your bio is public' : dirty || !draft.id ? 'Save & display this bio' : 'Display this bio'}</button>${publication ? `<div class="toggle-row"><div><label class="field-label" for="listing-toggle">Open to New Friends</label><p class="help-text">List ${!isCurrent && publishedBio ? `“${e(publishedBio.name)}”` : 'your public bio'} in discovery. People can find it by its tags.</p></div><label class="switch"><input id="listing-toggle" type="checkbox" role="switch" ${publication.listed ? 'checked' : ''}><span class="switch-track" aria-hidden="true"></span><span class="sr-only">Open to New Friends</span></label></div><button class="button ghost small" data-action="unpublish">Unpublish public bio</button>` : '<p class="help-text">Publishing won’t list you in discovery. You can opt in after publishing.</p>'}`}<p class="help-text">Unpublishing removes your hosted card.</p>`;
}

function tagSelection(ids: string[], context: 'editor' | 'discover'): string {
  const groups = categories.map((category) => {
    const tags = catalog.tags.filter((tag) => tag.category === category.id && ids.includes(tag.id));
    if (!tags.length) return '';
    return `<div class="tag-group"><h3 class="tag-group-label">${e(category.label)}</h3><div class="selected-tags">${tags.map((tag) => `<span class="tag-chip ${tag.category}">${e(tag.name)}<button class="tag-remove" data-action="remove-tag" data-context="${context}" data-id="${e(tag.id)}" aria-label="Remove ${e(tag.name)}">×</button></span>`).join('')}</div></div>`;
  }).join('');
  return groups || `<p class="tag-empty">${context === 'editor' ? 'Your favorites go here. Pick a few tags below.' : 'All open bios, until you narrow things down.'}</p>`;
}

function suggestions(query: string, selected: string[], context: 'editor' | 'discover'): string {
  const text = query.trim().toLocaleLowerCase();
  const available = catalog.tags.filter((tag) => !selected.includes(tag.id) && (!text || [tag.name, ...tag.aliases].some((name) => name.toLocaleLowerCase().includes(text))));
  const matches = text ? available : categories.flatMap((category) => available.filter((tag) => tag.category === category.id).slice(0, 2));
  const limit = text ? 12 : 8;
  return matches.length ? matches.slice(0, limit).map((tag) => `<button class="tag-option" data-action="add-tag" data-context="${context}" data-id="${e(tag.id)}"><span><span class="tag-option-name">${e(tag.name)}</span>${text && !tag.name.toLocaleLowerCase().includes(text) ? `<span class="tag-alias">Also known as ${e(tag.aliases.find((name) => name.toLocaleLowerCase().includes(text)) ?? '')}</span>` : ''}</span><span class="tag-category">${e(categories.find((category) => category.id === tag.category)?.label)}</span><span aria-hidden="true">+</span></button>`).join('') : '<p class="tag-empty">No more matching tags. Try a character, pairing, or activity from Frieren.</p>';
}

  return {
    html: renderEditor(),
    preview: previewCard(),
    tags: tagSelection(draft.tagIds, "editor"),
    suggestions: suggestions(editorQuery, draft.tagIds, "editor"),
  };
}
