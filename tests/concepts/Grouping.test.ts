import { describe, expect, test } from "bun:test";
import {
  GroupAlreadyPlaced,
  GroupCycle,
  GroupNotPlaced,
  GroupSameItem,
  GroupingConcept,
} from "../../src/concepts/Grouping/Grouping.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

function grouping() {
  return new GroupingConcept<string>(database());
}

/** Places each item under its parent, in the order given. */
async function placeAll(concept: GroupingConcept<string>, ...pairs: Array<[item: string, parent: string]>) {
  for (const [item, parent] of pairs) await concept.place({ item, parent });
}

const CYCLE = "The item cannot be placed under a parent that already lies under it.";

describe("Grouping principle", () => {
  test("an item under a broader item, itself under a still broader one, lies under both and belongs to both", async () => {
    const concept = grouping();
    expect(await concept.place({ item: "Fern/Stark", parent: "Fern" })).toEqual({ item: "Fern/Stark", parent: "Fern" });
    expect(await concept.place({ item: "Fern", parent: "Frieren" })).toEqual({ item: "Fern", parent: "Frieren" });

    expect(await concept._under({ item: "Frieren" })).toEqual([
      { member: "Fern", direct: true },
      { member: "Fern/Stark", direct: false },
    ]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([
      { broader: "Fern", direct: true },
      { broader: "Frieren", direct: false },
    ]);
    // The one in the middle has one item each way.
    expect(await concept._under({ item: "Fern" })).toEqual([{ member: "Fern/Stark", direct: true }]);
    expect(await concept._above({ item: "Fern" })).toEqual([{ broader: "Frieren", direct: true }]);
    expect(await concept._top({})).toEqual([{ item: "Frieren" }]);
  });

  test("placing the broadest under the most specific is refused, and removing one placement leaves the other", async () => {
    const concept = grouping();
    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern", "Frieren"]);

    const cycle = await refusal(() => concept.place({ item: "Frieren", parent: "Fern/Stark" }));
    expect(cycle).toBeInstanceOf(GroupCycle);
    expect(cycle.message).toBe(CYCLE);

    expect(await concept.remove({ item: "Fern", parent: "Frieren" })).toEqual({ item: "Fern", parent: "Frieren" });
    expect(await concept._under({ item: "Frieren" })).toEqual([]);
    expect(await concept._under({ item: "Fern" })).toEqual([{ member: "Fern/Stark", direct: true }]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([{ broader: "Fern", direct: true }]);
  });
});

describe("Grouping refusals", () => {
  test("placing an item under itself is refused, and nothing is saved", async () => {
    const concept = grouping();
    const error = await refusal(() => concept.place({ item: "Fern", parent: "Fern" }));
    expect(error).toBeInstanceOf(GroupSameItem);
    expect(error.message).toBe("An item cannot be placed under itself.");

    expect(await concept._under({ item: "Fern" })).toEqual([]);
    expect(await concept._above({ item: "Fern" })).toEqual([]);
    expect(await concept._top({})).toEqual([]);
  });

  test("placing an item under a parent it already has is refused, and the placement is kept once", async () => {
    const concept = grouping();
    await concept.place({ item: "Fern", parent: "Frieren" });

    const error = await refusal(() => concept.place({ item: "Fern", parent: "Frieren" }));
    expect(error).toBeInstanceOf(GroupAlreadyPlaced);
    expect(error.message).toBe("The item is already placed under this parent.");
    expect(await concept._above({ item: "Fern" })).toEqual([{ broader: "Frieren", direct: true }]);
    expect(await concept._under({ item: "Frieren" })).toEqual([{ member: "Fern", direct: true }]);

    // One removal undoes it, so the refused repeat saved no second copy.
    await concept.remove({ item: "Fern", parent: "Frieren" });
    expect(await concept._above({ item: "Fern" })).toEqual([]);
    expect(await refusal(() => concept.remove({ item: "Fern", parent: "Frieren" }))).toBeInstanceOf(GroupNotPlaced);
  });

  test("placing a parent under its own child is refused, and nothing is saved", async () => {
    const concept = grouping();
    await concept.place({ item: "Fern", parent: "Frieren" });

    const error = await refusal(() => concept.place({ item: "Frieren", parent: "Fern" }));
    expect(error).toBeInstanceOf(GroupCycle);
    expect(error.message).toBe(CYCLE);

    expect(await concept._above({ item: "Frieren" })).toEqual([]);
    expect(await concept._under({ item: "Fern" })).toEqual([]);
    expect(await concept._under({ item: "Frieren" })).toEqual([{ member: "Fern", direct: true }]);
    expect(await concept._top({})).toEqual([{ item: "Frieren" }]);
  });

  test("placing an item under something far below it is refused, by whichever path reaches it", async () => {
    const concept = grouping();
    // "Fern/Stark" has two parents, and only the one through "Stark" leads up to "Frieren" and "Anime".
    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern/Stark", "Stark"], ["Stark", "Frieren"], ["Frieren", "Anime"]);

    for (const item of ["Anime", "Frieren", "Stark"]) {
      const error = await refusal(() => concept.place({ item, parent: "Fern/Stark" }));
      expect(error).toBeInstanceOf(GroupCycle);
      expect(error.message).toBe(CYCLE);
    }
    expect(await concept._above({ item: "Anime" })).toEqual([]);
    expect(await concept._under({ item: "Fern/Stark" })).toEqual([]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([
      { broader: "Anime", direct: false },
      { broader: "Fern", direct: true },
      { broader: "Frieren", direct: false },
      { broader: "Stark", direct: true },
    ]);

    // Two items with the same thing above them are beside each other, so one may still go under the other.
    await concept.place({ item: "Fern", parent: "Frieren" });
    expect(await concept.place({ item: "Fern", parent: "Stark" })).toEqual({ item: "Fern", parent: "Stark" });
    expect(await concept._above({ item: "Fern" })).toEqual([
      { broader: "Anime", direct: false },
      { broader: "Frieren", direct: true },
      { broader: "Stark", direct: true },
    ]);
  });

  test("removing a placement that was never made is refused, including a second removal, and nothing changes", async () => {
    const concept = grouping();
    const error = await refusal(() => concept.remove({ item: "Fern", parent: "Frieren" }));
    expect(error).toBeInstanceOf(GroupNotPlaced);
    expect(error.message).toBe("The item is not placed under this parent.");

    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern", "Frieren"]);
    // "Frieren" is above "Fern/Stark" but is not its parent, and a placement does not run the other way.
    for (const run of [
      () => concept.remove({ item: "Fern/Stark", parent: "Frieren" }),
      () => concept.remove({ item: "Frieren", parent: "Fern" }),
    ]) {
      const refused = await refusal(run);
      expect(refused).toBeInstanceOf(GroupNotPlaced);
      expect(refused.message).toBe("The item is not placed under this parent.");
    }
    expect(await concept._under({ item: "Frieren" })).toEqual([
      { member: "Fern", direct: true },
      { member: "Fern/Stark", direct: false },
    ]);

    await concept.remove({ item: "Fern", parent: "Frieren" });
    expect(await refusal(() => concept.remove({ item: "Fern", parent: "Frieren" }))).toBeInstanceOf(GroupNotPlaced);
  });
});

describe("Grouping queries", () => {
  test("an item may have two parents, and it lies under each of them", async () => {
    const concept = grouping();
    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern/Stark", "Stark"]);

    expect(await concept._above({ item: "Fern/Stark" })).toEqual([
      { broader: "Fern", direct: true },
      { broader: "Stark", direct: true },
    ]);
    expect(await concept._under({ item: "Fern" })).toEqual([{ member: "Fern/Stark", direct: true }]);
    expect(await concept._under({ item: "Stark" })).toEqual([{ member: "Fern/Stark", direct: true }]);
    expect(await concept._top({})).toEqual([{ item: "Fern" }, { item: "Stark" }]);

    // Removing it from one parent leaves it under the other.
    await concept.remove({ item: "Fern/Stark", parent: "Fern" });
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([{ broader: "Stark", direct: true }]);
    expect(await concept._under({ item: "Fern" })).toEqual([]);
    expect(await concept._top({})).toEqual([{ item: "Stark" }]);
  });

  test("an item reached by two paths appears once", async () => {
    const concept = grouping();
    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern/Stark", "Stark"], ["Fern", "Frieren"], ["Stark", "Frieren"]);

    expect(await concept._under({ item: "Frieren" })).toEqual([
      { member: "Fern", direct: true },
      { member: "Fern/Stark", direct: false },
      { member: "Stark", direct: true },
    ]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([
      { broader: "Fern", direct: true },
      { broader: "Frieren", direct: false },
      { broader: "Stark", direct: true },
    ]);

    // Removing one of the two paths still leaves it under "Frieren" by the other.
    await concept.remove({ item: "Fern", parent: "Frieren" });
    expect(await concept._under({ item: "Frieren" })).toEqual([
      { member: "Fern/Stark", direct: false },
      { member: "Stark", direct: true },
    ]);
    expect(await concept._top({})).toEqual([{ item: "Fern" }, { item: "Frieren" }]);
  });

  test("an item placed both directly and further down is marked direct, once, until the direct placement is removed", async () => {
    const concept = grouping();
    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern", "Frieren"]);
    // Already under "Frieren" through "Fern", but "Frieren" is not yet its parent, so this is not a repeat.
    expect(await concept.place({ item: "Fern/Stark", parent: "Frieren" })).toEqual({ item: "Fern/Stark", parent: "Frieren" });

    expect(await concept._under({ item: "Frieren" })).toEqual([
      { member: "Fern", direct: true },
      { member: "Fern/Stark", direct: true },
    ]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([
      { broader: "Fern", direct: true },
      { broader: "Frieren", direct: true },
    ]);

    await concept.remove({ item: "Fern/Stark", parent: "Frieren" });
    expect(await concept._under({ item: "Frieren" })).toEqual([
      { member: "Fern", direct: true },
      { member: "Fern/Stark", direct: false },
    ]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([
      { broader: "Fern", direct: true },
      { broader: "Frieren", direct: false },
    ]);
  });

  test("removing a placement cuts off everything that was reached through it, and the opposite placement is then allowed", async () => {
    const concept = grouping();
    await placeAll(concept, ["Fern/Stark", "Fern"], ["Fern", "Frieren"], ["Frieren", "Anime"]);
    expect((await concept._under({ item: "Anime" })).map(({ member }) => member)).toEqual(["Fern", "Fern/Stark", "Frieren"]);

    await concept.remove({ item: "Fern", parent: "Frieren" });
    expect(await concept._under({ item: "Anime" })).toEqual([{ member: "Frieren", direct: true }]);
    expect(await concept._under({ item: "Frieren" })).toEqual([]);
    expect(await concept._above({ item: "Fern/Stark" })).toEqual([{ broader: "Fern", direct: true }]);

    // "Fern" no longer lies under "Frieren", so "Frieren" may now go under "Fern".
    expect(await concept.place({ item: "Frieren", parent: "Fern" })).toEqual({ item: "Frieren", parent: "Fern" });
    expect(await concept._under({ item: "Fern" })).toEqual([
      { member: "Fern/Stark", direct: true },
      { member: "Frieren", direct: true },
    ]);
  });

  test("the top items are those with something under them and no parent, and they change as placements change", async () => {
    const concept = grouping();
    expect(await concept._top({})).toEqual([]);

    // "Fern" has a parent and nothing under it, so only "Frieren" is at the top.
    await concept.place({ item: "Fern", parent: "Frieren" });
    expect(await concept._top({})).toEqual([{ item: "Frieren" }]);

    await concept.place({ item: "Frieren", parent: "Anime" });
    expect(await concept._top({})).toEqual([{ item: "Anime" }]);

    await concept.place({ item: "Gojo", parent: "Jujutsu Kaisen" });
    expect(await concept._top({})).toEqual([{ item: "Anime" }, { item: "Jujutsu Kaisen" }]);

    // With nothing under it any more, "Anime" drops out and "Frieren" is at the top again.
    await concept.remove({ item: "Frieren", parent: "Anime" });
    expect(await concept._top({})).toEqual([{ item: "Frieren" }, { item: "Jujutsu Kaisen" }]);

    await concept.remove({ item: "Fern", parent: "Frieren" });
    await concept.remove({ item: "Gojo", parent: "Jujutsu Kaisen" });
    expect(await concept._top({})).toEqual([]);
  });

  test("rows are ordered by identity whatever the order of placing, and an unknown item answers with no rows", async () => {
    const concept = grouping();
    // Identities compare as plain text: digits, then capitals, then small letters, and "10" before "9".
    await placeAll(concept, ["a", "root"], ["10", "root"], ["b", "root"], ["9", "root"], ["C", "root"]);
    expect((await concept._under({ item: "root" })).map(({ member }) => member)).toEqual(["10", "9", "C", "a", "b"]);

    await placeAll(concept, ["leaf", "b"], ["leaf", "C"], ["leaf", "a"]);
    expect((await concept._above({ item: "leaf" })).map(({ broader }) => broader)).toEqual(["C", "a", "b", "root"]);

    await placeAll(concept, ["x", "b-top"], ["x", "C-top"], ["x", "a-top"]);
    expect(await concept._top({})).toEqual([{ item: "C-top" }, { item: "a-top" }, { item: "b-top" }, { item: "root" }]);

    expect(await concept._under({ item: "nobody" })).toEqual([]);
    expect(await concept._above({ item: "nobody" })).toEqual([]);
  });
});

describe("Grouping storage", () => {
  test("placements survive a new instance on the same database", async () => {
    await grouping().place({ item: "Fern/Stark", parent: "Fern" });
    await grouping().place({ item: "Fern", parent: "Frieren" });
    // A third instance stands in for the server after a restart.
    const restarted = grouping();
    expect(await restarted._under({ item: "Frieren" })).toEqual([
      { member: "Fern", direct: true },
      { member: "Fern/Stark", direct: false },
    ]);
    expect(await restarted._top({})).toEqual([{ item: "Frieren" }]);
    expect(await refusal(() => restarted.place({ item: "Fern", parent: "Frieren" }))).toBeInstanceOf(GroupAlreadyPlaced);
    expect(await refusal(() => restarted.place({ item: "Frieren", parent: "Fern/Stark" }))).toBeInstanceOf(GroupCycle);
    expect(await restarted.remove({ item: "Fern", parent: "Frieren" })).toEqual({ item: "Fern", parent: "Frieren" });
  });

  test("two instances of the concept keep separate placements", async () => {
    const tags = new GroupingConcept<string>(database(), "TagGrouping");
    const templates = new GroupingConcept<string>(database(), "TemplateGrouping");
    await tags.place({ item: "Fern", parent: "Frieren" });

    expect(await templates._top({})).toEqual([]);
    expect(await templates._under({ item: "Frieren" })).toEqual([]);
    // The other instance holds nothing, so there the opposite placement makes no cycle.
    expect(await templates.place({ item: "Frieren", parent: "Fern" })).toEqual({ item: "Frieren", parent: "Fern" });
    expect(await tags._under({ item: "Frieren" })).toEqual([{ member: "Fern", direct: true }]);
    expect(await tags._above({ item: "Frieren" })).toEqual([]);
  });

  // The two tests below repeat their race, because the first round only opens the second database connection
  // and so does not overlap.
  test("the same placement made twice at once is saved once", async () => {
    const concept = grouping();
    for (let round = 0; round < 10; round += 1) {
      const item = `member-${round}`;
      const results = await Promise.allSettled([
        concept.place({ item, parent: "Frieren" }),
        concept.place({ item, parent: "Frieren" }),
      ]);
      const refused = results.filter((result) => result.status === "rejected");
      expect(refused).toHaveLength(1);
      expect(refused[0]!.reason).toBeInstanceOf(GroupAlreadyPlaced);

      // One removal undoes it, so no second copy was saved.
      expect(await concept._above({ item })).toEqual([{ broader: "Frieren", direct: true }]);
      await concept.remove({ item, parent: "Frieren" });
      expect(await concept._above({ item })).toEqual([]);
    }
  });

  test("two opposite placements made at once are never both kept", async () => {
    const concept = grouping();
    for (let round = 0; round < 10; round += 1) {
      const [left, right] = [`left-${round}`, `right-${round}`];
      const results = await Promise.allSettled([
        concept.place({ item: left, parent: right }),
        concept.place({ item: right, parent: left }),
      ]);
      const kept = results.filter((result) => result.status === "fulfilled");
      expect(kept.length).toBeLessThanOrEqual(1);
      for (const result of results) {
        if (result.status === "rejected") expect(result.reason).toBeInstanceOf(GroupCycle);
      }
      // What is stored matches what was returned: one placement or none, never both.
      const stored = [...(await concept._above({ item: left })), ...(await concept._above({ item: right }))];
      expect(stored).toHaveLength(kept.length);
    }
  });
});
