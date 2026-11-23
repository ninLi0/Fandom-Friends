import type { Catalog, Look, PublicCard } from './types.js';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const e = escapeHtml;
const groups = [
  { key: 'fandom', label: 'My fandoms' },
  { key: 'character', label: 'Favorite characters' },
  { key: 'pairing', label: 'Pairings I love' },
  { key: 'interest', label: 'Let’s connect over' },
] as const;

export function renderCard(card: Pick<PublicCard, 'displayName' | 'note' | 'tagIds' | 'look'> & { handle?: string | null; listed?: boolean }, catalog: Catalog, example = false): string {
  const sections = groups.map(({ key, label }) => {
    const tags = catalog.tags.filter((tag) => tag.category === key && card.tagIds.includes(tag.id));
    return tags.length ? `<section class="card-tag-group"><h3 class="card-group-label">${label}</h3><div class="card-tag-list">${tags.map((tag) => `<span class="card-tag">${e(tag.name)}</span>`).join('')}</div></section>` : '';
  }).join('');
  return `<article class="bio-card" data-layout="${e(card.look.layout)}" data-font="${e(card.look.font)}" data-palette="${e(card.look.palette)}" aria-label="${e(card.displayName || 'Your')} bio card">
    <div class="card-topline"><span class="card-eyebrow">${example ? 'EXAMPLE CARD' : 'A LITTLE ABOUT ME'}</div>
    <div class="card-identity"><h2 class="card-name">${e(card.displayName || 'Your name here')}</h2></div>
    ${card.note ? `<p class="card-note">${e(card.note)}</p>` : ''}
    <div class="card-divider"></div><div class="card-tags">${sections || '<p class="card-empty">A favorite character. A niche pairing.<br>Add some tags and make yourself at home.</p>'}</div>
    <div class="card-footer"><span>fandom friends</span>${card.listed ? '<span class="card-open">Open to new friends</span>' : '<span aria-hidden="true">✳</span>'}</div>
  </article>`;
}

export function effectiveLook(draft: { templateId: string; font: string | null; palette: string | null }, catalog: Catalog): Look {
  const template = catalog.templates.find((item) => item.id === draft.templateId) ?? catalog.templates[0]!;
  return { template: template.id, layout: template.layout, font: draft.font ?? template.font, palette: draft.palette ?? template.palette };
}
