import { httpPolicy, type HttpPolicy, type HttpPublicErrorCategory } from "@mit-sdg/sync-engine-http/policy";
import { registrations } from "../concepts.ts";

/**
 * Each refusal a caller may see, with the public category (and so the HTTP status) it is reported under.
 * A refusal that is not listed here reaches the browser as INTERNAL_ERROR, so add every new code.
 * tests/http/Refusals.http.test.ts fails when a concept declares a code that is missing here.
 */
export const publicErrors: Readonly<Record<string, HttpPublicErrorCategory>> = Object.freeze({
  // Authenticating
  INVALID_USERNAME: "INVALID_REQUEST",
  WEAK_PASSWORD: "INVALID_REQUEST",
  USERNAME_TAKEN: "CONFLICT",
  INVALID_CREDENTIALS: "UNAUTHORIZED",
  // Sessioning
  NOT_SIGNED_IN: "UNAUTHORIZED",
  // Drafting
  INVALID_DRAFT_NAME: "INVALID_REQUEST",
  DRAFT_NAME_TAKEN: "CONFLICT",
  DRAFT_NOT_FOUND: "NOT_FOUND",
  // Tagging
  INVALID_TAG_NAME: "INVALID_REQUEST",
  TAG_NOT_FOUND: "NOT_FOUND",
  TAG_ALREADY_ADDED: "CONFLICT",
  TAG_NOT_ADDED: "CONFLICT",
  // Synonymizing
  SYNONYM_OF_ITSELF: "INVALID_REQUEST",
  SYNONYM_ALREADY_LINKED: "CONFLICT",
  SYNONYM_CANONICAL_LINKED: "CONFLICT",
  SYNONYM_IS_CANONICAL: "CONFLICT",
  SYNONYM_NOT_LINKED: "CONFLICT",
  // Grouping
  GROUP_SAME_ITEM: "INVALID_REQUEST",
  GROUP_ALREADY_PLACED: "CONFLICT",
  GROUP_CYCLE: "CONFLICT",
  GROUP_NOT_PLACED: "CONFLICT",
  // Templating
  INVALID_TEMPLATE_NAME: "INVALID_REQUEST",
  INVALID_LOOK_LAYOUT: "INVALID_REQUEST",
  INVALID_LOOK_FONT: "INVALID_REQUEST",
  INVALID_LOOK_PALETTE: "INVALID_REQUEST",
  TEMPLATE_NAME_TAKEN: "CONFLICT",
  TEMPLATE_NOT_FOUND: "NOT_FOUND",
  TEMPLATE_ALREADY_DEFAULT: "CONFLICT",
  TEMPLATE_IS_DEFAULT: "CONFLICT",
  TEMPLATE_IN_USE: "CONFLICT",
  TEMPLATE_ALREADY_APPLIED: "CONFLICT",
  LOOK_NOT_CUSTOMIZED: "CONFLICT",
  LOOK_NOT_SET: "CONFLICT",
  // Publishing
  HANDLE_ALREADY_CLAIMED: "CONFLICT",
  INVALID_HANDLE: "INVALID_REQUEST",
  HANDLE_TAKEN: "CONFLICT",
  HANDLE_REQUIRED: "CONFLICT",
  ALREADY_PUBLISHED: "CONFLICT",
  NOTHING_PUBLISHED: "CONFLICT",
  ALREADY_LISTED: "CONFLICT",
  NOT_LISTED: "CONFLICT",
  NO_HANDLE: "CONFLICT",
  STILL_PUBLISHED: "CONFLICT",
  // Answered by an endpoint itself, not by a concept
  BIO_NOT_FOUND: "NOT_FOUND",
  CARD_NOT_FOUND: "NOT_FOUND",
});

/**
 * The application's own wording. A concept's sentence is written for any application ("The item already has
 * this tag."); these say the same thing in this application's words. A code that is not here keeps the
 * sentence from its concept's specification.
 */
const applicationSentences: Readonly<Record<string, string>> = Object.freeze({
  // Answered by an endpoint itself
  BIO_NOT_FOUND: "There is no such bio among your saved bios.",
  CARD_NOT_FOUND: "Nobody is displaying a bio at that handle.",
  // Drafting: a draft is a saved bio
  INVALID_DRAFT_NAME: "A bio name must not be blank and must be at most 80 characters.",
  DRAFT_NAME_TAKEN: "You already have a bio with this name.",
  DRAFT_NOT_FOUND: "There is no such bio among your saved bios.",
  // Tagging: the item is a bio
  TAG_ALREADY_ADDED: "This bio already has that tag.",
  TAG_NOT_ADDED: "This bio does not have that tag.",
  // Templating: the item is a bio
  TEMPLATE_ALREADY_APPLIED: "This bio already uses that template.",
  LOOK_NOT_CUSTOMIZED: "This bio has no font or color scheme of its own.",
  // Publishing: publishing is displaying a bio, and listing is being open to new friends
  HANDLE_REQUIRED: "Claim a handle before you display a bio.",
  ALREADY_PUBLISHED: "This bio is already displayed.",
  NOTHING_PUBLISHED: "You are not displaying a bio.",
  ALREADY_LISTED: "You are already open to new friends.",
  NOT_LISTED: "You are not open to new friends.",
  STILL_PUBLISHED: "Stop displaying your bio before you release your handle.",
});

/** Every concept refusal's sentence, read from the specifications. */
const conceptSentences: Readonly<Record<string, string>> = Object.fromEntries(
  registrations.flatMap(({ specification }) =>
    specification.actions.flatMap(({ refusals }) => refusals.map(({ code, message }) => [code, message] as const)),
  ),
);

/** The sentence a page can show for a refusal code, or undefined for a code with no sentence. */
export function refusalSentence(code: string): string | undefined {
  if (Object.hasOwn(applicationSentences, code)) return applicationSentences[code];
  return Object.hasOwn(conceptSentences, code) ? conceptSentences[code] : undefined;
}

/** Every refusal code a concept declares. */
export const conceptRefusalCodes: readonly string[] = Object.keys(conceptSentences);

/** The browser policy: the API lives under /api, and HTTP owns the session cookie. */
export function fandomFriendsPolicy(publicOrigin: string): HttpPolicy {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    publicErrors,
    cookies: {
      session: {
        name: "fandom-friends-session",
        input: "session",
        issue: [
          { path: "/auth/register", value: "session", expires: "expiresAt" },
          { path: "/auth/sign-in", value: "session", expires: "expiresAt" },
        ],
        clear: ["/auth/sign-out"],
      },
    },
  });
}
