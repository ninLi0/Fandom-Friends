import { describe, expect, test } from "bun:test";
import {
  SynonymAlreadyLinked,
  SynonymCanonicalLinked,
  SynonymIsCanonical,
  SynonymNotLinked,
  SynonymOfItself,
  SynonymizingConcept,
} from "../../src/concepts/Synonymizing/Synonymizing.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();
const synonymizing = () => new SynonymizingConcept<string>(database());

/** The items that mean the same as item, in the order the query answers them. */
async function same(concept: SynonymizingConcept<string>, item: string): Promise<string[]> {
  return (await concept._same({ item })).map(({ other }) => other);
}

/** The item's canonical item, or the item itself. */
async function canonicalOf(concept: SynonymizingConcept<string>, item: string): Promise<string> {
  return (await concept._canonical({ item })).canonical;
}

describe("Synonymizing principle", () => {
  test("a linked item and its canonical item mean the same and stay separate; unlinking makes them distinct again", async () => {
    const concept = synonymizing();
    expect(await concept.link({ item: "sousou-no-frieren", canonical: "frieren" })).toEqual({
      item: "sousou-no-frieren",
      canonical: "frieren",
    });

    const both = [{ other: "frieren" }, { other: "sousou-no-frieren" }];
    expect(await concept._same({ item: "sousou-no-frieren" })).toEqual(both);
    expect(await concept._same({ item: "frieren" })).toEqual(both);
    expect(await concept._canonical({ item: "sousou-no-frieren" })).toEqual({ canonical: "frieren" });
    expect(await concept._canonical({ item: "frieren" })).toEqual({ canonical: "frieren" });

    expect(await concept.unlink({ item: "sousou-no-frieren" })).toEqual({ item: "sousou-no-frieren" });
    expect(await concept._same({ item: "sousou-no-frieren" })).toEqual([{ other: "sousou-no-frieren" }]);
    expect(await concept._same({ item: "frieren" })).toEqual([{ other: "frieren" }]);
    expect(await concept._canonical({ item: "sousou-no-frieren" })).toEqual({ canonical: "sousou-no-frieren" });
    expect(await concept._canonical({ item: "frieren" })).toEqual({ canonical: "frieren" });
  });
});

describe("Synonymizing refusals", () => {
  test("linking an item to itself is refused, and nothing is saved", async () => {
    const concept = synonymizing();
    const error = await refusal(() => concept.link({ item: "frieren", canonical: "frieren" }));
    expect(error).toBeInstanceOf(SynonymOfItself);
    expect(error.message).toBe("An item cannot be its own canonical item.");

    expect(await same(concept, "frieren")).toEqual(["frieren"]);
    // Had a link been saved, this would return instead of refusing.
    expect(await refusal(() => concept.unlink({ item: "frieren" }))).toBeInstanceOf(SynonymNotLinked);
  });

  test("an item that already has a canonical item cannot be linked again, to the same item or to another", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });

    for (const canonical of ["frieren", "frieren-anime"]) {
      const error = await refusal(() => concept.link({ item: "sousou-no-frieren", canonical }));
      expect(error).toBeInstanceOf(SynonymAlreadyLinked);
      expect(error.message).toBe("The item already has a canonical item.");
    }

    expect(await canonicalOf(concept, "sousou-no-frieren")).toBe("frieren");
    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
    expect(await same(concept, "frieren-anime")).toEqual(["frieren-anime"]);
  });

  test("an item that has a canonical item cannot be the canonical item of another", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });

    const error = await refusal(() => concept.link({ item: "frieren-jp", canonical: "sousou-no-frieren" }));
    expect(error).toBeInstanceOf(SynonymCanonicalLinked);
    expect(error.message).toBe("The canonical item has a canonical item of its own.");

    expect(await same(concept, "frieren-jp")).toEqual(["frieren-jp"]);
    expect(await canonicalOf(concept, "frieren-jp")).toBe("frieren-jp");
    expect(await same(concept, "sousou-no-frieren")).toEqual(["frieren", "sousou-no-frieren"]);
  });

  test("an item that is a canonical item cannot itself be linked", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });

    const error = await refusal(() => concept.link({ item: "frieren", canonical: "frieren-anime" }));
    expect(error).toBeInstanceOf(SynonymIsCanonical);
    expect(error.message).toBe("The item is the canonical item of another item.");

    expect(await canonicalOf(concept, "frieren")).toBe("frieren");
    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
    expect(await same(concept, "frieren-anime")).toEqual(["frieren-anime"]);
  });

  test("when several refusals apply, they are checked in the order the specification lists them", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });
    await concept.link({ item: "fern-the-mage", canonical: "fern" });

    // The same item comes first, whether it is a synonym or a canonical item.
    expect(await refusal(() => concept.link({ item: "sousou-no-frieren", canonical: "sousou-no-frieren" }))).toBeInstanceOf(SynonymOfItself);
    expect(await refusal(() => concept.link({ item: "frieren", canonical: "frieren" }))).toBeInstanceOf(SynonymOfItself);
    // The item is already linked, and the canonical item given is a synonym too.
    expect(await refusal(() => concept.link({ item: "sousou-no-frieren", canonical: "fern-the-mage" }))).toBeInstanceOf(SynonymAlreadyLinked);
    // The item is a canonical item, and the canonical item given is a synonym: the other group's, or its own.
    expect(await refusal(() => concept.link({ item: "frieren", canonical: "fern-the-mage" }))).toBeInstanceOf(SynonymCanonicalLinked);
    expect(await refusal(() => concept.link({ item: "frieren", canonical: "sousou-no-frieren" }))).toBeInstanceOf(SynonymCanonicalLinked);

    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
    expect(await same(concept, "fern")).toEqual(["fern", "fern-the-mage"]);
  });

  test("unlinking an item with no canonical item is refused: a canonical item, an item never linked, and a second unlink", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });

    for (const item of ["frieren", "nobody"]) {
      const error = await refusal(() => concept.unlink({ item }));
      expect(error).toBeInstanceOf(SynonymNotLinked);
      expect(error.message).toBe("The item has no canonical item.");
    }
    // Refusing to unlink the canonical item leaves its synonym linked.
    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);

    await concept.unlink({ item: "sousou-no-frieren" });
    expect(await refusal(() => concept.unlink({ item: "sousou-no-frieren" }))).toBeInstanceOf(SynonymNotLinked);
  });

  test("two links for the same item at once: one is saved and the other is refused", async () => {
    const concept = synonymizing();
    const [first, second] = await Promise.allSettled([
      concept.link({ item: "sousou-no-frieren", canonical: "frieren" }),
      concept.link({ item: "sousou-no-frieren", canonical: "frieren-anime" }),
    ]);

    const saved = [first, second].filter((result) => result.status === "fulfilled");
    const refused = [first, second].filter((result) => result.status === "rejected");
    expect(saved).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.reason).toBeInstanceOf(SynonymAlreadyLinked);
    expect(refused[0]!.reason.message).toBe("The item already has a canonical item.");

    const kept = saved[0]!.value.canonical;
    const dropped = kept === "frieren" ? "frieren-anime" : "frieren";
    expect(await canonicalOf(concept, "sousou-no-frieren")).toBe(kept);
    expect(await same(concept, kept)).toEqual([kept, "sousou-no-frieren"]);
    expect(await same(concept, dropped)).toEqual([dropped]);
  });
});

describe("Synonymizing groups", () => {
  test("a third synonym joins the group, and every member answers the whole group in identity order", async () => {
    const concept = synonymizing();
    // Linked out of identity order, so the order answered is not the order saved.
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren-main" });
    await concept.link({ item: "frieren-jp", canonical: "frieren-main" });
    await concept.link({ item: "beyond-journeys-end", canonical: "frieren-main" });

    const group = ["beyond-journeys-end", "frieren-jp", "frieren-main", "sousou-no-frieren"];
    for (const member of group) {
      expect(await same(concept, member)).toEqual(group);
      expect(await canonicalOf(concept, member)).toBe("frieren-main");
    }
  });

  test("unlinking one synonym takes only that item out of the group", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });
    await concept.link({ item: "frieren-jp", canonical: "frieren" });

    await concept.unlink({ item: "frieren-jp" });
    expect(await same(concept, "frieren-jp")).toEqual(["frieren-jp"]);
    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
    expect(await same(concept, "sousou-no-frieren")).toEqual(["frieren", "sousou-no-frieren"]);
  });

  test("separate groups stay separate, and an item in no link answers only itself", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });
    await concept.link({ item: "fern-the-mage", canonical: "fern" });

    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
    expect(await same(concept, "fern-the-mage")).toEqual(["fern", "fern-the-mage"]);
    expect(await concept._same({ item: "stark" })).toEqual([{ other: "stark" }]);
    expect(await concept._canonical({ item: "stark" })).toEqual({ canonical: "stark" });
  });

  test("a wrong link is undone by one unlink, and the two can then be linked the other way round", async () => {
    const concept = synonymizing();
    await concept.link({ item: "frieren", canonical: "sousou-no-frieren" });
    await concept.unlink({ item: "frieren" });

    // The former canonical item has no synonyms left, so it can now be linked itself.
    expect(await concept.link({ item: "sousou-no-frieren", canonical: "frieren" })).toEqual({
      item: "sousou-no-frieren",
      canonical: "frieren",
    });
    expect(await canonicalOf(concept, "sousou-no-frieren")).toBe("frieren");
    expect(await canonicalOf(concept, "frieren")).toBe("frieren");
    expect(await same(concept, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
  });

  test("a canonical item can be linked only once every synonym has been unlinked from it", async () => {
    const concept = synonymizing();
    await concept.link({ item: "sousou-no-frieren", canonical: "frieren" });
    await concept.link({ item: "frieren-jp", canonical: "frieren" });

    await concept.unlink({ item: "sousou-no-frieren" });
    expect(await refusal(() => concept.link({ item: "frieren", canonical: "frieren-anime" }))).toBeInstanceOf(SynonymIsCanonical);

    await concept.unlink({ item: "frieren-jp" });
    await concept.link({ item: "frieren", canonical: "frieren-anime" });
    expect(await same(concept, "frieren-anime")).toEqual(["frieren", "frieren-anime"]);
  });
});

describe("Synonymizing storage", () => {
  test("links survive a new instance on the same database", async () => {
    await synonymizing().link({ item: "sousou-no-frieren", canonical: "frieren" });
    // A second instance stands in for the server after a restart.
    const restarted = synonymizing();
    expect(await same(restarted, "frieren")).toEqual(["frieren", "sousou-no-frieren"]);
    expect(await canonicalOf(restarted, "sousou-no-frieren")).toBe("frieren");
    expect(await refusal(() => restarted.link({ item: "sousou-no-frieren", canonical: "frieren" }))).toBeInstanceOf(SynonymAlreadyLinked);
    expect(await refusal(() => restarted.link({ item: "frieren", canonical: "frieren-anime" }))).toBeInstanceOf(SynonymIsCanonical);
    expect(await restarted.unlink({ item: "sousou-no-frieren" })).toEqual({ item: "sousou-no-frieren" });
  });

  test("two instances of the concept keep separate links", async () => {
    const tags = new SynonymizingConcept<string>(database(), "TagSynonymizing");
    const titles = new SynonymizingConcept<string>(database(), "TitleSynonymizing");
    await tags.link({ item: "sousou-no-frieren", canonical: "frieren" });

    expect(await same(titles, "sousou-no-frieren")).toEqual(["sousou-no-frieren"]);
    expect(await refusal(() => titles.unlink({ item: "sousou-no-frieren" }))).toBeInstanceOf(SynonymNotLinked);
    // The same item can be linked differently in the other instance.
    await titles.link({ item: "frieren", canonical: "sousou-no-frieren" });
    expect(await canonicalOf(tags, "frieren")).toBe("frieren");
    expect(await canonicalOf(titles, "frieren")).toBe("sousou-no-frieren");
  });
});
