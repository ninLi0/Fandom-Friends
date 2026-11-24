import { describe, expect, test } from "bun:test";
import {
  InvalidTagName,
  TagAlreadyAdded,
  TagNotAdded,
  TagNotFound,
  TaggingConcept,
  type Tag,
} from "../../src/concepts/Tagging/Tagging.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

/** Tag identities come out in the order given, so a test can name them. */
function tagging(...identities: string[]) {
  const fresh = identities.length === 0 ? undefined : () => {
    const next = identities.shift();
    if (next === undefined) throw new Error("No identity remains.");
    return next;
  };
  return new TaggingConcept<string>(database(), "Tagging", fresh);
}

const unknown = "missing" as Tag;

describe("Tagging principle", () => {
  test("a tag added to two items finds both, a repeat is refused, and removing it from one leaves the other", async () => {
    const concept = tagging("frieren");
    const { tag } = await concept.define({ name: "Frieren" });
    expect(tag).toBe("frieren" as Tag);

    expect(await concept.add({ item: "alice-bio", tag })).toEqual({ item: "alice-bio", tag });
    expect(await concept.add({ item: "bob-bio", tag })).toEqual({ item: "bob-bio", tag });
    expect(await concept._itemsWith({ tag })).toEqual([{ item: "alice-bio" }, { item: "bob-bio" }]);
    expect(await concept._tagsOf({ item: "alice-bio" })).toEqual([{ tag, name: "Frieren" }]);

    const repeat = await refusal(() => concept.add({ item: "alice-bio", tag }));
    expect(repeat).toBeInstanceOf(TagAlreadyAdded);
    expect(repeat.message).toBe("The item already has this tag.");

    expect(await concept.remove({ item: "alice-bio", tag })).toEqual({ item: "alice-bio", tag });
    expect(await concept._itemsWith({ tag })).toEqual([{ item: "bob-bio" }]);
    expect(await concept._tagsOf({ item: "alice-bio" })).toEqual([]);
  });

  test("renaming changes the name every item shows and keeps the tag on them; retiring removes it everywhere", async () => {
    const concept = tagging();
    const { tag } = await concept.define({ name: "Frieren" });
    const { tag: other } = await concept.define({ name: "Sketch swaps" });
    await concept.add({ item: "alice-bio", tag });
    await concept.add({ item: "alice-bio", tag: other });
    await concept.add({ item: "bob-bio", tag });

    expect(await concept.rename({ tag, name: "Sousou no Frieren" })).toEqual({ tag });
    expect(await concept._get({ tag })).toEqual([{ name: "Sousou no Frieren" }]);
    expect(await concept._tagsOf({ item: "bob-bio" })).toEqual([{ tag, name: "Sousou no Frieren" }]);

    expect(await concept.retire({ tag })).toEqual({ tag });
    expect(await concept._get({ tag })).toEqual([]);
    expect(await concept._itemsWith({ tag })).toEqual([]);
    expect(await concept._tagsOf({ item: "bob-bio" })).toEqual([]);
    // The other tag is untouched.
    expect(await concept._tagsOf({ item: "alice-bio" })).toEqual([{ tag: other, name: "Sketch swaps" }]);
  });
});

describe("Tagging refusals", () => {
  test("a blank or too-long name is refused by define and rename, and nothing is saved", async () => {
    const concept = tagging();
    for (const name of ["", "   ", "x".repeat(65)]) {
      const error = await refusal(() => concept.define({ name }));
      expect(error).toBeInstanceOf(InvalidTagName);
      expect(error.message).toBe("A tag name must not be blank and must be at most 64 characters.");
    }
    expect(await concept._suggest({ text: "" })).toEqual([]);

    const { tag } = await concept.define({ name: "x".repeat(64) });
    expect(await refusal(() => concept.rename({ tag, name: " " }))).toBeInstanceOf(InvalidTagName);
    expect(await concept._get({ tag })).toEqual([{ name: "x".repeat(64) }]);
  });

  test("an unknown tag is refused by rename, retire, and add; an unknown tag is checked before the name", async () => {
    const concept = tagging();
    for (const run of [
      () => concept.rename({ tag: unknown, name: "Frieren" }),
      () => concept.rename({ tag: unknown, name: "" }),
      () => concept.retire({ tag: unknown }),
      () => concept.add({ item: "alice-bio", tag: unknown }),
    ]) {
      const error = await refusal(run);
      expect(error).toBeInstanceOf(TagNotFound);
      expect(error.message).toBe("There is no such tag.");
    }
    expect(await concept._tagsOf({ item: "alice-bio" })).toEqual([]);
  });

  test("removing a tag the item does not have is refused, including a second removal", async () => {
    const concept = tagging();
    const { tag } = await concept.define({ name: "Frieren" });
    const error = await refusal(() => concept.remove({ item: "alice-bio", tag }));
    expect(error).toBeInstanceOf(TagNotAdded);
    expect(error.message).toBe("The item does not have this tag.");

    await concept.add({ item: "alice-bio", tag });
    await concept.remove({ item: "alice-bio", tag });
    expect(await refusal(() => concept.remove({ item: "alice-bio", tag }))).toBeInstanceOf(TagNotAdded);
  });
});

describe("Tagging queries", () => {
  test("suggest matches part of a name ignoring case, treats the text literally, and orders by name", async () => {
    const concept = tagging("t1", "t2", "t3", "t4");
    await concept.define({ name: "stark" });
    await concept.define({ name: "Fern/Stark" });
    await concept.define({ name: "Frieren" });
    await concept.define({ name: "C.C." });

    expect(await concept._suggest({ text: "STARK" })).toEqual([
      { tag: "t2" as Tag, name: "Fern/Stark" },
      { tag: "t1" as Tag, name: "stark" },
    ]);
    // A dot is a dot, not "any character".
    expect(await concept._suggest({ text: "c.c" })).toEqual([{ tag: "t4" as Tag, name: "C.C." }]);
    expect(await concept._suggest({ text: "f.r" })).toEqual([]);
    expect(await concept._suggest({ text: "zzz" })).toEqual([]);
    expect((await concept._suggest({ text: "" })).map(({ name }) => name)).toEqual(["C.C.", "Fern/Stark", "Frieren", "stark"]);
  });

  test("two tags may share a name, and they stay separate tags", async () => {
    const concept = tagging("stark-frieren", "stark-marvel");
    const first = await concept.define({ name: "Stark" });
    const second = await concept.define({ name: "Stark" });
    await concept.add({ item: "alice-bio", tag: first.tag });

    expect(await concept._suggest({ text: "stark" })).toEqual([
      { tag: first.tag, name: "Stark" },
      { tag: second.tag, name: "Stark" },
    ]);
    expect(await concept._itemsWith({ tag: second.tag })).toEqual([]);
  });

  test("an item's tags are ordered by name, and unknown things answer with no rows", async () => {
    const concept = tagging();
    const sketch = await concept.define({ name: "sketch swaps" });
    const frieren = await concept.define({ name: "Frieren" });
    await concept.add({ item: "alice-bio", tag: sketch.tag });
    await concept.add({ item: "alice-bio", tag: frieren.tag });

    expect((await concept._tagsOf({ item: "alice-bio" })).map(({ name }) => name)).toEqual(["Frieren", "sketch swaps"]);
    expect(await concept._tagsOf({ item: "nobody" })).toEqual([]);
    expect(await concept._get({ tag: unknown })).toEqual([]);
    expect(await concept._itemsWith({ tag: unknown })).toEqual([]);
  });
});

describe("Tagging storage", () => {
  test("tags and what they are on survive a new instance on the same database", async () => {
    const { tag } = await tagging().define({ name: "Frieren" });
    await tagging().add({ item: "alice-bio", tag });
    // A second instance stands in for the server after a restart.
    const restarted = tagging();
    expect(await restarted._tagsOf({ item: "alice-bio" })).toEqual([{ tag, name: "Frieren" }]);
    expect(await refusal(() => restarted.add({ item: "alice-bio", tag }))).toBeInstanceOf(TagAlreadyAdded);
  });

  test("two instances of the concept keep separate tags", async () => {
    const bios = new TaggingConcept<string>(database(), "BioTagging");
    const posts = new TaggingConcept<string>(database(), "PostTagging");
    await bios.define({ name: "Frieren" });
    expect(await posts._suggest({ text: "" })).toEqual([]);
  });
});
