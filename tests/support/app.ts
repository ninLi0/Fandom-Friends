import type { Db } from "mongodb";
import { createRuntime } from "../../src/host/runtime.ts";
import { seedVocabulary } from "../../src/seed/apply.ts";
import type { SeedTag, SeedTemplate } from "../../src/seed/vocabulary.ts";

export const origin = "http://localhost:3000";

/** What a request answered: the HTTP status, the JSON body, and the session cookie if one was set. */
export interface Answer {
  status: number;
  body: Record<string, any>;
  cookie?: string;
}

/** Sends requests as one browser would: the same cookie on every call. */
export type Caller = (path: string, body?: unknown) => Promise<Answer>;

/** A small vocabulary for tests, shaped like the real one: a series, characters, a pairing, and interests. */
export const testTags: readonly SeedTag[] = [
  { name: "Frieren", alsoCalled: ["Sousou no Frieren"] },
  { name: "Fern", under: ["Frieren"] },
  { name: "Stark", under: ["Frieren"] },
  { name: "Fern/Stark", alsoCalled: ["Fern × Stark"], under: ["Fern", "Stark"] },
  { name: "Dungeon Meshi", alsoCalled: ["Delicious in Dungeon"] },
  { name: "Interests" },
  { name: "Sketch swaps", alsoCalled: ["Art trades"], under: ["Interests"] },
  { name: "Episode discussions", under: ["Interests"] },
];

export const testTemplates: readonly SeedTemplate[] = [
  { name: "Classic", layout: "Stacked", font: "Serif", palette: "Parchment", default: true },
  { name: "Side by side", layout: "Two columns", font: "Sans", palette: "Midnight" },
];

/**
 * Starts the whole application on a test database, loads a vocabulary, and returns ways to call it.
 * `clock` lets a test decide what time it is.
 */
export async function startApp(database: Db, {
  clock,
  tags = testTags,
  templates = testTemplates,
}: { clock?: () => Date; tags?: readonly SeedTag[]; templates?: readonly SeedTemplate[] } = {}) {
  // The tests register hundreds of people. A cheap password hash keeps the whole suite to seconds; the
  // Authenticating and sign-in tests use the real cost.
  const runtime = createRuntime({ database, publicOrigin: origin, clock, passwordHashing: { memoryCost: 1024, timeCost: 1 } });
  await seedVocabulary(runtime.instances, tags, templates);

  async function send(path: string, body: unknown, cookie?: string): Promise<Answer> {
    const response = await runtime.handle(new Request(`${origin}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    }));
    return {
      status: response.status,
      body: await response.json() as Record<string, any>,
      cookie: response.headers.get("Set-Cookie")?.split(";")[0],
    };
  }

  /** Someone with no session, such as a visitor opening a public link. */
  const visitor: Caller = (path, body = {}) => send(path, body);

  /** Registers a new person and returns a caller that is signed in as them. */
  async function person(username: string): Promise<Caller> {
    const registered = await send("/auth/register", { username, password: `${username}-test-password` });
    if (registered.cookie === undefined) throw new Error(`Could not register ${username}: ${JSON.stringify(registered.body)}`);
    return (path, body = {}) => send(path, body, registered.cookie);
  }

  /** The identity of the tag with this exact name, for requests that take a tag. */
  async function tag(name: string): Promise<string> {
    const { body } = await visitor("/tags/suggest", { text: name });
    const found = (body.tags as { tag: string; name: string }[]).find((entry) => entry.name === name);
    if (found === undefined) throw new Error(`No tag is called ${name}.`);
    return found.tag;
  }

  /** The identity of the template with this exact name. */
  async function template(name: string): Promise<string> {
    const { body } = await visitor("/templates/list");
    const found = (body.templates as { template: string; name: string }[]).find((entry) => entry.name === name);
    if (found === undefined) throw new Error(`No template is called ${name}.`);
    return found.template;
  }

  return { runtime, visitor, person, tag, template };
}

/** The names of a card's tags, in the order the card lists them. */
export function tagNames(card: { tags: { name: string }[] }): string[] {
  return card.tags.map(({ name }) => name);
}
