import { api, ApiError } from './api.js';
import { effectiveLook, escapeHtml as e, renderCard } from './card.js';
import type { Bio, Catalog, Category, Draft, Publication, PublicCard, User } from './types.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const categories: { id: Category; label: string }[] = [
  { id: 'fandom', label: 'Fandoms' }, { id: 'character', label: 'Characters' },
  { id: 'pairing', label: 'Pairings' }, { id: 'interest', label: 'Interests & activities' },
];
let catalog: Catalog;
let user: User | null = null;
let bios: Bio[] = [];
let publication: Publication | null = null;
let draft: Draft | null = null;
let dirty = false;
let busy = false;
let editorQuery = '';
let discoverQuery = '';
let filters: string[] = [];
let searchGeneration = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let navigationGeneration = 0;
let historyPosition = typeof history.state?.ffPosition === 'number' ? history.state.ffPosition as number : 0;
let restoringHistory = false;
history.replaceState({ ...history.state, ffPosition: historyPosition }, '', location.href);

const toastRegion = document.createElement('div');
toastRegion.setAttribute('aria-live', 'polite');
toastRegion.setAttribute('aria-atomic', 'true');
document.body.append(toastRegion);

function toast(message: string, error = false): void {
  clearTimeout(toastTimer);
  toastRegion.innerHTML = `<div class="toast ${error ? 'error' : 'success'}" role="status"><span>${e(message)}</span><button class="toast-close" data-action="close-toast" aria-label="Dismiss notification">×</button></div>`;
  toastTimer = setTimeout(() => { toastRegion.innerHTML = ''; }, 6000);
}

function pending(value: boolean): void {
  // Lock controls during a mutation so its response cannot overwrite newer typing or navigation.
  app.inert = value;
  app.setAttribute('aria-busy', String(value));
  document.body.classList.toggle('is-pending', value);
}

const logo = '<span class="brand-mark" aria-hidden="true">✳</span><span class="brand-name">fandom friends<span class="brand-period">.</span></span>';
function shell(content: string): void {
  const path = location.pathname;
  app.innerHTML = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="header-inner">
    <a href="/" class="brand" data-nav aria-label="Fandom Friends home">${logo}</a>
    <nav class="header-nav" aria-label="Main navigation">${user ? `<a data-nav class="nav-link ${path === '/editor' ? 'active' : ''}" ${path === '/editor' ? 'aria-current="page"' : ''} href="/editor">My bios</a>` : ''}<a data-nav class="nav-link ${path === '/discover' ? 'active' : ''}" ${path === '/discover' ? 'aria-current="page"' : ''} href="/discover">Discover</a></nav>
    <div class="header-actions">${user ? `<span class="user-chip">${e(user.username)}</span><button class="button ghost small" data-action="logout">Sign out</button>` : '<a class="button ghost small" href="/login" data-nav>Sign in</a><a class="button primary small" href="/register" data-nav>Join the fandom</a>'}</div>
    </div></header><main id="main" tabindex="-1">${content}</main>
    <footer class="site-footer"><div class="footer-inner"><span>Made for the things you can’t stop talking about.</span><span>Fandom Friends · For fans 18+</span></div></footer>`;
}

function title(text: string): void { document.title = `${text} · Fandom Friends`; }
function loading(): void { shell('<div class="page loading-state" role="status"><span class="spinner" aria-hidden="true"></span>Getting things ready…</div>'); }
function newDraft(): Draft {
  return { id: null, name: 'My first bio', displayName: user?.username ?? '', note: '', tagIds: [], templateId: catalog.templates[0]!.id, font: null, palette: null };
}
function fromBio(bio: Bio): Draft {
  return { id: bio.id, name: bio.name, displayName: bio.displayName, note: bio.note, tagIds: [...bio.tagIds], templateId: bio.templateId, font: bio.font, palette: bio.palette };
}
function mayDiscard(): boolean { return !dirty || window.confirm('You have unsaved changes. Leave without saving them?'); }

async function navigate(path: string, replace = false): Promise<void> {
  if (!mayDiscard()) return;
  dirty = false;
  draft = null;
  editorQuery = '';
  if (replace) history.replaceState({ ffPosition: historyPosition }, '', path);
  else { historyPosition += 1; history.pushState({ ffPosition: historyPosition }, '', path); }
  await route();
  window.scrollTo(0, 0);
  document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
}

async function route(): Promise<void> {
  const generation = ++navigationGeneration;
  const path = location.pathname;
  if ((path === '/editor' || path === '/discover') && !user) {
    history.replaceState({ ffPosition: historyPosition }, '', `/login?next=${encodeURIComponent(path)}`);
    return renderAuth(false);
  }
  if (path === '/') return renderHome();
  if (path === '/login' || path === '/register') {
    if (user) { history.replaceState({ ffPosition: historyPosition }, '', '/editor'); return route(); }
    return renderAuth(path === '/register');
  }
  if (path === '/editor') {
    loading();
    try {
      const data = await api<{ bios: Bio[]; publication: Publication | null }>('/api/bios');
      if (generation !== navigationGeneration) return;
      bios = data.bios;
      publication = data.publication;
      draft ??= bios.length ? fromBio(bios.find((bio) => bio.id === publication?.item) ?? bios[0]!) : newDraft();
      renderEditor();
    } catch (error) { if (generation === navigationGeneration) showRouteError(error); }
    return;
  }
  if (path === '/discover') { renderDiscovery(); void search(); return; }
  if (path.startsWith('/u/')) {
    loading();
    try {
      const { card } = await api<{ card: PublicCard }>(`/api/cards/${encodeURIComponent(decodeURIComponent(path.slice(3)))}`);
      if (generation !== navigationGeneration) return;
      title(`${card.displayName}’s bio`);
      shell(`<div class="page public-page"><div class="page-heading"><p class="eyebrow">A FELLOW FAN, INTRODUCED</p><h1>Meet ${e(card.displayName)}.</h1><p class="lead">Every friendship starts with something in common.</p></div><div class="public-card-wrap">${renderCard(card, catalog)}</div><div class="public-page-footer"><p>${card.listed ? 'This fan is open to meeting new friends.' : 'A little corner of the internet, shared with you.'}</p><a class="button primary" href="${user ? '/editor' : '/register'}" data-nav>Make your own bio</a><p class="help-text">This card was created by its owner. Anyone with its address can read it.</p></div></div>`);
    } catch (error) {
      if (generation !== navigationGeneration) return;
      if (error instanceof ApiError && error.status === 404) {
        title('Card unavailable');
        shell('<div class="page page-narrow empty-state"><span class="empty-icon" aria-hidden="true">✳</span><h1>This card isn’t public.</h1><p>The owner may have unpublished it, or the address may be incorrect.</p><a href="/" data-nav class="button primary">Back to Fandom Friends</a></div>');
      } else showRouteError(error);
    }
    return;
  }
  title('Page not found');
  shell('<div class="page page-narrow empty-state"><h1>A little lost?</h1><p>We couldn’t find that page.</p><a class="button primary" href="/" data-nav>Find your way home</a></div>');
}

function showRouteError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) { user = null; dirty = false; void navigate(`/login?next=${encodeURIComponent(location.pathname)}`, true); return; }
  shell(`<div class="page page-narrow empty-state"><h1>We couldn’t load this page.</h1><p>${e(error instanceof Error ? error.message : 'Please try again.')}</p><button class="button primary" data-action="retry">Try again</button></div>`);
}

function renderHome(): void {
  title('Find your kind of fan');
  const sample: PublicCard = { handle: 'mika-draws', displayName: 'Mika', note: 'Probably sketching Fern while waiting for the next episode. Let’s trade doodles and theories!', tagIds: ['frieren', 'fern', 'fern-stark', 'sketch-swaps', 'episode-discussions'].filter((id) => catalog.tags.some((tag) => tag.id === id)), look: effectiveLook({ templateId: 'poster', font: null, palette: 'Ocean' }, catalog), listed: true };
  shell(`<div class="page"><section class="hero"><div class="hero-copy"><p class="hero-kicker">BIG FEELINGS. NICHE INTERESTS. YOUR PEOPLE.</p><h1 class="hero-title">Find your<br>kind of <span class="accent">fan.</span></h1><p class="hero-description">The character you adore. The pairing you’ll defend. The stories you’re still thinking about. Put it all in a bio and find people who get it.</p><div class="hero-actions"><a href="${user ? '/editor' : '/register'}" data-nav class="button primary">Make yourself a bio</a><a href="/discover" data-nav class="button secondary">Find fellow fans</a></div><p class="hero-note">Free to be specific. A space for fans 18 and older.</p></div><div class="hero-art"><span class="hero-sticker">a little card,<br>a lot in common.</span>${renderCard(sample, catalog, true)}</div></section><section class="steps" aria-label="How Fandom Friends works"><div class="step"><span class="step-symbol" aria-hidden="true">✳</span><h2>Your interests, in your words</h2><p>Pick from our Frieren tag collection, from favorite characters to sketch swaps.</p></div><div class="step"><span class="step-symbol" aria-hidden="true">▧</span><h2>A card that feels like you</h2><p>Choose a layout, a font, and a palette. We’ll handle the arranging.</p></div><div class="step"><span class="step-symbol" aria-hidden="true">◎</span><h2>Share at your own pace</h2><p>Share your public link, or turn on Open to New Friends to appear in discovery.</p></div></section></div>`);
}

function renderAuth(register: boolean): void {
  title(register ? 'Join the fandom' : 'Welcome back');
  const next = new URLSearchParams(location.search).get('next');
  const query = next === '/discover' ? '?next=%2Fdiscover' : '';
  shell(`<div class="page auth-layout"><div class="auth-copy"><p class="eyebrow">YOUR PEOPLE ARE OUT THERE</p><h1>${register ? 'Start with<br>something you love.' : 'Back for more<br>fandom feelings.'}</h1><p class="lead">A good introduction makes room for all your very specific interests.</p><div class="notice info">Our first collection is all about <strong>Frieren</strong>. More fandoms can come later; your corner starts here.</div></div><section class="panel auth-panel"><h2>${register ? 'Join Fandom Friends' : 'Welcome back'}</h2><p class="panel-description">${register ? 'Your login name stays private. You’ll choose a public handle in the editor.' : 'Sign in to your saved bios and discover fellow fans.'}</p><form id="auth-form" data-register="${register}"><div class="field"><label class="field-label" for="username">Login name</label><input class="input" id="username" name="username" autocomplete="username" minlength="3" maxlength="32" pattern="[a-zA-Z0-9_-]+" required spellcheck="false" autocapitalize="none" aria-describedby="username-help"><p class="help-text" id="username-help">3–32 letters, numbers, underscores, or hyphens.</p></div><div class="field"><label class="field-label" for="password">Password</label><input class="input" id="password" name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" minlength="${register ? 10 : 1}" maxlength="128" required>${register ? '<p class="help-text">Use at least 10 characters.</p>' : ''}</div>${register ? '<label class="checkbox-field"><input type="checkbox" name="adult" required><span>I’m 18 or older. I understand that anyone with my published card’s address can read it.</span></label>' : ''}<p id="auth-error" class="form-error" role="alert"></p><button class="button primary wide" type="submit">${register ? 'Create my account' : 'Sign in'}</button></form><p class="auth-switch">${register ? `Already found us? <a data-nav href="/login${query}">Sign in</a>` : `New around here? <a data-nav href="/register${query}">Create an account</a>`}</p></section></div>`);
}

function renderEditor(): void {
  if (!draft || !user) return;
  title('My bios');
  const current = publication?.item === draft.id;
  shell(`<div class="page">
    <div class="saved-toolbar"><div class="bio-tabs" role="group" aria-label="Saved bios">${bios.map((bio) => `<button class="bio-tab ${bio.id === draft!.id ? 'active' : ''} ${publication?.item === bio.id ? 'published' : ''}" data-action="select-bio" data-id="${e(bio.id)}" aria-pressed="${bio.id === draft!.id}"><span class="bio-tab-name">${e(bio.name)}</span><span class="bio-status">${publication?.item === bio.id ? 'Public' : ''}</span></button>`).join('')}${!draft.id ? '<span class="bio-tab active"><span class="bio-tab-name">New bio</span><span class="bio-status">Unsaved</span></span>' : ''}</div><div class="page-heading-row"><button class="button secondary" data-action="new-bio">+ New bio</button></div></div>
    <div class="editor-layout"><div class="editor-main"><section class="panel"><div class="panel-heading"></div>${current ? '<div class="notice warning">You’re editing your public bio. Your changes stay private until you save; saving updates the card at your public link.</div>' : ''}
    <div class="field"><label class="field-label" for="bio-name">Saved bio name <span class="help-inline">Only you see this</span></label><input class="input" id="bio-name" data-field="name" value="${e(draft.name)}" maxlength="60" required></div><div class="field"><label class="field-label" for="display-name">Display name</label><input class="input" id="display-name" data-field="displayName" value="${e(draft.displayName)}" maxlength="60" required autocomplete="nickname"></div><div class="field"><label class="field-label" for="bio-note">A little about you <span class="help-inline">Optional</span></label><textarea class="textarea" id="bio-note" data-field="note" rows="3" maxlength="280" placeholder="Currently thinking about…">${e(draft.note)}</textarea><p class="help-text">Skip sensitive details such as your exact age or location. <span id="note-count">${draft.note.length}</span>/280</p></div>
    <div class="section-heading"><h2>Your very specific interests</h2><p class="panel-description">Choose the things you’d love to talk about.</p></div><div id="editor-tags">${tagSelection(draft.tagIds, 'editor')}</div><div class="tag-picker"><label class="field-label" for="editor-search">Find a tag</label><input class="input tag-search" id="editor-search" type="search" autocomplete="off" placeholder="Try Fern, sketch swaps, or 葬送…" value="${e(editorQuery)}" aria-describedby="editor-tag-help" aria-controls="editor-suggestions"><div id="editor-suggestions" class="tag-suggestions" aria-label="Suggested tags">${suggestions(editorQuery, draft.tagIds, 'editor')}</div></div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Layout</h2></div><button class="button ghost small" data-action="reset-style">Reset font & color</button></div><p class="field-label">Layout</p><div class="template-options" role="group" aria-label="Card layout">${catalog.templates.map((item) => `<button id="template-${e(item.id)}" class="template-option ${draft!.templateId === item.id ? 'selected' : ''}" data-action="template" data-id="${e(item.id)}" aria-pressed="${draft!.templateId === item.id}"><span class="template-mini ${e(item.layout)}" aria-hidden="true"><span></span><span></span><span></span></span><span class="template-name">${e(item.name)}</span></button>`).join('')}</div><p class="field-label">Font</p><div class="choice-row" role="group" aria-label="Card font">${catalog.fonts.map((font) => `<button id="font-${e(font)}" class="choice-button ${effectiveLook(draft!, catalog).font === font ? 'selected' : ''}" data-action="font" data-id="${e(font)}" aria-pressed="${effectiveLook(draft!, catalog).font === font}">${e(font)}</button>`).join('')}</div><p class="field-label">Color story</p><div class="choice-row" role="group" aria-label="Card palette">${catalog.palettes.map((palette) => `<button id="palette-${e(palette)}" class="choice-button ${effectiveLook(draft!, catalog).palette === palette ? 'selected' : ''}" data-action="palette" data-id="${e(palette)}" aria-pressed="${effectiveLook(draft!, catalog).palette === palette}"><span class="palette-swatch ${e(palette)}" aria-hidden="true"></span>${e(palette)}</button>`).join('')}</div><p class="help-text">Your font and color choices carry over when you switch layouts.</p></section>
    <div class="save-bar"><div><span id="save-status" role="status">${dirty ? 'Unsaved changes' : draft.id ? 'All changes saved' : 'Ready when you are'}</span></div><div class="save-actions">${draft.id ? '<button class="button ghost small" data-action="delete-bio">Delete</button><button class="button secondary" data-action="save-as-new">Save as new</button>' : ''}<button class="button primary" data-action="save">Save bio</button></div></div></div>
    <aside class="editor-aside"><div class="preview-label"><span>LIVE PREVIEW</span></div><div id="card-preview" class="preview-stage">${previewCard()}</div><p class="preview-footer">Only one saved bio is public at a time. The rest stay yours.</p><section class="panel publish-panel">${publishingPanel()}</section></aside></div></div>`);
}

function previewCard(): string {
  return renderCard({ ...draft!, look: effectiveLook(draft!, catalog), handle: user?.handle, listed: publication?.item === draft?.id && publication?.listed }, catalog);
}

function publishingPanel(): string {
  if (!user || !draft) return '';
  const isCurrent = publication?.item === draft.id;
  const publishedBio = bios.find((bio) => bio.id === publication?.item);
  return `<h2>Share at your own pace</h2><p class="panel-description">Publishing makes a bio readable by anyone with its link.</p>${!user.handle ? `<form id="handle-form"><div class="field"><label class="field-label" for="public-handle">Choose your public handle</label><input class="input" id="public-handle" name="handle" placeholder="your-fandom-corner" pattern="[a-z0-9-]+" minlength="3" maxlength="32" required autocapitalize="none" spellcheck="false" aria-describedby="handle-help"><p class="help-text" id="handle-help">3–32 lowercase letters, numbers, or hyphens. This becomes your stable public address.</p></div><button class="button secondary wide" type="submit">Claim this handle</button></form>` : `<p class="public-link"><a data-nav href="/u/${e(user.handle)}">/u/${e(user.handle)}</a><button class="button ghost small" data-action="copy-link" aria-label="Copy public card link">Copy link</button></p>${!publication ? '<p class="help-text">Your handle is reserved. Publish a bio to make this link work.</p>' : !isCurrent ? `<div class="notice info">Your link currently displays <strong>${e(publishedBio?.name ?? 'another saved bio')}</strong>. Displaying this bio replaces it.</div>` : ''}<button class="button ${isCurrent && !dirty ? 'secondary' : 'primary'} wide" data-action="publish">${isCurrent ? dirty ? 'Save public changes' : 'Your bio is public' : dirty || !draft.id ? 'Save & display this bio' : 'Display this bio'}</button>${publication ? `<div class="toggle-row"><div><label class="field-label" for="listing-toggle">Open to New Friends</label><p class="help-text">List ${!isCurrent && publishedBio ? `“${e(publishedBio.name)}”` : 'your public bio'} in discovery. People can find it by its tags.</p></div><label class="switch"><input id="listing-toggle" type="checkbox" role="switch" ${publication.listed ? 'checked' : ''}><span class="switch-track" aria-hidden="true"></span><span class="sr-only">Open to New Friends</span></label></div><button class="button ghost small" data-action="unpublish">Unpublish public bio</button>` : '<p class="help-text">Publishing won’t list you in discovery. You can opt in after publishing.</p>'}`}<p class="help-text">Unpublishing removes your hosted card.</p>`;
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

function updateEditor(): void {
  if (!draft) return;
  const preview = document.querySelector('#card-preview');
  if (preview) preview.innerHTML = previewCard();
  const status = document.querySelector('#save-status');
  if (status) status.textContent = 'Unsaved changes';
  const count = document.querySelector('#note-count');
  if (count) count.textContent = String(draft.note.length);
  const publish = document.querySelector<HTMLButtonElement>('[data-action="publish"]');
  if (publish) publish.textContent = publication?.item === draft.id ? 'Save public changes' : 'Save & display this bio';
}

function renderKeepingFocus(render: () => void): void {
  const activeId = document.activeElement?.id;
  render();
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
}

async function save(asNew = false): Promise<Bio> {
  if (!draft) throw new Error('Choose a bio first.');
  if (!draft.name.trim() || !draft.displayName.trim()) throw new Error('Give your bio a saved name and a display name first.');
  const { id, ...body } = draft;
  const { bio } = await api<{ bio: Bio }>(id && !asNew ? `/api/bios/${encodeURIComponent(id)}` : '/api/bios', id && !asNew ? 'PUT' : 'POST', body);
  const existing = bios.findIndex((item) => item.id === bio.id);
  if (existing < 0) bios.unshift(bio); else bios[existing] = bio;
  draft = fromBio(bio);
  dirty = false;
  return bio;
}

function renderDiscovery(): void {
  title('Discover fellow fans');
  shell(`<div class="page"><div class="page-heading"><p class="eyebrow">THERE’S SOMEONE WHO GETS IT</p><h1>Your next fandom friend?</h1><p class="lead">Find fans who share the things you love.</p></div><section class="panel discovery-toolbar"><div class="field"><label class="field-label" for="discover-search">Find your common ground</label><input class="input tag-search" id="discover-search" type="search" placeholder="Search Frieren, Fern × Stark, sketch swaps…" value="${e(discoverQuery)}" autocomplete="off" aria-describedby="discover-help" aria-controls="discover-suggestions"><p class="help-text" id="discover-help">Each result matches every selected tag. A character or pairing also counts toward its fandom.</p></div><div id="discover-tags">${tagSelection(filters, 'discover')}</div><div id="discover-suggestions" class="tag-suggestions">${suggestions(discoverQuery, filters, 'discover')}</div><div class="discovery-filter-footer"><button class="button ghost small" data-action="clear-filters" ${filters.length ? '' : 'disabled'}>Clear filters</button></div></section><section id="discovery-results" aria-live="polite"><div class="loading-state" role="status"><span class="spinner" aria-hidden="true"></span>Looking for your people…</div></section></div>`);
}

async function search(): Promise<void> {
  const generation = ++searchGeneration;
  const results = document.querySelector('#discovery-results');
  results?.setAttribute('aria-busy', 'true');
  try {
    const { cards } = await api<{ cards: PublicCard[] }>(`/api/discover?tags=${encodeURIComponent(filters.join(','))}`);
    if (generation !== searchGeneration || location.pathname !== '/discover') return;
    const target = document.querySelector('#discovery-results');
    if (!target) return;
    target.removeAttribute('aria-busy');
    target.innerHTML = `<div class="section-heading"><h2>${cards.length ? 'A little in common. A place to start.' : 'Make room for a new connection.'}</h2><p class="results-count">${cards.length} ${cards.length === 1 ? 'fan' : 'fans'} open to new friends · Newest listed first</p></div>${cards.length ? `<div class="discovery-grid">${cards.map((card) => `<div class="discovery-item">${renderCard(card, catalog)}<a class="button secondary wide" href="/u/${e(card.handle)}" data-nav>Meet ${e(card.displayName)}</a></div>`).join('')}</div>` : `<div class="empty-state"><span class="empty-icon" aria-hidden="true">✳</span><h3>${filters.length ? 'No one here just yet.' : 'A new corner of the internet.'}</h3><p>${filters.length ? 'Try fewer tags or a broader fandom. Your people may be a little further out.' : 'No other fans have opted into discovery yet. Publish a bio and turn on Open to New Friends to be part of it.'}</p>${filters.length ? '<button class="button secondary" data-action="clear-filters">Show all open bios</button>' : '<a class="button primary" href="/editor" data-nav>Go to my bio</a>'}</div>`}`;
  } catch (error) {
    if (generation !== searchGeneration) return;
    const target = document.querySelector('#discovery-results');
    if (target) { target.removeAttribute('aria-busy'); target.innerHTML = `<div class="empty-state"><h2>Discovery couldn’t load.</h2><p>${e(error instanceof Error ? error.message : 'Please try again.')}</p><button class="button secondary" data-action="retry-search">Try again</button></div>`; }
  }
}

async function action(button: HTMLElement): Promise<void> {
  const name = button.dataset.action;
  const id = button.dataset.id ?? '';
  if (name === 'close-toast') { toastRegion.innerHTML = ''; return; }
  if (name === 'retry') { await route(); return; }
  if (name === 'retry-search') { await search(); return; }
  if (name === 'logout') {
    if (!mayDiscard()) return;
    await api('/api/auth/logout', 'POST');
    user = null; draft = null; bios = []; publication = null; dirty = false; filters = [];
    await navigate('/'); return;
  }
  if (name === 'new-bio' || name === 'select-bio') {
    if (!mayDiscard()) return;
    draft = name === 'new-bio' ? newDraft() : fromBio(bios.find((bio) => bio.id === id)!);
    if (name === 'new-bio' && bios.length) draft.name = 'Untitled bio';
    dirty = false; editorQuery = ''; renderEditor(); return;
  }
  if (name === 'add-tag' || name === 'remove-tag') {
    const discover = button.dataset.context === 'discover';
    const ids = discover ? filters : draft!.tagIds;
    const next = name === 'add-tag' ? [...new Set([...ids, id])] : ids.filter((item) => item !== id);
    if (discover) { filters = next; discoverQuery = ''; renderDiscovery(); document.querySelector<HTMLElement>('#discover-search')?.focus({ preventScroll: true }); void search(); }
    else {
      draft!.tagIds = next; dirty = true; editorQuery = '';
      document.querySelector('#editor-tags')!.innerHTML = tagSelection(next, 'editor');
      document.querySelector('#editor-suggestions')!.innerHTML = suggestions('', next, 'editor');
      const input = document.querySelector<HTMLInputElement>('#editor-search')!; input.value = ''; input.focus({ preventScroll: true }); updateEditor();
    }
    return;
  }
  if (name === 'clear-filters') { filters = []; discoverQuery = ''; renderDiscovery(); void search(); return; }
  if (name === 'template' || name === 'font' || name === 'palette' || name === 'reset-style') {
    if (!draft) return;
    if (name === 'template') draft.templateId = id;
    if (name === 'font') draft.font = id;
    if (name === 'palette') draft.palette = id;
    if (name === 'reset-style') { draft.font = null; draft.palette = null; }
    dirty = true; renderKeepingFocus(renderEditor); return;
  }
  if (name === 'save' || name === 'save-as-new') { await save(name === 'save-as-new'); renderEditor(); toast('Bio saved. Looking good.'); return; }
  if (name === 'publish') {
    if (!draft) return;
    if (dirty || !draft.id) await save();
    if (publication?.item !== draft!.id) {
      const data = await api<{ publication: Publication }>('/api/publication', 'POST', { bioId: draft!.id });
      publication = data.publication;
    }
    renderEditor(); toast('Your bio is public at your link.'); return;
  }
  if (name === 'unpublish') {
    if (!window.confirm('Unpublish your public bio? Your saved bios will stay private, and discovery will turn off.')) return;
    await api('/api/publication', 'DELETE'); publication = null; renderEditor(); toast('Your bio is now private.'); return;
  }
  if (name === 'delete-bio') {
    if (!draft?.id || !window.confirm(`Delete “${draft.name}”?${publication?.item === draft.id ? ' This also removes your public card and discovery listing.' : ''} This cannot be undone.`)) return;
    await api(`/api/bios/${encodeURIComponent(draft.id)}`, 'DELETE');
    if (publication?.item === draft.id) publication = null;
    bios = bios.filter((bio) => bio.id !== draft!.id); draft = bios.length ? fromBio(bios[0]!) : newDraft(); dirty = false; renderEditor(); toast('Bio deleted.'); return;
  }
  if (name === 'copy-link') {
    const link = `${location.origin}/u/${user!.handle}`;
    try { await navigator.clipboard.writeText(link); toast('Public link copied.'); }
    catch { toast(`Your public link: ${link}`); }
  }
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest<HTMLAnchorElement>('a[data-nav]');
  if (anchor && event instanceof MouseEvent && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); if (!busy) void navigate(anchor.pathname + anchor.search); return; }
  const button = event.target.closest<HTMLElement>('[data-action]');
  if (!button || busy || (button instanceof HTMLButtonElement && button.disabled)) return;
  event.preventDefault();
  busy = true;
  const mutating = ['logout', 'save', 'save-as-new', 'publish', 'unpublish', 'delete-bio', 'copy-link'].includes(button.dataset.action ?? '');
  if (mutating) pending(true);
  if (button instanceof HTMLButtonElement) button.disabled = true;
  void action(button).catch((error: unknown) => { toast(error instanceof Error ? error.message : 'Please try again.', true); }).finally(() => { busy = false; if (mutating) pending(false); if (button instanceof HTMLButtonElement) button.disabled = false; });
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
  if (input.id === 'editor-search' || input.id === 'discover-search') {
    const discover = input.id === 'discover-search';
    if (discover) discoverQuery = input.value; else editorQuery = input.value;
    document.querySelector(discover ? '#discover-suggestions' : '#editor-suggestions')!.innerHTML = suggestions(input.value, discover ? filters : draft!.tagIds, discover ? 'discover' : 'editor');
    return;
  }
  if (draft && (input.dataset.field === 'name' || input.dataset.field === 'displayName' || input.dataset.field === 'note')) {
    draft[input.dataset.field] = input.value; dirty = true; updateEditor();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowDown' || !(event.target instanceof HTMLInputElement)) return;
  if (event.target.id !== 'editor-search' && event.target.id !== 'discover-search') return;
  event.preventDefault();
  document.querySelector<HTMLElement>(event.target.id === 'editor-search' ? '#editor-suggestions button' : '#discover-suggestions button')?.focus();
});

document.addEventListener('change', (event) => {
  if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'listing-toggle') return;
  const input = event.target;
  if (busy) { input.checked = publication?.listed ?? false; return; }
  const requested = input.checked;
  busy = true;
  pending(true);
  input.disabled = true;
  void api<{ publication: Publication }>('/api/publication/listing', 'PUT', { listed: requested }).then((data) => {
    publication = data.publication;
    // Preserve an unsaved editor draft while updating its publishing controls.
    renderEditor(); toast(requested ? 'You’re open to new friends.' : 'Discovery is off. Your public link still works.');
  }).catch((error: unknown) => { input.checked = !requested; toast(error instanceof Error ? error.message : 'Please try again.', true); }).finally(() => { busy = false; pending(false); input.disabled = false; });
});

document.addEventListener('submit', (event) => {
  if (!(event.target instanceof HTMLFormElement)) return;
  const form = event.target;
  if (form.id !== 'auth-form' && form.id !== 'handle-form') return;
  event.preventDefault();
  if (busy) return;
  busy = true;
  pending(true);
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  submit.disabled = true;
  const data = new FormData(form);
  const task = async () => {
    if (form.id === 'auth-form') {
      const register = form.dataset.register === 'true';
      const response = await api<{ user: User }>(`/api/auth/${register ? 'register' : 'login'}`, 'POST', { username: data.get('username'), password: data.get('password'), ...(register ? { adult: data.get('adult') === 'on' } : {}) });
      user = response.user;
      const next = new URLSearchParams(location.search).get('next');
      await navigate(next === '/discover' ? '/discover' : '/editor', true);
      toast(register ? 'Welcome to your corner of the fandom.' : 'Welcome back.');
    } else {
      const response = await api<{ user: User }>('/api/handle', 'POST', { handle: data.get('handle') });
      user = response.user; renderEditor(); toast('Your public handle is reserved.');
    }
  };
  void task().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Please try again.';
    const errorRegion = form.querySelector('#auth-error');
    if (errorRegion) errorRegion.textContent = message; else toast(message, true);
  }).finally(() => { busy = false; pending(false); submit.disabled = false; });
});

window.addEventListener('popstate', (event: PopStateEvent) => {
  if (restoringHistory) { restoringHistory = false; return; }
  const nextPosition = typeof event.state?.ffPosition === 'number' ? event.state.ffPosition as number : historyPosition - 1;
  if (busy || (dirty && !window.confirm('Leave this bio without saving your changes?'))) {
    restoringHistory = true;
    history.go(historyPosition - nextPosition);
    return;
  }
  historyPosition = nextPosition;
  dirty = false; draft = null; void route();
});
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

async function start(): Promise<void> {
  try {
    const [catalogResponse, me] = await Promise.all([api<Catalog>('/api/catalog'), api<{ user: User | null }>('/api/me')]);
    catalog = catalogResponse; user = me.user;
    await route();
  } catch (error) {
    title('Couldn’t connect');
    shell(`<div class="page page-narrow empty-state"><h1>We couldn’t connect.</h1><p>${e(error instanceof Error ? error.message : 'Please check your connection.')}</p><button class="button primary" data-action="reload">Try again</button></div>`);
    document.querySelector('[data-action="reload"]')?.addEventListener('click', () => location.reload());
  }
}
void start();
