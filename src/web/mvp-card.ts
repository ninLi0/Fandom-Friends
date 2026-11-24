/** Card markup retained from local MVP commit 89c72bf. */
import { pictureCreditLine, pictureRow, tagPictures } from './card-pictures.ts';
import type { Catalog, Look, PublicCard } from './mvp-types.ts';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const e = escapeHtml;
const groups = [
  { key: 'fandom', label: 'My fandoms' },
  { key: 'character', label: 'Favorite characters' },
  { key: 'pairing', label: 'Pairings I love' },
  { key: 'interest', label: 'Let’s connect over' },
] as const;

export function renderCard(card: Pick<PublicCard, 'displayName' | 'note' | 'tagIds' | 'look'> & { handle?: string | null; listed?: boolean }, catalog: Catalog, example = false): string {
  const tagsIn = (key: string) => catalog.tags.filter((tag) => tag.category === key && card.tagIds.includes(tag.id));
  // The card's tags in the order it lists them, for the pictures (see card-pictures.ts).
  const listed = groups.flatMap(({ key }) => tagsIn(key));
  const sections = groups.map(({ key, label }) => {
    const tags = tagsIn(key);
    return tags.length ? `<section class="card-tag-group"><h3 class="card-group-label">${label}</h3><div class="card-tag-list">${tags.map((tag) => {
      const pictures = tagPictures(tag, catalog);
      return `<span class="card-tag${pictures ? ' has-picture' : ''}">${pictures}${e(tag.name)}</span>`;
    }).join('')}</div></section>` : '';
  }).join('');
  return `<article class="card bio-card" data-layout="${e(card.look.layout)}" data-font="${e(card.look.font)}" data-palette="${e(card.look.palette)}" aria-label="${e(card.displayName || 'Your')} bio card">
    <div class="card-identity"><h2 class="card-name">${e(card.displayName || 'Your name here')}</h2></div>
    ${card.note ? `<p class="card-note">${e(card.note)}</p>` : ''}
    ${pictureRow(listed)}
    <div class="card-divider"></div><div class="card-tags">${sections || '<p class="card-empty">A favorite character. A niche pairing.<br>Add some tags and make yourself at home.</p>'}</div>
    ${pictureCreditLine(listed, catalog)}
  </article>`;
}

export function effectiveLook(draft: { templateId: string; font: string | null; palette: string | null }, catalog: Catalog): Look {
  const template = catalog.templates.find((item) => item.id === draft.templateId) ?? catalog.templates[0]!;
  return { template: template.id, layout: template.layout, font: draft.font ?? template.font, palette: draft.palette ?? template.palette };
}
