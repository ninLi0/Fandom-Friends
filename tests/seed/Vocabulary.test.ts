/**
 * The starter vocabulary: first the hand-built list in src/seed/vocabulary.ts, checked as plain data, and then
 * what src/seed/apply.ts does when it loads a list into the concepts.
 */
import { describe, expect, test } from "bun:test";
import type { Db } from "mongodb";
import { createInstances } from "../../src/assembly.ts";
import type { Draft } from "../../src/concepts/Drafting/Drafting.ts";
import type { Tag } from "../../src/concepts/Tagging/Tagging.ts";
import { seedVocabulary, type VocabularyConcepts } from "../../src/seed/apply.ts";
import {
  fonts,
  layouts,
  palettes,
  tags as starterTags,
  templates as starterTemplates,
  type SeedTag,
  type SeedTemplate,
} from "../../src/seed/vocabulary.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

// ---- Reading a list as data ----

const SERIES = "Frieren";
const INTERESTS = "Interests";

const otherNames = (tag: SeedTag): readonly string[] => tag.alsoCalled ?? [];
const placedUnder = (tag: SeedTag): readonly string[] => tag.under ?? [];
const mainNames = (list: readonly SeedTag[]): string[] => list.map(({ name }) => name);

/** Every name a list uses, main or not. */
const everyName = (list: readonly SeedTag[]): string[] => list.flatMap((tag) => [tag.name, ...otherNames(tag)]);

/** The values that come up again after their first appearance. */
function repeated(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

/** True when the tag lies directly under this one name and nothing else. */
function onlyUnder(tag: SeedTag, parent: string): boolean {
  return placedUnder(tag).length === 1 && placedUnder(tag)[0] === parent;
}

/** Every name reached from a tag by following `under` upward, any number of steps. Ends even when the list loops. */
function everythingAbove(list: readonly SeedTag[], name: string): Set<string> {
  const reached = new Set<string>();
  const waiting = [name];
  while (waiting.length > 0) {
    const current = waiting.pop();
    const tag = list.find((candidate) => candidate.name === current);
    for (const parent of tag === undefined ? [] : placedUnder(tag)) {
      if (reached.has(parent)) continue;
      reached.add(parent);
      waiting.push(parent);
    }
  }
  return reached;
}

// The four kinds of tag the header comment of vocabulary.ts describes. The list does not label them, so they
// are told apart by what a tag lies directly under. Every tag falls into exactly one kind, and the tests hold
// each kind to its promise, so a tag placed anywhere unexpected fails one of them.
const tops = starterTags.filter((tag) => placedUnder(tag).length === 0);
const interests = starterTags.filter((tag) => placedUnder(tag).includes(INTERESTS));
const characters = starterTags.filter((tag) => placedUnder(tag).includes(SERIES) && !interests.includes(tag));
const pairings = starterTags.filter((tag) => ![...tops, ...interests, ...characters].includes(tag));

// ---- Reading back what was loaded ----

/** One row of what lies above or under a tag: the other tag's name, and whether it is one step away. */
type Placed = [name: string, direct: boolean];

function inNameOrder(rows: Placed[]): Placed[] {
  return rows.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

/** Reads every tag back and answers the identity of the tag with a name. Throws unless exactly one tag has it. */
async function tagFinder({ Tagging }: VocabularyConcepts): Promise<(name: string) => Tag> {
  const saved = await Tagging._suggest({ text: "" });
  return (name) => {
    const found = saved.filter((row) => row.name === name);
    if (found.length !== 1) throw new Error(`${found.length} tags are called "${name}".`);
    return found[0]!.tag;
  };
}

/** The name of a tag, so that a failure names tags and does not print identities. */
async function nameOf({ Tagging }: VocabularyConcepts, tag: Tag): Promise<string> {
  const [found] = await Tagging._get({ tag });
  return found === undefined ? `(no tag ${tag})` : found.name;
}

/** What lies above a tag, by name, in name order. */
async function above(vocabulary: VocabularyConcepts, item: Tag): Promise<Placed[]> {
  const rows: Placed[] = [];
  for (const { broader, direct } of await vocabulary.Grouping._above({ item })) {
    rows.push([await nameOf(vocabulary, broader), direct]);
  }
  return inNameOrder(rows);
}

/** What lies under a tag, by name, in name order. */
async function under(vocabulary: VocabularyConcepts, item: Tag): Promise<Placed[]> {
  const rows: Placed[] = [];
  for (const { member, direct } of await vocabulary.Grouping._under({ item })) {
    rows.push([await nameOf(vocabulary, member), direct]);
  }
  return inNameOrder(rows);
}

/** All the vocabulary holds: each tag's identity, name, the tag it stands for, and what lies above it; and each template. */
async function everythingSaved({ Tagging, Synonymizing, Grouping, Templating }: VocabularyConcepts) {
  const tags = [];
  for (const { tag, name } of await Tagging._suggest({ text: "" })) {
    const { canonical } = await Synonymizing._canonical({ item: tag });
    tags.push({ tag, name, canonical, above: await Grouping._above({ item: tag }) });
  }
  return { tags, templates: await Templating._templates({}) };
}

/** Nothing was saved: no tag, no template, and not even an empty collection. */
async function expectNothingSaved(database: Db, { Tagging, Templating }: VocabularyConcepts) {
  expect(await Tagging._suggest({ text: "" })).toEqual([]);
  expect(await Templating._templates({})).toEqual([]);
  expect((await database.listCollections().toArray()).map(({ name }) => name)).toEqual([]);
}

/** The report of a load that found everything already there. */
const nothingAdded = { tagsDefined: 0, namesLinked: 0, placementsMade: 0, templatesDefined: 0 };

const classic: SeedTemplate = { name: "Classic", layout: "Stacked", font: "Serif", palette: "Parchment", default: true };
const sideBySide: SeedTemplate = { name: "Side by side", layout: "Two columns", font: "Sans", palette: "Midnight" };

describe("the starter tag list", () => {
  test("no name is used twice, across main names and other names", () => {
    expect(repeated(everyName(starterTags))).toEqual([]);
  });

  test("no two different names differ only by letter case", () => {
    // The loader compares names exactly, so "Fanart" and "fanart" would load as two tags that look like one.
    const different = [...new Set(everyName(starterTags))];
    expect(repeated(different.map((name) => name.toLowerCase()))).toEqual([]);
  });

  test("every name is nonblank and at most 64 characters, the Tagging limit, in any script", () => {
    const names = everyName(starterTags);
    expect(names.filter((name) => name.trim() === "" || name.length > 64)).toEqual([]);

    // The Japanese names are in the list and are held to the same limit. Tagging counts a name's `length`.
    const japanese = names.filter((name) => /[\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Han}]/u.test(name));
    expect(japanese).toContain("葬送のフリーレン");
    expect(japanese.filter((name) => name.length > 64)).toEqual([]);
  });

  test("no name has a space at either end or an accent typed as a separate character", () => {
    // Such a name looks the same as the clean one and is a different name to the loader and to tag search.
    const names = everyName(starterTags);
    expect(names.filter((name) => name !== name.trim())).toEqual([]);
    expect(names.filter((name) => name !== name.normalize("NFC"))).toEqual([]);
  });

  test("every broader tag is a main tag in the list and is given once, and nothing lies under itself or in a loop", () => {
    const mains = new Set(mainNames(starterTags));
    const unknown = starterTags.flatMap((tag) =>
      placedUnder(tag)
        .filter((parent) => !mains.has(parent))
        .map((parent) => `"${tag.name}" under "${parent}"`),
    );
    expect(unknown).toEqual([]);

    // The loader would stop halfway on a tag that names the same broader tag twice.
    const twice = starterTags.flatMap((tag) =>
      repeated(placedUnder(tag)).map((parent) => `"${tag.name}" under "${parent}"`),
    );
    expect(twice).toEqual([]);

    const underItself = starterTags.filter((tag) => placedUnder(tag).includes(tag.name));
    expect(mainNames(underItself)).toEqual([]);
    const inALoop = starterTags.filter((tag) => everythingAbove(starterTags, tag.name).has(tag.name));
    expect(mainNames(inALoop)).toEqual([]);
  });

  test('the series "Frieren" has nothing above it, and only it and "Interests" stand at the top', () => {
    expect(mainNames(tops)).toEqual([SERIES, INTERESTS]);
  });

  test('every character lies directly under "Frieren" and nothing else', () => {
    expect(mainNames(characters)).toContain("Fern");
    expect(mainNames(characters.filter((tag) => !onlyUnder(tag, SERIES)))).toEqual([]);
  });

  test("every pairing lies directly under two characters that are in the list, and so counts as the series", () => {
    expect(mainNames(pairings)).toContain("Fern/Stark");
    const characterNames = mainNames(characters);
    const misplaced = pairings.filter((tag) => {
      const [first, second, ...more] = placedUnder(tag);
      const twoCharacters =
        first !== undefined &&
        second !== undefined &&
        more.length === 0 &&
        first !== second &&
        characterNames.includes(first) &&
        characterNames.includes(second);
      return !twoCharacters;
    });
    expect(mainNames(misplaced)).toEqual([]);

    const outsideTheSeries = pairings.filter((tag) => !everythingAbove(starterTags, tag.name).has(SERIES));
    expect(mainNames(outsideTheSeries)).toEqual([]);
  });

  test('every interest lies directly under "Interests" and nothing else', () => {
    expect(mainNames(interests)).toContain("Sketch swaps");
    expect(mainNames(interests.filter((tag) => !onlyUnder(tag, INTERESTS)))).toEqual([]);
  });
});

describe("the starter templates", () => {
  const offers = (offered: readonly string[], choice: string) => offered.includes(choice);

  test("exactly one template is the default, and no template name is used twice", () => {
    expect(starterTemplates.filter((template) => template.default).map(({ name }) => name)).toHaveLength(1);
    expect(repeated(starterTemplates.map(({ name }) => name))).toEqual([]);
  });

  test("each template's layout, font, and palette are among the offered ones", () => {
    const unoffered = starterTemplates.flatMap(({ name, layout, font, palette }) => [
      ...(offers(layouts, layout) ? [] : [`${name}: layout "${layout}"`]),
      ...(offers(fonts, font) ? [] : [`${name}: font "${font}"`]),
      ...(offers(palettes, palette) ? [] : [`${name}: palette "${palette}"`]),
    ]);
    expect(unoffered).toEqual([]);
  });

  test("every template name and offered layout, font, and palette is nonblank and at most 64 characters", () => {
    // The Templating limit. A longer font would be offered on the page and then refused.
    const words = [...starterTemplates.map(({ name }) => name), ...layouts, ...fonts, ...palettes];
    expect(words.filter((word) => word.trim() === "" || word.length > 64)).toEqual([]);
  });

  test("no layout, font, or palette is offered twice", () => {
    for (const offered of [layouts, fonts, palettes]) expect(repeated(offered)).toEqual([]);
  });
});

describe("loading a vocabulary into the concepts", () => {
  // Only loading needs a database, so it is set up for these tests and the checks above run without one.
  const database = useTestDatabase();

  test("every name becomes a tag, each other name stands for its main tag, and a main tag stands for itself", async () => {
    const vocabulary = createInstances(database());
    await seedVocabulary(vocabulary);
    const { Tagging, Synonymizing } = vocabulary;

    // Exactly the names in the list, each once.
    const saved = await Tagging._suggest({ text: "" });
    expect(saved.map(({ name }) => name).sort()).toEqual(everyName(starterTags).sort());

    const tagCalled = await tagFinder(vocabulary);
    const wrong: string[] = [];
    for (const { name, alsoCalled = [] } of starterTags) {
      const main = tagCalled(name);
      const itself = await Synonymizing._canonical({ item: main });
      if (itself.canonical !== main) wrong.push(`"${name}" does not stand for itself`);
      for (const other of alsoCalled) {
        const { canonical } = await Synonymizing._canonical({ item: tagCalled(other) });
        if (canonical !== main) wrong.push(`"${other}" does not stand for "${name}"`);
      }
    }
    expect(wrong).toEqual([]);

    // Asking what means the same as one of the series' names answers all four, each still its own tag.
    const sameNames = [];
    for (const { other } of await Synonymizing._same({ item: tagCalled("葬送のフリーレン") })) {
      sameNames.push(await nameOf(vocabulary, other));
    }
    expect(sameNames.sort()).toEqual(["Frieren", "Frieren: Beyond Journey's End", "Sousou no Frieren", "葬送のフリーレン"]);
  });

  test('"Fern/Stark" lies directly under "Fern" and "Stark" and further up under "Frieren", which holds every character and pairing', async () => {
    const vocabulary = createInstances(database());
    await seedVocabulary(vocabulary);
    const { Grouping } = vocabulary;
    const tagCalled = await tagFinder(vocabulary);

    expect(await above(vocabulary, tagCalled("Fern/Stark"))).toEqual([
      ["Fern", true],
      ["Frieren", false],
      ["Stark", true],
    ]);

    // Characters are one step under the series, and pairings are reached through their characters. Nothing else is there.
    expect(await under(vocabulary, tagCalled(SERIES))).toEqual(
      inNameOrder([
        ...characters.map(({ name }): Placed => [name, true]),
        ...pairings.map(({ name }): Placed => [name, false]),
      ]),
    );
    expect(await under(vocabulary, tagCalled(INTERESTS))).toEqual(
      inNameOrder(interests.map(({ name }): Placed => [name, true])),
    );

    // Only the series and "Interests" stand at the top.
    const top = [];
    for (const { item } of await Grouping._top({})) top.push(await nameOf(vocabulary, item));
    expect(top.sort()).toEqual([SERIES, INTERESTS]);

    // Groups are between main tags only: another name of a tag is placed nowhere.
    const placedOtherNames: string[] = [];
    for (const other of starterTags.flatMap(otherNames)) {
      const item = tagCalled(other);
      const rows = [...(await Grouping._above({ item })), ...(await Grouping._under({ item }))];
      if (rows.length > 0) placedOtherNames.push(other);
    }
    expect(placedOtherNames).toEqual([]);
  });

  test('the alpha and MVP templates exist, "Classic" is the default, and a bio with nothing chosen shows its look', async () => {
    const vocabulary = createInstances(database());
    await seedVocabulary(vocabulary);
    const { Templating } = vocabulary;

    const saved = await Templating._templates({});
    const looks = saved.map(({ name, layout, font, palette, default: isDefault }) => ({ name, layout, font, palette, isDefault }));
    expect(looks).toEqual([
      { name: "Classic", layout: "Stacked", font: "Serif", palette: "Parchment", isDefault: true },
      { name: "Convention poster", layout: "poster", font: "Sans", palette: "Ocean", isDefault: false },
      { name: "Favorites first", layout: "Spotlight", font: "Rounded", palette: "Sakura", isDefault: false },
      { name: "Quiet notes", layout: "minimal", font: "Mono", palette: "Forest", isDefault: false },
      { name: "Side by side", layout: "Two columns", font: "Sans", palette: "Midnight", isDefault: false },
      { name: "Side by side (MVP)", layout: "columns", font: "Serif", palette: "Sunset", isDefault: false },
    ]);

    const bio = "a-bio-with-nothing-chosen" as Draft;
    expect(await Templating._look({ item: bio })).toEqual([
      { template: saved[0]!.template, layout: "Stacked", font: "Serif", palette: "Parchment" },
    ]);
    // Showing the default look is not a choice the bio made.
    expect(await Templating._styled({ item: bio })).toEqual({ styled: false });
  });

  test("the report counts what the list holds", async () => {
    const report = await seedVocabulary(createInstances(database()));
    expect(report).toEqual({
      tagsDefined: everyName(starterTags).length,
      namesLinked: starterTags.flatMap(otherNames).length,
      placementsMade: starterTags.flatMap(placedUnder).length,
      templatesDefined: starterTemplates.length,
    });
  });

  test("loading a second time adds nothing and changes nothing", async () => {
    const vocabulary = createInstances(database());
    await seedVocabulary(vocabulary);
    const before = await everythingSaved(vocabulary);

    // New instances stand in for the server starting again.
    const restarted = createInstances(database());
    expect(await seedVocabulary(restarted)).toEqual(nothingAdded);
    expect(await everythingSaved(restarted)).toEqual(before);
  });

  test("loading a longer list keeps the tags already there, adds only what is new, and leaves a bio's tag on it", async () => {
    const vocabulary = createInstances(database());
    const { Tagging, Synonymizing, Grouping, Templating } = vocabulary;

    const first = await seedVocabulary(
      vocabulary,
      [
        { name: "Frieren", alsoCalled: ["Sousou no Frieren"] },
        { name: "Fern", under: ["Frieren"] },
      ],
      [classic],
    );
    expect(first).toEqual({ tagsDefined: 3, namesLinked: 1, placementsMade: 1, templatesDefined: 1 });
    const firstTag = await tagFinder(vocabulary);
    const frieren = firstTag("Frieren");
    const sousou = firstTag("Sousou no Frieren");
    const fern = firstTag("Fern");
    const firstClassic = (await Templating._templates({}))[0]!.template;

    // Alice puts "Fern" on her bio before the list grows.
    const bio = "alice-bio" as Draft;
    await Tagging.add({ item: bio, tag: fern });

    // The longer list has everything the first had, plus new names, new tags, new places, and a new template.
    const second = await seedVocabulary(
      vocabulary,
      [
        { name: "Frieren", alsoCalled: ["Sousou no Frieren", "葬送のフリーレン"] },
        { name: "Fern", alsoCalled: ["フェルン"], under: ["Frieren"] },
        { name: "Stark", under: ["Frieren"] },
        { name: "Fern/Stark", under: ["Fern", "Stark"] },
      ],
      [classic, sideBySide],
    );
    expect(second).toEqual({ tagsDefined: 4, namesLinked: 2, placementsMade: 3, templatesDefined: 1 });

    // Each name is one tag, and the first three are the same tags as before.
    expect((await Tagging._suggest({ text: "" })).map(({ name }) => name)).toEqual([
      "Fern",
      "Fern/Stark",
      "Frieren",
      "Sousou no Frieren",
      "Stark",
      "フェルン",
      "葬送のフリーレン",
    ]);
    const tagCalled = await tagFinder(vocabulary);
    expect(["Frieren", "Sousou no Frieren", "Fern"].map(tagCalled)).toEqual([frieren, sousou, fern]);
    expect(await Tagging._get({ tag: fern })).toEqual([{ name: "Fern" }]);

    // The new names and places attach to those same tags.
    expect(await Synonymizing._canonical({ item: sousou })).toEqual({ canonical: frieren });
    expect(await Synonymizing._canonical({ item: tagCalled("葬送のフリーレン") })).toEqual({ canonical: frieren });
    expect(await Synonymizing._canonical({ item: tagCalled("フェルン") })).toEqual({ canonical: fern });
    expect(await Grouping._above({ item: fern })).toEqual([{ broader: frieren, direct: true }]);
    expect(await above(vocabulary, tagCalled("Fern/Stark"))).toEqual([
      ["Fern", true],
      ["Frieren", false],
      ["Stark", true],
    ]);

    // Alice's bio still has the tag she added.
    expect(await Tagging._tagsOf({ item: bio })).toEqual([{ tag: fern, name: "Fern" }]);
    expect(await Tagging._itemsWith({ tag: fern })).toEqual([{ item: bio }]);

    // The first template is the same template and still the default.
    const templates = await Templating._templates({});
    expect(templates.map(({ name, default: isDefault }) => [name, isDefault])).toEqual([
      ["Classic", true],
      ["Side by side", false],
    ]);
    expect(templates[0]!.template).toBe(firstClassic);
  });

  test("a default the team chose later is still the default after the list is loaded again", async () => {
    const vocabulary = createInstances(database());
    await seedVocabulary(vocabulary);
    const { Templating } = vocabulary;

    const chosen = (await Templating._templates({})).find(({ name }) => name === "Side by side")!.template;
    await Templating.makeDefault({ template: chosen });

    expect(await seedVocabulary(vocabulary)).toEqual(nothingAdded);
    const defaults = (await Templating._templates({})).filter((template) => template.default);
    expect(defaults.map(({ name }) => name)).toEqual(["Side by side"]);
    expect(await Templating._look({ item: "a-new-bio" as Draft })).toEqual([
      { template: chosen, layout: "Two columns", font: "Sans", palette: "Midnight" },
    ]);
  });

  // Each bad list starts with tags that are fine, so a loader that saved as it went would leave them behind.
  const fineTags: SeedTag[] = [
    { name: "Frieren", alsoCalled: ["Sousou no Frieren"] },
    { name: "Fern", under: ["Frieren"] },
  ];
  const badLists: { fault: string; tags: SeedTag[]; templates: SeedTemplate[]; message: string }[] = [
    {
      fault: "a main name on two tags",
      tags: [...fineTags, { name: "Fern" }],
      templates: [classic],
      message: 'The tag list uses the name "Fern" twice.',
    },
    {
      fault: "another name that is also a main name",
      tags: [...fineTags, { name: "Stark", alsoCalled: ["Fern"] }],
      templates: [classic],
      message: 'The tag list uses the name "Fern" twice.',
    },
    {
      fault: "another name on two tags",
      tags: [...fineTags, { name: "Stark", alsoCalled: ["Sousou no Frieren"] }],
      templates: [classic],
      message: 'The tag list uses the name "Sousou no Frieren" twice.',
    },
    {
      fault: "a tag under a name the list does not have",
      tags: [...fineTags, { name: "Laios", under: ["Dungeon Meshi"] }],
      templates: [classic],
      message: '"Laios" is placed under "Dungeon Meshi", which is not a main tag in the list.',
    },
    {
      fault: "a tag under another name of a tag rather than its main name",
      tags: [...fineTags, { name: "Stark", under: ["Sousou no Frieren"] }],
      templates: [classic],
      message: '"Stark" is placed under "Sousou no Frieren", which is not a main tag in the list.',
    },
    {
      fault: "a blank tag name",
      tags: [...fineTags, { name: "  " }],
      templates: [classic],
      message: 'The tag name "  " is blank or longer than 64 characters.',
    },
    {
      fault: "another name longer than Tagging allows",
      tags: [...fineTags, { name: "Stark", alsoCalled: ["x".repeat(65)] }],
      templates: [classic],
      message: `The tag name "${"x".repeat(65)}" is blank or longer than 64 characters.`,
    },
    {
      fault: "a tag under itself",
      tags: [...fineTags, { name: "Stark", under: ["Stark"] }],
      templates: [classic],
      message: '"Stark" lies under itself.',
    },
    {
      fault: "tags under each other in a loop",
      tags: [...fineTags, { name: "Stark", under: ["Eisen"] }, { name: "Eisen", under: ["Stark"] }],
      templates: [classic],
      message: '"Stark" lies under itself.',
    },
    {
      fault: "a tag under the same broader tag twice",
      tags: [...fineTags, { name: "Stark", under: ["Frieren", "Frieren"] }],
      templates: [classic],
      message: '"Stark" is placed under "Frieren" twice.',
    },
    {
      fault: "a template with a blank layout",
      tags: fineTags,
      templates: [classic, { ...sideBySide, layout: "" }],
      message: 'The layout "" of a template is blank or longer than 64 characters.',
    },
    {
      fault: "a template name on two templates",
      tags: fineTags,
      templates: [classic, sideBySide, { ...sideBySide, layout: "Spotlight" }],
      message: 'The template list uses the name "Side by side" twice.',
    },
    {
      fault: "no default template",
      tags: fineTags,
      templates: [sideBySide],
      message: "Exactly one template must be the default.",
    },
    {
      fault: "two default templates",
      tags: fineTags,
      templates: [classic, { ...sideBySide, default: true }],
      message: "Exactly one template must be the default.",
    },
  ];

  for (const { fault, tags, templates, message } of badLists) {
    test(`a list with ${fault} is rejected before anything is saved`, async () => {
      const vocabulary = createInstances(database());
      const error = await refusal(() => seedVocabulary(vocabulary, tags, templates));
      expect(error.message).toBe(message);
      await expectNothingSaved(database(), vocabulary);
    });
  }
});
