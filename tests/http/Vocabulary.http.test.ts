import { describe, expect, test } from "bun:test";
import {
  tags as starterTags,
  templates as starterTemplates,
  type SeedTag,
  type SeedTemplate,
} from "../../src/seed/vocabulary.ts";
import { startApp, type Answer } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

type App = Awaited<ReturnType<typeof startApp>>;

/** One suggested tag, as `/tags/suggest` answers it. */
interface Suggestion {
  tag: string;
  name: string;
  main: string;
  mainName: string;
}

/** The names a suggestion answer lists, in the order answered. */
function names(answer: Answer): string[] {
  return answer.body.tags.map((suggestion: Suggestion) => suggestion.name);
}

/** The names suggested for this text, asked with no session. */
async function suggested(app: App, text: string): Promise<string[]> {
  const answer = await app.visitor("/tags/suggest", { text });
  expect(answer.status).toBe(200);
  return names(answer);
}

/** The template names a list answer holds, in the order answered. */
function templateNames(answer: Answer): string[] {
  return answer.body.templates.map((template: { name: string }) => template.name);
}

describe("tag suggestions", () => {
  const textNotUnderstood = {
    error: "INVALID_REQUEST",
    detail: "The request was not understood: text must be at most 64 characters.",
  };

  test("anyone may ask, with no session, and a signed-in person gets the same answer", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    const asVisitor = await app.visitor("/tags/suggest", { text: "fri" });
    const signedIn = await alice("/tags/suggest", { text: "fri" });

    expect(asVisitor.status).toBe(200);
    expect(names(asVisitor)).toEqual(["Frieren", "Sousou no Frieren"]);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toEqual(asVisitor.body);
  });

  test("the text may match any part of a name", async () => {
    const app = await startApp(database());

    // The start of a name, the middle of one, and the end of one.
    expect(await suggested(app, "Epi")).toEqual(["Episode discussions"]);
    expect(await suggested(app, "ou no Fr")).toEqual(["Sousou no Frieren"]);
    expect(await suggested(app, "swaps")).toEqual(["Sketch swaps"]);
    expect(await suggested(app, "ern")).toEqual(["Fern", "Fern × Stark", "Fern/Stark"]);
  });

  test("matching ignores case", async () => {
    const app = await startApp(database());

    expect(await suggested(app, "FRIEREN")).toEqual(["Frieren", "Sousou no Frieren"]);
    expect(await suggested(app, "frieren")).toEqual(["Frieren", "Sousou no Frieren"]);
    expect(await suggested(app, "sTaRk")).toEqual(["Fern × Stark", "Fern/Stark", "Stark"]);
  });

  test("suggestions come in name order, ignoring case", async () => {
    // Listed out of order, with capital letters where plain character order would put them first.
    const mixedCase: SeedTag[] = [
      { name: "cherry" },
      { name: "Banana" },
      { name: "apple" },
      { name: "banana bread" },
      { name: "Apple" },
      { name: "Date", alsoCalled: ["avocado"] },
    ];
    const app = await startApp(database(), { tags: mixedCase });

    // Names that differ only in case come capital first.
    expect(await suggested(app, "")).toEqual(["Apple", "apple", "avocado", "Banana", "banana bread", "cherry", "Date"]);
    expect(await suggested(app, "an")).toEqual(["Banana", "banana bread"]);
  });

  test("empty text answers every tag, main names and other names alike", async () => {
    const app = await startApp(database());

    expect(await suggested(app, "")).toEqual([
      "Art trades",
      "Delicious in Dungeon",
      "Dungeon Meshi",
      "Episode discussions",
      "Fern",
      "Fern × Stark",
      "Fern/Stark",
      "Frieren",
      "Interests",
      "Sketch swaps",
      "Sousou no Frieren",
      "Stark",
    ]);
  });

  test("a main tag stands for itself, whether or not it lies under another tag", async () => {
    const app = await startApp(database());

    const { body } = await app.visitor("/tags/suggest", { text: "" });
    const called = (name: string): Suggestion => body.tags.find((suggestion: Suggestion) => suggestion.name === name);

    for (const name of ["Frieren", "Fern", "Fern/Stark", "Interests", "Sketch swaps", "Dungeon Meshi"]) {
      const suggestion = called(name);
      expect(suggestion.main).toBe(suggestion.tag);
      expect(suggestion.mainName).toBe(name);
    }
  });

  test("another name carries the main tag it stands for", async () => {
    const app = await startApp(database());

    const { body } = await app.visitor("/tags/suggest", { text: "" });
    const called = (name: string): Suggestion => body.tags.find((suggestion: Suggestion) => suggestion.name === name);

    for (const [otherName, mainName] of [
      ["Sousou no Frieren", "Frieren"],
      ["Fern × Stark", "Fern/Stark"],
      ["Art trades", "Sketch swaps"],
      ["Delicious in Dungeon", "Dungeon Meshi"],
    ] as const) {
      const suggestion = called(otherName);
      expect(suggestion.mainName).toBe(mainName);
      expect(suggestion.main).toBe(called(mainName).tag);
      expect(suggestion.tag).not.toBe(suggestion.main);
    }
  });

  test("each suggestion holds a tag, its name, the main tag and the main tag's name, and nothing else", async () => {
    const app = await startApp(database());

    const { body } = await app.visitor("/tags/suggest", { text: "Sousou" });

    expect(body).toEqual({
      tags: [
        { tag: await app.tag("Sousou no Frieren"), name: "Sousou no Frieren", main: await app.tag("Frieren"), mainName: "Frieren" },
      ],
    });
  });

  test("the text is taken literally: a character that means something in a pattern matches only itself", async () => {
    const awkwardNames: SeedTag[] = [
      { name: "Dr. Stone" },
      { name: "Re:Zero" },
      { name: "K-On!" },
      { name: "Mob Psycho 100 (manga)" },
      { name: "C++ club" },
      { name: "Who? [oneshot]" },
      { name: "a*b" },
      { name: "100% ^_^ $5" },
      { name: "back\\slash" },
      { name: "either|or" },
      { name: "set {1,2}" },
      { name: "plain" },
    ];
    const app = await startApp(database(), { tags: awkwardNames });

    // Each of these would match other names, or every name, if the text were read as a pattern.
    const literally: [string, string[]][] = [
      [".", ["Dr. Stone"]],
      ["*", ["a*b"]],
      ["+", ["C++ club"]],
      ["?", ["Who? [oneshot]"]],
      ["^", ["100% ^_^ $5"]],
      ["$", ["100% ^_^ $5"]],
      ["(", ["Mob Psycho 100 (manga)"]],
      [")", ["Mob Psycho 100 (manga)"]],
      ["[", ["Who? [oneshot]"]],
      ["]", ["Who? [oneshot]"]],
      ["{", ["set {1,2}"]],
      ["}", ["set {1,2}"]],
      ["|", ["either|or"]],
      ["\\", ["back\\slash"]],
      ["c+", ["C++ club"]],
      [".*", []],
      ["a.b", []],
      ["[a-z]", []],
      ["\\d", []],
      ["^plain$", []],
      ["(manga|plain)", []],
    ];
    for (const [text, expected] of literally) {
      expect([text, await suggested(app, text)]).toEqual([text, expected]);
    }
  });

  test("text that no name contains answers an empty list", async () => {
    const app = await startApp(database());

    const answer = await app.visitor("/tags/suggest", { text: "Gundam" });

    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({ tags: [] });
  });

  test("text of exactly 64 characters is accepted", async () => {
    const longest = "The longest name a tag may have is sixty-four characters long ok";
    expect(longest).toHaveLength(64);
    const app = await startApp(database(), { tags: [{ name: longest }, { name: "Short" }] });

    expect(await suggested(app, longest.toUpperCase())).toEqual([longest]);
  });

  test("text over 64 characters is rejected", async () => {
    const app = await startApp(database());

    const answer = await app.visitor("/tags/suggest", { text: "a".repeat(65) });

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual(textNotUnderstood);
  });

  test("a request with no text is rejected", async () => {
    const app = await startApp(database());

    const answer = await app.visitor("/tags/suggest", {});

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual({ error: "INVALID_REQUEST" });
  });

  test("text that is not a string is rejected", async () => {
    const app = await startApp(database());

    for (const text of [5, null, ["Frieren"], { name: "Frieren" }]) {
      const answer = await app.visitor("/tags/suggest", { text });
      expect(answer.status).toBe(400);
      expect(answer.body).toEqual(textNotUnderstood);
    }
  });

  test("a field suggestions do not take is rejected", async () => {
    const app = await startApp(database());

    const answer = await app.visitor("/tags/suggest", { text: "Frieren", limit: 5 });

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual(textNotUnderstood);
  });
});

describe("the template list", () => {
  test("anyone may ask, with no session, and a signed-in person gets the same answer", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    const asVisitor = await app.visitor("/templates/list", {});
    const signedIn = await alice("/templates/list", {});

    expect(asVisitor.status).toBe(200);
    expect(templateNames(asVisitor)).toEqual(["Classic", "Side by side"]);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toEqual(asVisitor.body);
  });

  test("each template is listed with its name, layout, font, color scheme, and whether it is the default", async () => {
    const app = await startApp(database());

    const { body } = await app.visitor("/templates/list", {});

    expect(body).toEqual({
      templates: [
        {
          template: await app.template("Classic"),
          name: "Classic",
          layout: "Stacked",
          font: "Serif",
          palette: "Parchment",
          default: true,
        },
        {
          template: await app.template("Side by side"),
          name: "Side by side",
          layout: "Two columns",
          font: "Sans",
          palette: "Midnight",
          default: false,
        },
      ],
    });
    expect(body.templates[0].template).not.toBe(body.templates[1].template);
  });

  /** Four templates listed out of name order. The default is neither the first listed nor the first by name. */
  const outOfOrder: SeedTemplate[] = [
    { name: "zine", layout: "Spotlight", font: "Mono", palette: "Forest" },
    { name: "Mellow", layout: "Stacked", font: "Rounded", palette: "Sakura", default: true },
    { name: "art deco", layout: "Two columns", font: "Sans", palette: "Midnight" },
    { name: "Classic", layout: "Stacked", font: "Serif", palette: "Parchment" },
  ];

  test("every template is listed, in name order ignoring case", async () => {
    const app = await startApp(database(), { templates: outOfOrder });

    const answer = await app.visitor("/templates/list", {});

    expect(answer.status).toBe(200);
    expect(templateNames(answer)).toEqual(["art deco", "Classic", "Mellow", "zine"]);
  });

  test("exactly one template is the default: the one the team chose", async () => {
    const app = await startApp(database(), { templates: outOfOrder });

    const { body } = await app.visitor("/templates/list", {});

    expect(body.templates.map((template: { name: string; default: boolean }) => [template.name, template.default])).toEqual([
      ["art deco", false],
      ["Classic", false],
      ["Mellow", true],
      ["zine", false],
    ]);
  });

  test("an extra input field is rejected", async () => {
    const app = await startApp(database());

    const answer = await app.visitor("/templates/list", { name: "Classic" });

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual({
      error: "INVALID_REQUEST",
      detail: "The request was not understood: this request takes no input.",
    });
  });
});

describe("the starter vocabulary the server loads", () => {
  /** Every name in the starter list, each with the main name it stands for. */
  const starterNames = starterTags.flatMap(({ name, alsoCalled = [] }) =>
    [name, ...alsoCalled].map((each) => [each, name]),
  );

  test("empty text answers one suggestion for every name in the list, main or not", async () => {
    const app = await startApp(database(), { tags: starterTags, templates: starterTemplates });

    const started = performance.now();
    const answer = await app.visitor("/tags/suggest", { text: "" });
    const milliseconds = performance.now() - started;
    console.log(`Suggesting all ${answer.body.tags?.length} starter tags (empty text): ${milliseconds.toFixed(1)} ms`);

    expect(answer.status).toBe(200);
    expect(answer.body.tags).toHaveLength(starterNames.length);
    const answered = answer.body.tags.map((suggestion: Suggestion) => [suggestion.name, suggestion.mainName]);
    expect(answered.sort()).toEqual([...starterNames].sort());
  });

  test('"Sousou no Frieren" stands for "Frieren"', async () => {
    const app = await startApp(database(), { tags: starterTags, templates: starterTemplates });

    const { body } = await app.visitor("/tags/suggest", { text: "Sousou no Frieren" });

    expect(body.tags).toHaveLength(1);
    expect(body.tags[0]).toEqual({
      tag: await app.tag("Sousou no Frieren"),
      name: "Sousou no Frieren",
      main: await app.tag("Frieren"),
      mainName: "Frieren",
    });
  });

  test("accented names are found ignoring case, and Japanese names are found", async () => {
    const app = await startApp(database(), { tags: starterTags, templates: starterTemplates });

    expect(await suggested(app, "übel")).toEqual(["Land/Übel", "Übel", "Übel × Land", "Übel/Land"]);
    expect(await suggested(app, "フリーレン")).toEqual(["フリーレン", "葬送のフリーレン"]);
  });

  test("three templates are listed and Classic is the default", async () => {
    const app = await startApp(database(), { tags: starterTags, templates: starterTemplates });

    const { status, body } = await app.visitor("/templates/list", {});

    expect(status).toBe(200);
    expect(body.templates.map((template: { name: string; default: boolean }) => [template.name, template.default])).toEqual([
      ["Classic", true],
      ["Favorites first", false],
      ["Side by side", false],
    ]);
  });
});
