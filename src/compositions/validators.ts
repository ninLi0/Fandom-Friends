/**
 * Runtime endpoint validators shared by the composition modules.
 *
 * Generated TypeScript types constrain callers that compile against the wire. These functions reject the
 * untyped values a real request can carry. This module holds no declarations, so assembly never walks it.
 *
 * The helpers and the sign-in validators are adapted from the message-board example in @mit-sdg/sync-engine
 * 1.2.0 (Apache-2.0). See THIRD_PARTY_NOTICES.md.
 */
import type { EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { mostSearchedTags } from "../computations.ts";

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasOnly(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function validator(accepts: (value: Record<string, unknown>) => boolean, detail: string): EndpointValidator {
  return (value) => (record(value) && accepts(value) ? { ok: true } : { ok: false, detail });
}

/** A nonempty string no longer than `max` characters. */
export function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

/** A session input always arrives from the cookie binding, or not at all. */
export function fromCookie(value: Record<string, unknown>): boolean {
  return typeof value.session === "string" || value.session === null;
}

export const credentialsInput = validator(
  (value) =>
    hasOnly(value, ["username", "password"]) &&
    typeof value.username === "string" &&
    typeof value.password === "string" &&
    value.username.length <= 32 &&
    value.password.length <= 128,
  "username and password must be bounded strings",
);

export const sessionOnlyInput = validator(
  (value) => hasOnly(value, ["session"]) && fromCookie(value),
  "session must come from the cookie",
);

export const issuedSessionOutput = validator(
  (value) =>
    hasOnly(value, ["username", "session", "expiresAt"]) &&
    typeof value.username === "string" &&
    typeof value.session === "string" &&
    value.expiresAt instanceof Date,
  "response must contain username, session, and Date expiry",
);

export const usernameOutput = validator(
  (value) => hasOnly(value, ["username"]) && typeof value.username === "string",
  "response must contain a username",
);

export const signedOutOutput = validator(
  (value) => hasOnly(value, ["signedOut"]) && value.signedOut === true,
  "response must confirm sign-out",
);

/** An identity the application handed out earlier: a bio, a tag, or a template. */
function identity(value: unknown): value is string {
  return text(value, 128);
}

/** Text a concept will judge. The bound only keeps a request small; the concept gives the real reason. */
function words(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200;
}

function nullable(value: unknown, accepts: (value: unknown) => boolean): boolean {
  return value === null || accepts(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function rows(value: unknown, accepts: (row: Record<string, unknown>) => boolean): boolean {
  return Array.isArray(value) && value.every((row) => record(row) && accepts(row));
}

/** A card: the bio's tags with what each lies under, and the look in effect (blank when no template exists). */
export function validCard(value: unknown): boolean {
  if (!record(value) || !hasOnly(value, ["tags", "look"])) return false;
  const tagsValid = rows(
    value.tags,
    (tag) =>
      hasOnly(tag, ["tag", "name", "under"]) &&
      isString(tag.tag) &&
      isString(tag.name) &&
      rows(
        tag.under,
        (broader) =>
          hasOnly(broader, ["tag", "name", "direct"]) &&
          isString(broader.tag) &&
          isString(broader.name) &&
          typeof broader.direct === "boolean",
      ),
  );
  const look = value.look;
  return (
    tagsValid &&
    record(look) &&
    hasOnly(look, ["template", "layout", "font", "palette"]) &&
    nullable(look.template, isString) &&
    nullable(look.layout, isString) &&
    nullable(look.font, isString) &&
    nullable(look.palette, isString)
  );
}

export const noInput = validator((value) => hasOnly(value, []), "this request takes no input");

export const bioNameInput = validator(
  (value) => hasOnly(value, ["session", "name"]) && fromCookie(value) && words(value.name),
  "name must be text and session must come from the cookie",
);

export const bioOnlyInput = validator(
  (value) => hasOnly(value, ["session", "bio"]) && fromCookie(value) && identity(value.bio),
  "bio must be a bio identity and session must come from the cookie",
);

export const bioRenameInput = validator(
  (value) =>
    hasOnly(value, ["session", "bio", "name"]) && fromCookie(value) && identity(value.bio) && words(value.name),
  "bio must be a bio identity, name must be text, and session must come from the cookie",
);

export const bioTagInput = validator(
  (value) =>
    hasOnly(value, ["session", "bio", "tag"]) && fromCookie(value) && identity(value.bio) && identity(value.tag),
  "bio and tag must be identities and session must come from the cookie",
);

export const bioTemplateInput = validator(
  (value) =>
    hasOnly(value, ["session", "bio", "template"]) &&
    fromCookie(value) &&
    identity(value.bio) &&
    identity(value.template),
  "bio and template must be identities and session must come from the cookie",
);

/** A bio with one choice from a fixed list, such as a font or a color scheme. */
export function bioChoiceInput(field: string, offered: readonly string[]) {
  return validator(
    (value) =>
      hasOnly(value, ["session", "bio", field]) &&
      fromCookie(value) &&
      identity(value.bio) &&
      offered.includes(value[field] as string),
    `${field} must be one of ${offered.join(", ")}`,
  );
}

export const claimInput = validator(
  (value) => hasOnly(value, ["session", "handle"]) && fromCookie(value) && words(value.handle),
  "handle must be text and session must come from the cookie",
);

export const handleInput = validator(
  (value) => hasOnly(value, ["handle"]) && words(value.handle),
  "handle must be text",
);

export const suggestInput = validator(
  (value) => hasOnly(value, ["text"]) && typeof value.text === "string" && value.text.length <= 64,
  "text must be at most 64 characters",
);

export const searchInput = validator(
  (value) =>
    hasOnly(value, ["session", "tags"]) &&
    fromCookie(value) &&
    Array.isArray(value.tags) &&
    value.tags.length <= mostSearchedTags &&
    value.tags.every(identity),
  `tags must be at most ${mostSearchedTags} tag identities and session must come from the cookie`,
);

export const savedBiosOutput = validator(
  (value) =>
    hasOnly(value, ["bios"]) &&
    rows(value.bios, (bio) => hasOnly(bio, ["bio", "name"]) && isString(bio.bio) && isString(bio.name)),
  "response must list bios with their names",
);

export const bioOutput = validator(
  (value) => hasOnly(value, ["bio"]) && isString(value.bio),
  "response must contain a bio identity",
);

export const ownBioOutput = validator(
  (value) =>
    hasOnly(value, ["bio", "name", "card"]) && isString(value.bio) && isString(value.name) && validCard(value.card),
  "response must contain a bio, its name, and its card",
);

export const bioCardOutput = validator(
  (value) => hasOnly(value, ["bio", "card"]) && isString(value.bio) && validCard(value.card),
  "response must contain a bio and its card",
);

export const sharingOutput = validator(
  (value) => {
    const sharing = value.sharing;
    return (
      hasOnly(value, ["sharing"]) &&
      record(sharing) &&
      hasOnly(sharing, ["handle", "displayed", "open"]) &&
      nullable(sharing.handle, isString) &&
      nullable(sharing.displayed, isString) &&
      nullable(sharing.open, (open) => typeof open === "boolean")
    );
  },
  "response must contain the handle, the displayed bio, and whether it is open, each possibly blank",
);

export const handleOutput = validator(
  (value) => hasOnly(value, ["handle"]) && isString(value.handle),
  "response must contain a handle",
);

export const releasedOutput = validator(
  (value) => hasOnly(value, ["released"]) && value.released === true,
  "response must confirm the release",
);

export const openOutput = validator(
  (value) => hasOnly(value, ["open"]) && typeof value.open === "boolean",
  "response must say whether the bio is open to new friends",
);

export const publicCardOutput = validator(
  (value) => hasOnly(value, ["handle", "card"]) && isString(value.handle) && validCard(value.card),
  "response must contain a handle and its card",
);

export const tagsOutput = validator(
  (value) =>
    hasOnly(value, ["tags"]) &&
    rows(
      value.tags,
      (tag) =>
        hasOnly(tag, ["tag", "name", "main", "mainName"]) &&
        isString(tag.tag) &&
        isString(tag.name) &&
        isString(tag.main) &&
        isString(tag.mainName),
    ),
  "response must list tags with their names and main tags",
);

export const templatesOutput = validator(
  (value) =>
    hasOnly(value, ["templates"]) &&
    rows(
      value.templates,
      (template) =>
        hasOnly(template, ["template", "name", "layout", "font", "palette", "default"]) &&
        isString(template.template) &&
        isString(template.name) &&
        isString(template.layout) &&
        isString(template.font) &&
        isString(template.palette) &&
        typeof template.default === "boolean",
    ),
  "response must list templates with their look",
);

export const searchOutput = validator(
  (value) =>
    hasOnly(value, ["people"]) &&
    rows(
      value.people,
      (person) =>
        hasOnly(person, ["handle", "listedOn", "card"]) &&
        isString(person.handle) &&
        person.listedOn instanceof Date &&
        validCard(person.card),
    ),
  "response must list people with their handle, listing time, and card",
);
