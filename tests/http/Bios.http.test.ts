/**
 * The Bios endpoints over HTTP: keeping several saved bios, tagging them, styling them, and discarding them.
 * What each endpoint is meant to do is in design/compositions/Bios.md.
 */
import { describe, expect, test } from "bun:test";
import type { Draft } from "../../src/concepts/Drafting/Drafting.ts";
import { fonts, palettes } from "../../src/seed/offered.ts";
import { startApp, tagNames, type Answer, type Caller } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

type App = Awaited<ReturnType<typeof startApp>>;

/** An answer's status and body, without the cookie, to compare with what is expected. */
function statusAndBody({ status, body }: Answer) {
  return { status, body };
}

/** A refusal as a page receives it: the HTTP status, the public category, the refusal's code, and its sentence. */
function refusal(status: number, error: string, code: string, detail: string) {
  return { status, body: { error, code, detail } };
}

// Each refusal's category is in src/host/http-policy.ts. Its sentence is there too, or in its concept's specification.
const NOT_SIGNED_IN = refusal(401, "UNAUTHORIZED", "NOT_SIGNED_IN", "Your session has ended. Sign in again.");
const BIO_NOT_FOUND = refusal(404, "NOT_FOUND", "BIO_NOT_FOUND", "There is no such bio among your saved bios.");
const INVALID_NAME = refusal(
  400,
  "INVALID_REQUEST",
  "INVALID_DRAFT_NAME",
  "A bio name must not be blank and must be at most 80 characters.",
);
const NAME_TAKEN = refusal(409, "CONFLICT", "DRAFT_NAME_TAKEN", "You already have a bio with this name.");
const TAG_NOT_FOUND = refusal(404, "NOT_FOUND", "TAG_NOT_FOUND", "There is no such tag.");
const TAG_ALREADY_ADDED = refusal(409, "CONFLICT", "TAG_ALREADY_ADDED", "This bio already has that tag.");
const TAG_NOT_ADDED = refusal(409, "CONFLICT", "TAG_NOT_ADDED", "This bio does not have that tag.");
const TEMPLATE_NOT_FOUND = refusal(404, "NOT_FOUND", "TEMPLATE_NOT_FOUND", "There is no such template.");
const TEMPLATE_ALREADY_APPLIED = refusal(
  409,
  "CONFLICT",
  "TEMPLATE_ALREADY_APPLIED",
  "This bio already uses that template.",
);
const LOOK_NOT_CUSTOMIZED = refusal(
  409,
  "CONFLICT",
  "LOOK_NOT_CUSTOMIZED",
  "This bio has no font or color scheme of its own.",
);
const CARD_NOT_FOUND = refusal(404, "NOT_FOUND", "CARD_NOT_FOUND", "Nobody is displaying a bio at that handle.");

/** The answer to a request that an endpoint's validator rejects. It has no code, only the validator's reason. */
function notUnderstood(reason: string) {
  return { status: 400, body: { error: "INVALID_REQUEST", detail: `The request was not understood: ${reason}.` } };
}

/** The answer to a request that leaves out a field the endpoint requires. */
const FIELD_MISSING = { status: 400, body: { error: "INVALID_REQUEST" } };

/** Starts a bio for the person and returns its identity. */
async function startBio(person: Caller, name: string): Promise<string> {
  const started = await person("/bios/start", { name });
  if (started.status !== 200) throw new Error(`Could not start "${name}": ${JSON.stringify(started.body)}`);
  return started.body.bio as string;
}

/** Starts the application with Alice signed in and one saved bio. */
async function aliceWithABio() {
  const app = await startApp(database());
  const alice = await app.person("alice");
  const bio = await startBio(alice, "Frieren and sketch swaps");
  return { app, alice, bio };
}

/** The names of the person's saved bios, in the order the list gives them. */
async function savedNames(person: Caller): Promise<string[]> {
  const { body } = await person("/bios/list");
  return body.bios.map((saved: { name: string }) => saved.name);
}

/** The card of one of the person's own bios. */
async function cardOf(person: Caller, bio: string) {
  return (await person("/bios/view", { bio })).body.card;
}

/** The broader tags a card's tag lies under, as [name, direct] pairs in name order. The card lists them by identity. */
function broaderTags(tag: { under: { name: string; direct: boolean }[] }): [string, boolean][] {
  return tag.under
    .map(({ name, direct }): [string, boolean] => [name, direct])
    .sort(([left], [right]) => left.localeCompare(right));
}

/** The looks of the two test templates in tests/support/app.ts, as a card shows them. */
async function templateLooks(app: App) {
  return {
    classic: { template: await app.template("Classic"), layout: "Stacked", font: "Serif", palette: "Parchment" },
    sideBySide: {
      template: await app.template("Side by side"),
      layout: "Two columns",
      font: "Sans",
      palette: "Midnight",
    },
  };
}

/** Claims a handle for the person and displays the bio there. */
async function display(person: Caller, handle: string, bio: string): Promise<void> {
  await person("/sharing/claim", { handle });
  const displayed = await person("/sharing/display", { bio });
  if (displayed.status !== 200) throw new Error(`Could not display the bio: ${JSON.stringify(displayed.body)}`);
}

/**
 * Reads a value again and again until it has settled, for up to two seconds, and returns the last value read.
 * The reactions that clear a discarded bio may finish a moment after the request is answered.
 */
async function eventually<Value>(read: () => Promise<Value>, settled: (value: Value) => boolean): Promise<Value> {
  const deadline = Date.now() + 2000;
  let value = await read();
  while (!settled(value) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    value = await read();
  }
  return value;
}

describe("keeping saved bios", () => {
  test("a person who has started no bio has an empty list", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expect(statusAndBody(await alice("/bios/list"))).toEqual({ status: 200, body: { bios: [] } });
  });

  test("saved bios are listed in name order, ignoring case", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const sketches = await startBio(alice, "sketch swaps");
    const rewatch = await startBio(alice, "Frieren rewatch");
    const dungeon = await startBio(alice, "dungeon meshi");

    // If case counted, "Frieren rewatch" would come first.
    expect(statusAndBody(await alice("/bios/list"))).toEqual({
      status: 200,
      body: {
        bios: [
          { bio: dungeon, name: "dungeon meshi" },
          { bio: rewatch, name: "Frieren rewatch" },
          { bio: sketches, name: "sketch swaps" },
        ],
      },
    });
  });

  test("two people may use the same name, and each lists only their own bios", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    const alices = await startBio(alice, "Frieren fans");
    const bobs = await startBio(bob, "Frieren fans");

    expect(bobs).not.toBe(alices);
    expect((await alice("/bios/list")).body).toEqual({ bios: [{ bio: alices, name: "Frieren fans" }] });
    expect((await bob("/bios/list")).body).toEqual({ bios: [{ bio: bobs, name: "Frieren fans" }] });
  });

  test("a new bio shows its name, no tags, and the default template's look", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    expect(statusAndBody(await alice("/bios/view", { bio }))).toEqual({
      status: 200,
      body: { bio, name: "Frieren and sketch swaps", card: { displayName: "", note: "", tags: [], look: classic }, overrides: { font: null, palette: null } },
    });
  });

  test("renaming a bio changes the name it is listed and viewed under, and keeps its identity", async () => {
    const { alice, bio } = await aliceWithABio();

    const renamed = await alice("/bios/rename", { bio, name: "Sketch swaps only" });

    expect(statusAndBody(renamed)).toEqual({ status: 200, body: { bio } });
    expect((await alice("/bios/list")).body).toEqual({ bios: [{ bio, name: "Sketch swaps only" }] });
    expect((await alice("/bios/view", { bio })).body.name).toBe("Sketch swaps only");
  });

  test("renaming a bio to the name it already has is accepted", async () => {
    const { alice, bio } = await aliceWithABio();

    const renamed = await alice("/bios/rename", { bio, name: "Frieren and sketch swaps" });

    expect(statusAndBody(renamed)).toEqual({ status: 200, body: { bio } });
    expect(await savedNames(alice)).toEqual(["Frieren and sketch swaps"]);
  });

  test("a name of exactly 80 characters is accepted, for a new bio and for a rename", async () => {
    const { alice, bio } = await aliceWithABio();

    expect((await alice("/bios/start", { name: "a".repeat(80) })).status).toBe(200);
    expect((await alice("/bios/rename", { bio, name: "b".repeat(80) })).status).toBe(200);
    expect(await savedNames(alice)).toEqual(["a".repeat(80), "b".repeat(80)]);
  });

  test("starting a bio with a blank name is refused", async () => {
    const { alice } = await aliceWithABio();

    for (const blank of ["", "   ", "\t\n"]) {
      expect(statusAndBody(await alice("/bios/start", { name: blank }))).toEqual(INVALID_NAME);
    }
    expect(await savedNames(alice)).toEqual(["Frieren and sketch swaps"]);
  });

  test("starting a bio with an 81-character name is refused", async () => {
    const { alice } = await aliceWithABio();

    expect(statusAndBody(await alice("/bios/start", { name: "a".repeat(81) }))).toEqual(INVALID_NAME);
    expect(await savedNames(alice)).toEqual(["Frieren and sketch swaps"]);
  });

  test("starting a bio with a name the person already uses is refused", async () => {
    const { alice, bio } = await aliceWithABio();

    expect(statusAndBody(await alice("/bios/start", { name: "Frieren and sketch swaps" }))).toEqual(NAME_TAKEN);
    expect((await alice("/bios/list")).body).toEqual({ bios: [{ bio, name: "Frieren and sketch swaps" }] });
  });

  test("renaming a bio to a blank name is refused", async () => {
    const { alice, bio } = await aliceWithABio();

    for (const blank of ["", "   ", "\t\n"]) {
      expect(statusAndBody(await alice("/bios/rename", { bio, name: blank }))).toEqual(INVALID_NAME);
    }
    expect(await savedNames(alice)).toEqual(["Frieren and sketch swaps"]);
  });

  test("renaming a bio to an 81-character name is refused", async () => {
    const { alice, bio } = await aliceWithABio();

    expect(statusAndBody(await alice("/bios/rename", { bio, name: "a".repeat(81) }))).toEqual(INVALID_NAME);
    expect(await savedNames(alice)).toEqual(["Frieren and sketch swaps"]);
  });

  test("renaming a bio to the name of the person's other bio is refused", async () => {
    const { alice, bio } = await aliceWithABio();
    await startBio(alice, "Dungeon Meshi discussions");

    expect(statusAndBody(await alice("/bios/rename", { bio, name: "Dungeon Meshi discussions" }))).toEqual(NAME_TAKEN);
    expect(await savedNames(alice)).toEqual(["Dungeon Meshi discussions", "Frieren and sketch swaps"]);
  });
});

describe("tagging a bio", () => {
  test("adding a tag by another of its names adds the main tag", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    const added = await alice("/bios/tags/add", { bio, tag: await app.tag("Sousou no Frieren") });

    expect(statusAndBody(added)).toEqual({
      status: 200,
      body: { bio, card: { displayName: "", note: "", tags: [{ tag: await app.tag("Frieren"), name: "Frieren", under: [] }], look: classic } },
    });
  });

  test("the card lists a bio's tags in name order, whatever order they were added in", async () => {
    const { app, alice, bio } = await aliceWithABio();

    await alice("/bios/tags/add", { bio, tag: await app.tag("Sketch swaps") });
    await alice("/bios/tags/add", { bio, tag: await app.tag("Frieren") });
    await alice("/bios/tags/add", { bio, tag: await app.tag("Fern/Stark") });
    const added = await alice("/bios/tags/add", { bio, tag: await app.tag("Dungeon Meshi") });

    expect(tagNames(added.body.card)).toEqual(["Dungeon Meshi", "Fern/Stark", "Frieren", "Sketch swaps"]);
    expect(tagNames(await cardOf(alice, bio))).toEqual(["Dungeon Meshi", "Fern/Stark", "Frieren", "Sketch swaps"]);
  });

  test("the card says which broader tags each tag lies under, and whether directly", async () => {
    const { app, alice, bio } = await aliceWithABio();

    await alice("/bios/tags/add", { bio, tag: await app.tag("Frieren") });
    await alice("/bios/tags/add", { bio, tag: await app.tag("Fern/Stark") });
    const added = await alice("/bios/tags/add", { bio, tag: await app.tag("Sketch swaps") });

    // A pairing lies directly under its two characters, and through them under their series.
    const [pairing, series, interest] = added.body.card.tags;
    expect([pairing.name, broaderTags(pairing)]).toEqual([
      "Fern/Stark",
      [
        ["Fern", true],
        ["Frieren", false],
        ["Stark", true],
      ],
    ]);
    expect([series.name, broaderTags(series)]).toEqual(["Frieren", []]);
    expect(interest).toEqual({
      tag: await app.tag("Sketch swaps"),
      name: "Sketch swaps",
      under: [{ tag: await app.tag("Interests"), name: "Interests", direct: true }],
    });
  });

  test("adding a tag the bio already has is refused", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const frieren = await app.tag("Frieren");
    await alice("/bios/tags/add", { bio, tag: frieren });

    expect(statusAndBody(await alice("/bios/tags/add", { bio, tag: frieren }))).toEqual(TAG_ALREADY_ADDED);
    expect(tagNames(await cardOf(alice, bio))).toEqual(["Frieren"]);
  });

  test("adding a tag once by each of its names is refused the second time, in either order", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const second = await startBio(alice, "Dungeon Meshi discussions");
    const mainName = await app.tag("Frieren");
    const otherName = await app.tag("Sousou no Frieren");

    await alice("/bios/tags/add", { bio, tag: mainName });
    expect(statusAndBody(await alice("/bios/tags/add", { bio, tag: otherName }))).toEqual(TAG_ALREADY_ADDED);

    await alice("/bios/tags/add", { bio: second, tag: otherName });
    expect(statusAndBody(await alice("/bios/tags/add", { bio: second, tag: mainName }))).toEqual(TAG_ALREADY_ADDED);
    expect(statusAndBody(await alice("/bios/tags/add", { bio: second, tag: otherName }))).toEqual(TAG_ALREADY_ADDED);

    expect(tagNames(await cardOf(alice, bio))).toEqual(["Frieren"]);
    expect(tagNames(await cardOf(alice, second))).toEqual(["Frieren"]);
  });

  test("adding a tag that does not exist is refused", async () => {
    const { alice, bio } = await aliceWithABio();

    expect(statusAndBody(await alice("/bios/tags/add", { bio, tag: crypto.randomUUID() }))).toEqual(TAG_NOT_FOUND);
    expect(tagNames(await cardOf(alice, bio))).toEqual([]);
  });

  test("removing a tag by another of its names removes the main tag", async () => {
    const { app, alice, bio } = await aliceWithABio();
    await alice("/bios/tags/add", { bio, tag: await app.tag("Frieren") });
    await alice("/bios/tags/add", { bio, tag: await app.tag("Sketch swaps") });

    const removed = await alice("/bios/tags/remove", { bio, tag: await app.tag("Sousou no Frieren") });

    expect(removed.status).toBe(200);
    expect(removed.body.bio).toBe(bio);
    expect(tagNames(removed.body.card)).toEqual(["Sketch swaps"]);
    expect(tagNames(await cardOf(alice, bio))).toEqual(["Sketch swaps"]);
  });

  test("removing a tag the bio does not have is refused, under any of the tag's names", async () => {
    const { app, alice, bio } = await aliceWithABio();
    await alice("/bios/tags/add", { bio, tag: await app.tag("Frieren") });

    const byMainName = await alice("/bios/tags/remove", { bio, tag: await app.tag("Dungeon Meshi") });
    const byOtherName = await alice("/bios/tags/remove", { bio, tag: await app.tag("Delicious in Dungeon") });

    expect(statusAndBody(byMainName)).toEqual(TAG_NOT_ADDED);
    expect(statusAndBody(byOtherName)).toEqual(TAG_NOT_ADDED);
    expect(tagNames(await cardOf(alice, bio))).toEqual(["Frieren"]);
  });

  test("each of a person's bios has its own tags", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const second = await startBio(alice, "Dungeon Meshi discussions");
    const frieren = await app.tag("Frieren");

    await alice("/bios/tags/add", { bio, tag: frieren });
    await alice("/bios/tags/add", { bio, tag: await app.tag("Fern") });
    expect(tagNames(await cardOf(alice, second))).toEqual([]);

    // The same tag can be on both, and taking it off one leaves it on the other.
    expect((await alice("/bios/tags/add", { bio: second, tag: frieren })).status).toBe(200);
    await alice("/bios/tags/add", { bio: second, tag: await app.tag("Dungeon Meshi") });
    await alice("/bios/tags/remove", { bio, tag: frieren });

    expect(tagNames(await cardOf(alice, bio))).toEqual(["Fern"]);
    expect(tagNames(await cardOf(alice, second))).toEqual(["Dungeon Meshi", "Frieren"]);
  });
});

describe("styling a bio", () => {
  test("choosing a template changes the layout, the font, and the color scheme", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic, sideBySide } = await templateLooks(app);
    expect((await cardOf(alice, bio)).look).toEqual(classic);

    const chosen = await alice("/bios/look/template", { bio, template: sideBySide.template });

    expect(statusAndBody(chosen)).toEqual({ status: 200, body: { bio, card: { displayName: "", note: "", tags: [], look: sideBySide } } });
    expect((await cardOf(alice, bio)).look).toEqual(sideBySide);
  });

  test("a font and a color scheme of the bio's own stay when the template changes", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic, sideBySide } = await templateLooks(app);

    await alice("/bios/look/font", { bio, font: "Mono" });
    const own = await alice("/bios/look/palette", { bio, palette: "Forest" });
    expect(own.body.card.look).toEqual({ ...classic, font: "Mono", palette: "Forest" });

    const switched = await alice("/bios/look/template", { bio, template: sideBySide.template });

    expect(switched.status).toBe(200);
    expect(switched.body.card.look).toEqual({ ...sideBySide, font: "Mono", palette: "Forest" });
  });

  test("resetting returns a bio to its template's own font and color scheme", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { sideBySide } = await templateLooks(app);
    await alice("/bios/look/template", { bio, template: sideBySide.template });
    await alice("/bios/look/font", { bio, font: "Mono" });
    await alice("/bios/look/palette", { bio, palette: "Forest" });

    const reset = await alice("/bios/look/reset", { bio });

    expect(statusAndBody(reset)).toEqual({ status: 200, body: { bio, card: { displayName: "", note: "", tags: [], look: sideBySide } } });
    expect((await cardOf(alice, bio)).look).toEqual(sideBySide);
  });

  test("resetting a bio that never chose a template returns it to the default template's look", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);
    await alice("/bios/look/palette", { bio, palette: "Sakura" });

    const reset = await alice("/bios/look/reset", { bio });

    expect(reset.status).toBe(200);
    expect(reset.body.card.look).toEqual(classic);
  });

  test("resetting a bio with no font or color scheme of its own is refused", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { sideBySide } = await templateLooks(app);

    expect(statusAndBody(await alice("/bios/look/reset", { bio }))).toEqual(LOOK_NOT_CUSTOMIZED);

    // A chosen template is not a font or a color scheme of the bio's own.
    await alice("/bios/look/template", { bio, template: sideBySide.template });
    expect(statusAndBody(await alice("/bios/look/reset", { bio }))).toEqual(LOOK_NOT_CUSTOMIZED);
    expect((await cardOf(alice, bio)).look).toEqual(sideBySide);
  });

  test("choosing the template a bio already uses is refused", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { sideBySide } = await templateLooks(app);
    await alice("/bios/look/template", { bio, template: sideBySide.template });

    const again = await alice("/bios/look/template", { bio, template: sideBySide.template });

    expect(statusAndBody(again)).toEqual(TEMPLATE_ALREADY_APPLIED);
    expect((await cardOf(alice, bio)).look).toEqual(sideBySide);
  });

  test("choosing a template that does not exist is refused", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    const unknown = await alice("/bios/look/template", { bio, template: crypto.randomUUID() });

    expect(statusAndBody(unknown)).toEqual(TEMPLATE_NOT_FOUND);
    expect((await cardOf(alice, bio)).look).toEqual(classic);
  });

  test("every offered font can be chosen", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    for (const font of fonts) {
      const chosen = await alice("/bios/look/font", { bio, font });
      expect(statusAndBody(chosen)).toEqual({
        status: 200,
        body: { bio, card: { displayName: "", note: "", tags: [], look: { ...classic, font } } },
      });
    }
  });

  test("every offered color scheme can be chosen", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    for (const palette of palettes) {
      const chosen = await alice("/bios/look/palette", { bio, palette });
      expect(statusAndBody(chosen)).toEqual({
        status: 200,
        body: { bio, card: { displayName: "", note: "", tags: [], look: { ...classic, palette } } },
      });
    }
  });

  test("a font that is not offered is refused, and the answer names the fonts that are", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    const refused = await alice("/bios/look/font", { bio, font: "Comic Sans" });

    expect(statusAndBody(refused)).toEqual(notUnderstood(`font must be one of ${fonts.join(", ")}`));
    expect((await cardOf(alice, bio)).look).toEqual(classic);
  });

  test("a color scheme that is not offered is refused, and the answer names the ones that are", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { classic } = await templateLooks(app);

    const refused = await alice("/bios/look/palette", { bio, palette: "Neon" });

    expect(statusAndBody(refused)).toEqual(notUnderstood(`palette must be one of ${palettes.join(", ")}`));
    expect((await cardOf(alice, bio)).look).toEqual(classic);
  });

  test("each of a person's bios has its own look", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const second = await startBio(alice, "Dungeon Meshi discussions");
    const { classic, sideBySide } = await templateLooks(app);

    await alice("/bios/look/template", { bio, template: sideBySide.template });
    await alice("/bios/look/font", { bio, font: "Rounded" });

    expect((await cardOf(alice, bio)).look).toEqual({ ...sideBySide, font: "Rounded" });
    expect((await cardOf(alice, second)).look).toEqual(classic);
  });
});

/** What a request in the table below may name: Alice's bio, a tag on it, a tag not on it, and another template. */
interface Named {
  bio: string;
  tagOnBio: string;
  tagNotOnBio: string;
  otherTemplate: string;
}

interface Endpoint {
  path: string;
  /** A request that the owner of the named bio could send, and that would be accepted. */
  request: (named: Named) => Record<string, unknown>;
}

const endpointsWithoutABio: Endpoint[] = [
  { path: "/bios/list", request: () => ({}) },
  { path: "/bios/start", request: () => ({ name: "Dungeon Meshi discussions" }) },
];

const endpointsAboutOneBio: Endpoint[] = [
  { path: "/bios/view", request: ({ bio }) => ({ bio }) },
  { path: "/bios/rename", request: ({ bio }) => ({ bio, name: "Sketch swaps only" }) },
  { path: "/bios/details", request: ({ bio }) => ({ bio, displayName: "Mika", note: "Sketch swaps" }) },
  { path: "/bios/discard", request: ({ bio }) => ({ bio }) },
  { path: "/bios/tags/add", request: ({ bio, tagNotOnBio }) => ({ bio, tag: tagNotOnBio }) },
  { path: "/bios/tags/remove", request: ({ bio, tagOnBio }) => ({ bio, tag: tagOnBio }) },
  { path: "/bios/look/template", request: ({ bio, otherTemplate }) => ({ bio, template: otherTemplate }) },
  { path: "/bios/look/font", request: ({ bio }) => ({ bio, font: "Rounded" }) },
  { path: "/bios/look/palette", request: ({ bio }) => ({ bio, palette: "Sakura" }) },
  { path: "/bios/look/reset", request: ({ bio }) => ({ bio }) },
];

const everyEndpoint: Endpoint[] = [...endpointsWithoutABio, ...endpointsAboutOneBio];

/**
 * Alice with one bio that every request in the table would change: it has the tag "Frieren" and lacks
 * "Dungeon Meshi", it has a font of its own (so a reset would be accepted), and it has not chosen "Side by side".
 * `seen` reads everything Alice can see of her saved bios, to check afterwards that nothing changed.
 */
async function aliceWithABioToChange() {
  const { app, alice, bio } = await aliceWithABio();
  const named: Named = {
    bio,
    tagOnBio: await app.tag("Frieren"),
    tagNotOnBio: await app.tag("Dungeon Meshi"),
    otherTemplate: await app.template("Side by side"),
  };
  await alice("/bios/tags/add", { bio, tag: named.tagOnBio });
  await alice("/bios/look/font", { bio, font: "Mono" });
  const seen = async () => ({
    list: statusAndBody(await alice("/bios/list")),
    view: statusAndBody(await alice("/bios/view", { bio })),
  });
  return { app, alice, named, seen };
}

describe("who may use the Bios endpoints", () => {
  // A check on the table itself: each request is one its owner may send, so a refusal below is about who asks.
  for (const { path, request } of everyEndpoint) {
    test(`${path} accepts the table's request from the bio's owner`, async () => {
      const { alice, named } = await aliceWithABioToChange();

      expect((await alice(path, request(named))).status).toBe(200);
    });
  }

  for (const { path, request } of everyEndpoint) {
    test(`${path} refuses a caller who is not signed in, and changes nothing`, async () => {
      const { app, named, seen } = await aliceWithABioToChange();
      const before = await seen();

      expect(statusAndBody(await app.visitor(path, request(named)))).toEqual(NOT_SIGNED_IN);
      expect(await seen()).toEqual(before);
    });
  }

  test("no endpoint takes a session from the request body in place of the cookie", async () => {
    const { app, named, seen } = await aliceWithABioToChange();
    const before = await seen();
    // Alice signs in once more, so that this test holds a session of hers that is in use.
    const signedIn = await app.visitor("/auth/sign-in", { username: "alice", password: "alice-test-password" });
    expect(signedIn.status).toBe(200);
    const session = signedIn.cookie!.split("=")[1];

    for (const { path, request } of everyEndpoint) {
      const answer = await app.visitor(path, { ...request(named), session });
      expect({ path, ...statusAndBody(answer) }).toEqual({ path, ...NOT_SIGNED_IN });
    }
    expect(await seen()).toEqual(before);
  });

  for (const { path, request } of endpointsAboutOneBio) {
    test(`${path} answers another person's bio exactly like a made-up one, and leaves it unchanged`, async () => {
      const { app, named, seen } = await aliceWithABioToChange();
      // Bob uses the application as Alice does: he has a bio of his own, and he displays it.
      // (A discard by a person who displays a bio once got past the check of whose bio it is.)
      const bob = await app.person("bob");
      await display(bob, "bob-reads", await startBio(bob, "Dungeon Meshi discussions"));
      const before = await seen();

      const anothers = await bob(path, request(named));
      const madeUp = await bob(path, request({ ...named, bio: crypto.randomUUID() }));

      expect(statusAndBody(anothers)).toEqual(BIO_NOT_FOUND);
      expect(anothers).toEqual(madeUp);
      expect(await seen()).toEqual(before);
    });
  }

  // A discard also asks what the caller displays, so it is checked for a caller who displays nothing as well.
  test("/bios/discard refuses another person's bio when the caller displays no bio", async () => {
    const { app, named, seen } = await aliceWithABioToChange();
    const bob = await app.person("bob");
    const before = await seen();

    expect(statusAndBody(await bob("/bios/discard", { bio: named.bio }))).toEqual(BIO_NOT_FOUND);
    expect(await seen()).toEqual(before);
  });
});

describe("discarding a bio", () => {
  test("a discarded bio is gone from the list, and viewing it answers that there is no such bio", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const kept = await startBio(alice, "Dungeon Meshi discussions");
    await alice("/bios/tags/add", { bio: kept, tag: await app.tag("Dungeon Meshi") });

    const discarded = await alice("/bios/discard", { bio });

    expect(statusAndBody(discarded)).toEqual({ status: 200, body: { bio } });
    expect((await alice("/bios/list")).body).toEqual({ bios: [{ bio: kept, name: "Dungeon Meshi discussions" }] });
    expect(statusAndBody(await alice("/bios/view", { bio }))).toEqual(BIO_NOT_FOUND);
    // The person's other bio is as it was.
    expect(tagNames(await cardOf(alice, kept))).toEqual(["Dungeon Meshi"]);
  });

  test("discarding a bio a second time answers that there is no such bio", async () => {
    const { alice, bio } = await aliceWithABio();
    await alice("/bios/discard", { bio });

    expect(statusAndBody(await alice("/bios/discard", { bio }))).toEqual(BIO_NOT_FOUND);
  });

  test("the name of a discarded bio can be used again", async () => {
    const { alice, bio } = await aliceWithABio();
    await alice("/bios/discard", { bio });

    const again = await alice("/bios/start", { name: "Frieren and sketch swaps" });

    expect(again.status).toBe(200);
    expect(again.body.bio).not.toBe(bio);
    expect((await alice("/bios/list")).body).toEqual({
      bios: [{ bio: again.body.bio, name: "Frieren and sketch swaps" }],
    });
  });

  test("discarding the displayed bio takes it down before the answer arrives", async () => {
    const { app, alice, bio } = await aliceWithABio();
    await alice("/bios/tags/add", { bio, tag: await app.tag("Frieren") });
    await display(alice, "alice-draws", bio);
    expect((await app.visitor("/cards/view", { handle: "alice-draws" })).status).toBe(200);

    const discarded = await alice("/bios/discard", { bio });

    // The very next requests already find nothing displayed. The handle stays Alice's.
    expect(statusAndBody(discarded)).toEqual({ status: 200, body: { bio } });
    expect(statusAndBody(await app.visitor("/cards/view", { handle: "alice-draws" }))).toEqual(CARD_NOT_FOUND);
    expect((await alice("/sharing/status")).body).toEqual({
      sharing: { handle: "alice-draws", displayed: null, open: null },
    });
  });

  test("discarding the displayed bio of a person open to new friends takes them out of search", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const bob = await app.person("bob");
    await display(alice, "alice-draws", bio);
    await alice("/sharing/open");
    expect((await bob("/search", { tags: [] })).body.people).toHaveLength(1);

    await alice("/bios/discard", { bio });

    expect(statusAndBody(await bob("/search", { tags: [] }))).toEqual({ status: 200, body: { people: [] } });
  });

  // This once failed: any discard took the caller's displayed bio down.
  test("discarding a bio that is not displayed leaves the displayed one public", async () => {
    const { app, alice, bio: displayed } = await aliceWithABio();
    const draft = await startBio(alice, "Dungeon Meshi discussions");
    await alice("/bios/tags/add", { bio: displayed, tag: await app.tag("Frieren") });
    await display(alice, "alice-draws", displayed);

    const discarded = await alice("/bios/discard", { bio: draft });

    expect(statusAndBody(discarded)).toEqual({ status: 200, body: { bio: draft } });
    expect((await alice("/sharing/status")).body).toEqual({
      sharing: { handle: "alice-draws", displayed, open: false },
    });
    const shown = await app.visitor("/cards/view", { handle: "alice-draws" });
    expect(shown.status).toBe(200);
    expect(tagNames(shown.body.card)).toEqual(["Frieren"]);
  });

  // This once failed too: the refused discard still took the displayed bio down.
  test("discarding a bio that does not exist is refused, and leaves the displayed bio public", async () => {
    const { app, alice, bio: displayed } = await aliceWithABio();
    await display(alice, "alice-draws", displayed);

    const refused = await alice("/bios/discard", { bio: crypto.randomUUID() });

    expect(statusAndBody(refused)).toEqual(BIO_NOT_FOUND);
    expect((await alice("/sharing/status")).body).toEqual({
      sharing: { handle: "alice-draws", displayed, open: false },
    });
    expect((await app.visitor("/cards/view", { handle: "alice-draws" })).status).toBe(200);
  });

  test("a discarded bio keeps no tags", async () => {
    const { app, alice, bio } = await aliceWithABio();
    for (const name of ["Frieren", "Fern/Stark", "Sketch swaps"]) {
      await alice("/bios/tags/add", { bio, tag: await app.tag(name) });
    }
    expect(tagNames(await cardOf(alice, bio))).toEqual(["Fern/Stark", "Frieren", "Sketch swaps"]);

    await alice("/bios/discard", { bio });

    // Nothing over HTTP reads a discarded bio, so this asks the concept that holds the tags.
    const { Tagging } = app.runtime.instances;
    const left = await eventually(
      () => Tagging._tagsOf({ item: bio as Draft }),
      (tags) => tags.length === 0,
    );
    expect(left).toEqual([]);
  });

  test("a discarded bio keeps no look", async () => {
    const { app, alice, bio } = await aliceWithABio();
    const { Templating } = app.runtime.instances;
    await alice("/bios/look/template", { bio, template: await app.template("Side by side") });
    await alice("/bios/look/font", { bio, font: "Mono" });
    expect(await Templating._styled({ item: bio as Draft })).toEqual({ styled: true });

    await alice("/bios/discard", { bio });

    // Nothing over HTTP reads a discarded bio, so this asks the concept that holds the look.
    const left = await eventually(
      () => Templating._styled({ item: bio as Draft }),
      ({ styled }) => !styled,
    );
    expect(left).toEqual({ styled: false });
  });
});

describe("the shape of a request", () => {
  /** What each endpoint's validator says about a request it rejects (src/compositions/validators.ts). */
  const reasons: Record<string, string> = {
    "/bios/list": "session must come from the cookie",
    "/bios/start": "name must be text and session must come from the cookie",
    "/bios/view": "bio must be a bio identity and session must come from the cookie",
    "/bios/rename": "bio must be a bio identity, name must be text, and session must come from the cookie",
    "/bios/details": "bio must be an identity, public details must be text, and session must come from the cookie",
    "/bios/discard": "bio must be a bio identity and session must come from the cookie",
    "/bios/tags/add": "bio and tag must be identities and session must come from the cookie",
    "/bios/tags/remove": "bio and tag must be identities and session must come from the cookie",
    "/bios/look/template": "bio and template must be identities and session must come from the cookie",
    "/bios/look/font": `font must be one of ${fonts.join(", ")}`,
    "/bios/look/palette": `palette must be one of ${palettes.join(", ")}`,
    "/bios/look/reset": "bio must be a bio identity and session must come from the cookie",
  };

  /** Values that are not text, among them the shapes a database query could be smuggled in as. */
  const notText = [42, true, null, ["text"], { $ne: "" }];

  test("a request with a field the endpoint does not take is rejected and changes nothing", async () => {
    const { alice, named, seen } = await aliceWithABioToChange();
    const before = await seen();

    for (const { path, request } of everyEndpoint) {
      const answer = await alice(path, { ...request(named), extra: "field" });
      expect({ path, ...statusAndBody(answer) }).toEqual({ path, ...notUnderstood(reasons[path]!) });
    }
    expect(await seen()).toEqual(before);
  });

  test("a bio, or any other field, that is not text is rejected and changes nothing", async () => {
    const { alice, named, seen } = await aliceWithABioToChange();
    const before = await seen();

    for (const { path, request } of everyEndpoint) {
      for (const field of Object.keys(request(named))) {
        for (const value of notText) {
          const answer = await alice(path, { ...request(named), [field]: value });
          const sent = { path, field, value };
          expect({ sent, ...statusAndBody(answer) }).toEqual({ sent, ...notUnderstood(reasons[path]!) });
        }
      }
    }
    expect(await seen()).toEqual(before);
  });

  test("a request that leaves out a field is rejected and changes nothing", async () => {
    const { alice, named, seen } = await aliceWithABioToChange();
    const before = await seen();

    for (const { path, request } of everyEndpoint) {
      for (const field of Object.keys(request(named))) {
        const { [field]: _leftOut, ...rest } = request(named);
        const answer = await alice(path, rest);
        const sent = { path, without: field };
        expect({ sent, ...statusAndBody(answer) }).toEqual({ sent, ...FIELD_MISSING });
      }
    }
    expect(await seen()).toEqual(before);
  });
});
