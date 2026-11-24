/**
 * The typed client every page uses, and how a refused request is read.
 *
 * Each call returns the endpoint's output or a refusal. Check `refused(result)` first:
 *
 *   const result = await api.bios.start({ name });
 *   if (refused(result)) return say(reason(result));
 *   open(result.bio);
 *
 * The call names follow the paths: /bios/tags/add is api.bios.tags.add, /auth/sign-in is api.auth["sign-in"].
 * The session is a cookie the browser sends by itself, so no call passes it.
 */
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { FandomFriendsHttp } from "../../generated/wire.ts";

export const api = createHttpClient<FandomFriendsHttp>({ baseUrl: "/api" });

/** A refused request: a category, the refusal's own code when a rule refused it, and a sentence to show. */
export interface Refusal {
  error: string;
  code?: string;
  detail?: string;
}

/** True when a call was refused. After this check, the other branch has the endpoint's output. */
export function refused<Result extends object>(result: Result): result is Extract<Result, { error: unknown }> {
  return "error" in result;
}

/** The refusal's own code, such as HANDLE_REQUIRED, for a page that treats one refusal specially. */
export function codeOf(refusal: { error: unknown }): string | undefined {
  return (refusal as Refusal).code;
}

/** A sentence a person can read for any refusal. */
export function reason(refusal: { error: unknown }): string {
  const { error, detail } = refusal as Refusal;
  if (detail) return detail;
  if (error === "NETWORK_ERROR") return "The server could not be reached. Check your connection and try again.";
  if (error === "UNAUTHORIZED") return "Your session has ended. Sign in again.";
  return "That did not work. Try again.";
}

type Output<Call extends (...input: never[]) => Promise<object>> = Exclude<Awaited<ReturnType<Call>>, { error: unknown }>;

/** What a bio shows: its tags, what each lies under, and its look. */
export type Card = Output<typeof api.cards.view>["card"];
export type CardTag = Card["tags"][number];
export type SavedBio = Output<typeof api.bios.list>["bios"][number];
export type Suggestion = Output<typeof api.tags.suggest>["tags"][number];
export type Template = Output<typeof api.templates.list>["templates"][number];
export type Sharing = Output<typeof api.sharing.status>["sharing"];
export type Match = Output<typeof api.search>["people"][number];
