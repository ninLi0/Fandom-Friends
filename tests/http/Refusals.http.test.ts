/**
 * Refusals: every code a concept can refuse with has a public category and a sentence a page can show, and a
 * refused request answers over HTTP with that category, the code, and the sentence.
 */
import { describe, expect, test } from "bun:test";
import { concepts, registrations } from "../../src/concepts.ts";
import { conceptRefusalCodes, publicErrors, refusalSentence } from "../../src/host/http-policy.ts";
import { explanationOf } from "../../src/host/runtime.ts";
import { fonts } from "../../src/seed/vocabulary.ts";
import { origin, startApp } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

/** Every refusal a registered concept's specification declares, with the action that declares it. */
const declared = registrations.flatMap(({ specification }) =>
  specification.actions.flatMap((action) =>
    action.refusals.map(({ code, message }) => ({
      concept: specification.definitionName,
      where: `${specification.definitionName}.${action.name}`,
      code,
      message,
    })),
  ),
);

/** Each declared code once. */
const declaredCodes = [...new Set(declared.map(({ code }) => code))];

/** The codes an endpoint answers itself, without any concept refusing. */
const endpointCodes = ["BIO_NOT_FOUND", "CARD_NOT_FOUND"];

/** The sentence a concept's specification gives a code, as written under design/concepts/. */
function specificationSentence(concept: string, code: string): string | undefined {
  return declared.find((refusal) => refusal.concept === concept && refusal.code === code)?.message;
}

type App = Awaited<ReturnType<typeof startApp>>;

/**
 * Sends one request with the Origin and the cookie the test chooses. `startApp`'s callers always send the
 * application's own origin, so the tests about another site build the request here.
 */
async function sendFrom(app: App, from: string, path: string, body: unknown, cookie?: string) {
  const response = await app.runtime.handle(
    new Request(`${origin}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: from, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
    setCookie: response.headers.get("Set-Cookie"),
    allowOrigin: response.headers.get("Access-Control-Allow-Origin"),
  };
}

describe("refusal codes and their sentences", () => {
  test("the walk reads every concept the application uses", () => {
    // A concept left out of `registrations` in src/concepts.ts would have its refusals skipped by every test here.
    const walked = registrations.map(({ specification }) => specification.definitionName);
    expect(walked.sort()).toEqual(Object.keys(concepts).sort());
    expect(declaredCodes.length).toBeGreaterThan(0);
    expect([...conceptRefusalCodes].sort()).toEqual([...declaredCodes].sort());
  });

  test("every refusal a concept declares has a public category", () => {
    // A code named here would reach the browser as INTERNAL_ERROR. Give it a category in src/host/http-policy.ts.
    const missing = declared
      .filter(({ code }) => !Object.hasOwn(publicErrors, code))
      .map(({ code, where }) => `${code} (declared by ${where})`);
    expect(missing).toEqual([]);
  });

  test("every refusal a concept declares has a nonblank sentence that ends with a period", () => {
    const poor = declaredCodes
      .filter((code) => {
        const sentence = refusalSentence(code);
        return sentence === undefined || sentence.trim() === "" || !sentence.endsWith(".");
      })
      .map((code) => `${code}: ${JSON.stringify(refusalSentence(code))}`);
    expect(poor).toEqual([]);
  });

  test("a code has one sentence wherever it is declared, so no two concepts give it different ones", () => {
    // Two sentences for one code would leave `refusalSentence` to pick one of them without saying which.
    const disagreeing = declaredCodes
      .map((code) => declared.filter((refusal) => refusal.code === code))
      .filter((uses) => new Set(uses.map(({ message }) => message)).size > 1)
      .map((uses) => `${uses[0]!.code}: ${uses.map(({ where, message }) => `${where} says "${message}"`).join("; ")}`);
    expect(disagreeing).toEqual([]);
  });

  test("publicErrors lists only codes a concept declares and the two an endpoint answers itself", () => {
    const stale = Object.keys(publicErrors).filter(
      (code) => !declaredCodes.includes(code) && !endpointCodes.includes(code),
    );
    expect(stale).toEqual([]);
  });

  test("the two codes an endpoint answers itself are the application's own, reported as NOT_FOUND with a sentence", () => {
    expect(endpointCodes.filter((code) => declaredCodes.includes(code))).toEqual([]);
    expect(endpointCodes.filter((code) => publicErrors[code] !== "NOT_FOUND")).toEqual([]);
    expect(endpointCodes.filter((code) => !/^\S.*\.$/.test(refusalSentence(code) ?? ""))).toEqual([]);
  });

  test("only a code with a public category is explained, so INTERNAL_ERROR never carries a code or a sentence", () => {
    expect(explanationOf("DRAFT_NAME_TAKEN")).toEqual({
      code: "DRAFT_NAME_TAKEN",
      detail: "You already have a bio with this name.",
    });
    // A code missing from publicErrors reaches the browser as INTERNAL_ERROR. Nothing more is added to it.
    expect(explanationOf("NO_SUCH_CODE")).toEqual({});
    expect(explanationOf("toString")).toEqual({});
  });

  test("a code nobody declares has no sentence", () => {
    expect(refusalSentence("NO_SUCH_CODE")).toBeUndefined();
    // Not a code, though every object has a property of this name.
    expect(refusalSentence("toString")).toBeUndefined();
  });
});

describe("refusals over HTTP", () => {
  // Only these tests need a database, so it is set up here and the checks above run without one.
  const database = useTestDatabase();

  test("a concept's refusal answers { error, code, detail }, in the application's words where it has them", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const { body: started } = await alice("/bios/start", { name: "Frieren and sketch swaps" });

    // 409, and the application's own words: Drafting speaks of drafts and owners, the page speaks of bios.
    const again = await alice("/bios/start", { name: "Frieren and sketch swaps" });
    expect(again.status).toBe(409);
    expect(again.body).toEqual({
      error: "CONFLICT",
      code: "DRAFT_NAME_TAKEN",
      detail: "You already have a bio with this name.",
    });
    expect(specificationSentence("Drafting", "DRAFT_NAME_TAKEN")).toBe("The owner already has a draft with this name.");

    // 400, and the sentence from design/concepts/Publishing.md: the application has no words of its own for it.
    const claimed = await alice("/sharing/claim", { handle: "A" });
    expect(claimed.status).toBe(400);
    expect(claimed.body).toEqual({
      error: "INVALID_REQUEST",
      code: "INVALID_HANDLE",
      detail: "A handle must be 3 to 30 lowercase letters, digits, or hyphens.",
    });
    expect(specificationSentence("Publishing", "INVALID_HANDLE")).toBe(claimed.body.detail);

    // 404, again in the concept's own words.
    const tagged = await alice("/bios/tags/add", { bio: started.bio, tag: "no-such-tag" });
    expect(tagged.status).toBe(404);
    expect(tagged.body).toEqual({ error: "NOT_FOUND", code: "TAG_NOT_FOUND", detail: "There is no such tag." });
    expect(specificationSentence("Tagging", "TAG_NOT_FOUND")).toBe(tagged.body.detail);

    // 401 for someone who is not signed in.
    const unsigned = await app.visitor("/bios/list");
    expect(unsigned.status).toBe(401);
    expect(unsigned.body).toEqual({
      error: "UNAUTHORIZED",
      code: "NOT_SIGNED_IN",
      detail: "Your session has ended. Sign in again.",
    });
    expect(specificationSentence("Sessioning", "NOT_SIGNED_IN")).toBe(unsigned.body.detail);
    // Adding the code and the sentence kept the rest of the answer: it still tells the browser to drop its session cookie.
    expect(unsigned.cookie).toMatch(/session=$/);

    // Every answer above agrees with the policy: the category listed for the code, and the sentence for the code.
    for (const { body } of [again, claimed, tagged, unsigned]) {
      expect(body.error).toBe(publicErrors[body.code]);
      expect(body.detail).toBe(refusalSentence(body.code));
    }
  });

  test("an endpoint's own refusal has the same three fields", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");

    const card = await app.visitor("/cards/view", { handle: "nobody-here" });
    expect(card.status).toBe(404);
    expect(card.body).toEqual({
      error: "NOT_FOUND",
      code: "CARD_NOT_FOUND",
      detail: "Nobody is displaying a bio at that handle.",
    });

    // A bio that does not exist and a bio that is someone else's answer alike, so the answer gives nothing away.
    const { body: started } = await alice("/bios/start", { name: "Alice's bio" });
    for (const bio of ["no-such-bio", started.bio]) {
      const viewed = await bob("/bios/view", { bio });
      expect(viewed.status).toBe(404);
      expect(viewed.body).toEqual({
        error: "NOT_FOUND",
        code: "BIO_NOT_FOUND",
        detail: "There is no such bio among your saved bios.",
      });
    }
  });

  test("a request its validator turns down has an error and a detail, and no code", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const { body: started } = await alice("/bios/start", { name: "Frieren and sketch swaps" });

    const tooLong = await app.visitor("/tags/suggest", { text: "x".repeat(65) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body).toEqual({
      error: "INVALID_REQUEST",
      detail: "The request was not understood: text must be at most 64 characters.",
    });
    expect(Object.keys(tooLong.body).sort()).toEqual(["detail", "error"]);

    const font = await alice("/bios/look/font", { bio: started.bio, font: "Comic Sans" });
    expect(font.status).toBe(400);
    expect(font.body).toEqual({
      error: "INVALID_REQUEST",
      detail: `The request was not understood: font must be one of ${fonts.join(", ")}.`,
    });
    expect(Object.keys(font.body).sort()).toEqual(["detail", "error"]);

    // A field the endpoint does not take is turned down the same way, and nothing is started.
    const extra = await alice("/bios/start", { name: "Another bio", shared: true });
    expect(extra.status).toBe(400);
    expect(Object.keys(extra.body).sort()).toEqual(["detail", "error"]);
    expect(extra.body.error).toBe("INVALID_REQUEST");
    expect(extra.body.detail).toMatch(/^The request was not understood: .+\.$/);
    expect((await alice("/bios/list")).body.bios).toHaveLength(1);
  });

  test("a request that succeeds answers with none of error, code, or detail", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    const answers = [
      await alice("/bios/start", { name: "Frieren and sketch swaps" }),
      await alice("/bios/list"),
      await alice("/sharing/claim", { handle: "alice-draws" }),
      await alice("/sharing/status"),
      await app.visitor("/tags/suggest", { text: "Fern" }),
      await app.visitor("/templates/list"),
    ];
    for (const { status, body } of answers) {
      expect(status).toBe(200);
      expect(Object.keys(body).filter((key) => ["error", "code", "detail"].includes(key))).toEqual([]);
    }
  });

  test('a path that does not exist answers 404 with only { error: "NOT_FOUND" }', async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    for (const caller of [app.visitor, alice]) {
      const answer = await caller("/no/such/path");
      expect(answer.status).toBe(404);
      expect(answer.body).toEqual({ error: "NOT_FOUND" });
      expect(Object.keys(answer.body)).toEqual(["error"]);
    }
  });

  test('another site\'s request to anything that uses the session answers 403 { error: "FORBIDDEN" } and does nothing', async () => {
    const app = await startApp(database());
    const elsewhere = "https://elsewhere.example";

    // Registering from another site: no account and no session cookie.
    const mallory = { username: "mallory", password: "mallory-test-password" };
    const registered = await sendFrom(app, elsewhere, "/auth/register", mallory);
    expect(registered.status).toBe(403);
    expect(registered.body).toEqual({ error: "FORBIDDEN" });
    expect(registered.setCookie).toBeNull();
    expect(await app.runtime.instances.Authenticating._registered({ username: "mallory" })).toEqual({ registered: false });

    // Alice signs in on the application's own page. Other sites then send requests that carry her cookie.
    const signedIn = await sendFrom(app, origin, "/auth/register", { username: "alice", password: "alice-test-password" });
    expect(signedIn.status).toBe(200);
    const cookie = signedIn.setCookie!.split(";")[0]!;

    // Only the exact origin counts: another port, another scheme, and the "null" origin are other sites too.
    for (const from of [elsewhere, "http://localhost:3001", "https://localhost:3000", "null"]) {
      const start = await sendFrom(app, from, "/bios/start", { name: "Not Alice's idea" }, cookie);
      expect(start.status).toBe(403);
      expect(start.body).toEqual({ error: "FORBIDDEN" });
    }

    // Another site cannot read what is hers, and cannot sign her out: the refusal leaves her cookie alone.
    const read = await sendFrom(app, elsewhere, "/bios/list", {}, cookie);
    expect(read.status).toBe(403);
    expect(read.body).toEqual({ error: "FORBIDDEN" });
    const signOut = await sendFrom(app, elsewhere, "/auth/sign-out", {}, cookie);
    expect(signOut.status).toBe(403);
    expect(signOut.body).toEqual({ error: "FORBIDDEN" });
    expect(signOut.setCookie).toBeNull();

    // Nothing happened: on her own page she is still signed in and has no bio.
    const current = await sendFrom(app, origin, "/auth/current", {}, cookie);
    expect(current.status).toBe(200);
    expect(current.body).toEqual({ username: "alice" });
    expect((await sendFrom(app, origin, "/bios/list", {}, cookie)).body).toEqual({ bios: [] });
  });

  test("the three reads that take no session are answered for another site too, with no permission for its pages to read them", async () => {
    // The HTTP adapter checks the Origin only on paths that use the session cookie. These three take no session
    // and change nothing, so they are answered as usual. The answer names no allowed origin, so a browser does
    // not hand it to a page of the other site. Whether to refuse them instead is the team's decision; this test
    // records what the application does today.
    const app = await startApp(database());
    const elsewhere = "https://elsewhere.example";

    const templates = await sendFrom(app, elsewhere, "/templates/list", {});
    expect(templates.status).toBe(200);
    expect(templates.body).toEqual((await app.visitor("/templates/list")).body);

    const tags = await sendFrom(app, elsewhere, "/tags/suggest", { text: "Fern" });
    expect(tags.status).toBe(200);
    expect(tags.body).toEqual((await app.visitor("/tags/suggest", { text: "Fern" })).body);

    const card = await sendFrom(app, elsewhere, "/cards/view", { handle: "nobody-here" });
    expect(card.status).toBe(404);
    expect(card.body).toEqual({
      error: "NOT_FOUND",
      code: "CARD_NOT_FOUND",
      detail: "Nobody is displaying a bio at that handle.",
    });

    for (const answer of [templates, tags, card]) {
      expect(answer.allowOrigin).toBeNull();
      expect(answer.setCookie).toBeNull();
    }
  });
});
