/**
 * The pictures on a bio card: a row of prints under the name, and a small round picture beside each tag.
 *
 * The pictures themselves are links in ../seed/pictures.ts; the browser loads them from AniList. This file only
 * decides where they go on the card. mvp-card.ts calls these while it writes the card, so the live preview, the
 * public page, and the search results all show the same thing. A card with no pictures gets nothing from here.
 */
import { pictureCredit, pictureOf, picturesFor } from "../seed/pictures.ts";
import type { Catalog, Tag } from "./mvp-types.ts";

/** The row of prints holds at most this many places; with more pictures the last place says how many are left. */
const PRINTS = 6;

const escape = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Every picture is asked for without saying which page wanted it, and only once it is near the screen. */
const image = (className: string, source: string, alt: string): string =>
  `<img class="${className}" src="${escape(source)}" alt="${escape(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;

/** The names of the tags this one lies directly under. A catalog may hold them as tag identities or as names. */
const under = (tag: Tag, catalog: Catalog): string[] =>
  tag.parents.map((parent) => catalog.tags.find((other) => other.id === parent)?.name ?? parent);

const showsAny = (tags: readonly Tag[], catalog: Catalog): boolean =>
  tags.some((tag) => picturesFor(tag.name, under(tag, catalog)).length > 0);

/** The row of prints under the name: each tag's own picture, in the order the card lists its tags. */
export function pictureRow(tags: readonly Tag[]): string {
  const prints = tags.flatMap((tag) => {
    const picture = pictureOf(tag.name);
    return picture ? [{ name: tag.name, picture }] : [];
  });
  if (prints.length === 0) return "";
  const shown = prints.length > PRINTS ? prints.slice(0, PRINTS - 1) : prints;
  const more = prints.length - shown.length;
  return `<div class="card-pictures">${shown
    .map(({ name, picture }) => `<figure class="card-picture">${image("card-picture-image", picture.image, name)}</figure>`)
    .join("")}${more ? `<p class="card-picture card-picture-more" aria-label="and ${more} more">+${more}</p>` : ""}</div>`;
}

/** The small round pictures before a tag's name: its own, or for a pairing its two characters'. */
export function tagPictures(tag: Tag, catalog: Catalog): string {
  const pictures = picturesFor(tag.name, under(tag, catalog));
  if (pictures.length === 0) return "";
  // The name is written right after these, so the pictures add nothing for a screen reader.
  return `<span class="card-avatars" aria-hidden="true">${pictures.map((picture) => image("card-avatar", picture.image, "")).join("")}</span>`;
}

/** Says where the pictures come from. Shown on every card that shows a picture, and on no other. */
export function pictureCreditLine(tags: readonly Tag[], catalog: Catalog): string {
  if (!showsAny(tags, catalog)) return "";
  const [before, after] = pictureCredit.text.split("AniList");
  return `<p class="card-credit">${escape(before ?? "")}<a href="${escape(pictureCredit.page)}" target="_blank" rel="noopener noreferrer">AniList</a>${escape(after ?? "")}</p>`;
}

/**
 * Takes a picture off the card when it cannot be loaded, so a card never shows a broken image.
 * Call once. A load failure does not bubble, so this listens on the way down instead.
 */
export function hideBrokenCardPictures(root: Document = document): void {
  root.addEventListener(
    "error",
    (event) => {
      const failed = event.target;
      if (!(failed instanceof HTMLImageElement)) return;
      if (failed.classList.contains("card-avatar")) {
        const group = failed.parentElement;
        failed.remove();
        if (group && group.childElementCount === 0) {
          group.closest(".card-tag")?.classList.remove("has-picture");
          group.remove();
        }
      } else if (failed.classList.contains("card-picture-image")) {
        const row = failed.closest(".card-pictures");
        failed.closest(".card-picture")?.remove();
        if (row && row.querySelector(".card-picture-image") === null) row.remove();
      }
    },
    true,
  );
}

/** The styles for the pictures. They use the card's own colors, so they follow its color scheme. */
export const cardPictureStyles = `
.card.bio-card .card-pictures { display: flex; gap: 10px; margin: 4px 0 24px; padding: 4px 3px 6px; position: relative; z-index: 1; }
.card.bio-card .card-picture { flex: 1 1 0; min-width: 0; max-width: 96px; margin: 0; aspect-ratio: 2 / 3; overflow: hidden; border-radius: 10px; border: 3px solid #fff; background: var(--card-soft); box-shadow: 0 0 0 1px var(--card-line), 0 8px 16px #1b2a5a22; transform: rotate(-2.2deg); }
.card.bio-card .card-picture:nth-child(2n) { transform: rotate(1.6deg) translateY(4px); }
.card.bio-card .card-picture:nth-child(3n) { transform: rotate(-.7deg) translateY(-2px); }
.card.bio-card .card-picture-image { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 18%; }
.card.bio-card .card-picture-more { display: grid; place-items: center; color: var(--card-accent); font-size: 15px; font-weight: 750; line-height: 1; }
.card.bio-card .card-tag.has-picture { display: inline-flex; align-items: center; gap: 7px; }
.card.bio-card:is([data-layout="minimal"],[data-layout="Spotlight"]) .card-tag.has-picture:not(:last-child)::after { margin-left: -7px; }
.card.bio-card .card-avatars { display: inline-flex; flex: none; }
.card.bio-card .card-avatar { display: block; width: 28px; height: 28px; max-width: none; border-radius: 50%; object-fit: cover; object-position: center 12%; border: 2px solid #fff; background: var(--card-soft); box-shadow: 0 0 0 1px var(--card-line); }
.card.bio-card .card-avatar + .card-avatar { margin-left: -10px; }
.card.bio-card .card-credit { margin: 20px 0 0; font-size: 10px; line-height: 1.5; color: var(--card-accent); position: relative; z-index: 1; }
.card.bio-card .card-credit a { color: inherit; }
@media (max-width: 540px) {
.card.bio-card .card-pictures { gap: 7px; }
.card.bio-card .card-picture { border-width: 2px; border-radius: 8px; }
}
@media (prefers-reduced-motion: no-preference) {
.card.bio-card .card-picture { transition: transform .18s ease; }
.card.bio-card .card-picture:hover { transform: rotate(0deg) translateY(-3px) scale(1.04); }
}
`;
