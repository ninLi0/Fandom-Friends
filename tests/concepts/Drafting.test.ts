import { describe, expect, test } from "bun:test";
import {
  DraftNameTaken,
  DraftNotFound,
  DraftingConcept,
  InvalidDraftName,
  type Draft,
} from "../../src/concepts/Drafting/Drafting.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

/** Draft identities come out in the order given, so a test can name them. */
function drafting(...identities: string[]) {
  const fresh = identities.length === 0 ? undefined : () => {
    const next = identities.shift();
    if (next === undefined) throw new Error("No identity remains.");
    return next;
  };
  return new DraftingConcept<string>(database(), "Drafting", fresh);
}

const unknown = "missing" as Draft;

const INVALID_NAME = "A draft name must not be blank and must be at most 80 characters.";
const NAME_TAKEN = "The owner already has a draft with this name.";
const NOT_FOUND = "There is no such draft.";

describe("Drafting principle", () => {
  test("two drafts stay saved under their own names; renaming or discarding one leaves the other", async () => {
    const concept = drafting("frieren", "meshi");
    const { draft: frieren } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });
    const { draft: meshi } = await concept.start({ owner: "alice", name: "Dungeon Meshi discussions" });
    expect(frieren).toBe("frieren" as Draft);
    expect(meshi).toBe("meshi" as Draft);

    expect(await concept._draftsOf({ owner: "alice" })).toEqual([
      { draft: meshi, name: "Dungeon Meshi discussions" },
      { draft: frieren, name: "Frieren and sketch swaps" },
    ]);
    expect(await concept._get({ draft: frieren })).toEqual([{ owner: "alice", name: "Frieren and sketch swaps" }]);
    expect(await concept._owner({ draft: meshi })).toEqual([{ owner: "alice" }]);

    expect(await concept.rename({ draft: frieren, name: "Frieren rewatch" })).toEqual({ draft: frieren });
    expect(await concept._get({ draft: frieren })).toEqual([{ owner: "alice", name: "Frieren rewatch" }]);
    expect(await concept._get({ draft: meshi })).toEqual([{ owner: "alice", name: "Dungeon Meshi discussions" }]);

    expect(await concept.discard({ draft: frieren })).toEqual({ draft: frieren });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft: meshi, name: "Dungeon Meshi discussions" }]);
    expect(await concept._get({ draft: meshi })).toEqual([{ owner: "alice", name: "Dungeon Meshi discussions" }]);
  });
});

describe("Drafting refusals", () => {
  test("a blank or too-long name is refused by start and rename, and nothing is saved", async () => {
    const concept = drafting();
    for (const name of ["", "   ", "\t\n", "x".repeat(81)]) {
      const error = await refusal(() => concept.start({ owner: "alice", name }));
      expect(error).toBeInstanceOf(InvalidDraftName);
      expect(error.message).toBe(INVALID_NAME);
    }
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([]);

    // 80 characters is the longest accepted name.
    const { draft } = await concept.start({ owner: "alice", name: "x".repeat(80) });
    for (const name of ["", " ", "x".repeat(81)]) {
      const error = await refusal(() => concept.rename({ draft, name }));
      expect(error).toBeInstanceOf(InvalidDraftName);
      expect(error.message).toBe(INVALID_NAME);
    }
    expect(await concept._get({ draft })).toEqual([{ owner: "alice", name: "x".repeat(80) }]);
  });

  test("starting a draft with a name the owner already has is refused, and nothing is saved", async () => {
    const concept = drafting();
    const { draft } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });

    const error = await refusal(() => concept.start({ owner: "alice", name: "Frieren and sketch swaps" }));
    expect(error).toBeInstanceOf(DraftNameTaken);
    expect(error.message).toBe(NAME_TAKEN);
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft, name: "Frieren and sketch swaps" }]);
  });

  test("renaming a draft to another of the owner's names is refused, and both keep their names", async () => {
    const concept = drafting();
    const { draft: frieren } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });
    const { draft: meshi } = await concept.start({ owner: "alice", name: "Dungeon Meshi discussions" });

    const error = await refusal(() => concept.rename({ draft: meshi, name: "Frieren and sketch swaps" }));
    expect(error).toBeInstanceOf(DraftNameTaken);
    expect(error.message).toBe(NAME_TAKEN);
    expect(await concept._get({ draft: frieren })).toEqual([{ owner: "alice", name: "Frieren and sketch swaps" }]);
    expect(await concept._get({ draft: meshi })).toEqual([{ owner: "alice", name: "Dungeon Meshi discussions" }]);
  });

  test("an unknown draft is refused by rename and discard; an unknown draft is checked before the name", async () => {
    const concept = drafting();
    const { draft } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });
    for (const run of [
      () => concept.rename({ draft: unknown, name: "Dungeon Meshi discussions" }),
      () => concept.rename({ draft: unknown, name: "" }),
      // A name the only owner already has: the unknown draft is still what is reported.
      () => concept.rename({ draft: unknown, name: "Frieren and sketch swaps" }),
      () => concept.discard({ draft: unknown }),
    ]) {
      const error = await refusal(run);
      expect(error).toBeInstanceOf(DraftNotFound);
      expect(error.message).toBe(NOT_FOUND);
    }
    // Renaming an unknown draft did not create one, and the existing draft is untouched.
    expect(await concept._get({ draft: unknown })).toEqual([]);
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft, name: "Frieren and sketch swaps" }]);
  });

  test("a discarded draft is unknown: renaming it or discarding it again is refused", async () => {
    const concept = drafting();
    const { draft } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });
    await concept.discard({ draft });

    for (const run of [
      () => concept.discard({ draft }),
      () => concept.rename({ draft, name: "Dungeon Meshi discussions" }),
    ]) {
      const error = await refusal(run);
      expect(error).toBeInstanceOf(DraftNotFound);
      expect(error.message).toBe(NOT_FOUND);
    }
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([]);
  });
});

describe("Drafting names", () => {
  test("two owners may use the same name, and each keeps their own draft", async () => {
    const concept = drafting("alice-frieren", "bob-frieren", "alice-meshi");
    const alice = await concept.start({ owner: "alice", name: "Frieren" });
    const bob = await concept.start({ owner: "bob", name: "Frieren" });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft: alice.draft, name: "Frieren" }]);
    expect(await concept._draftsOf({ owner: "bob" })).toEqual([{ draft: bob.draft, name: "Frieren" }]);

    // Renaming to a name only another owner has is accepted.
    await concept.rename({ draft: bob.draft, name: "Dungeon Meshi" });
    const meshi = await concept.start({ owner: "alice", name: "Dungeon Meshi" });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([
      { draft: meshi.draft, name: "Dungeon Meshi" },
      { draft: alice.draft, name: "Frieren" },
    ]);
    expect(await concept._draftsOf({ owner: "bob" })).toEqual([{ draft: bob.draft, name: "Dungeon Meshi" }]);

    // Discarding one owner's draft leaves the other owner's draft of the same name.
    await concept.discard({ draft: meshi.draft });
    expect(await concept._get({ draft: bob.draft })).toEqual([{ owner: "bob", name: "Dungeon Meshi" }]);
  });

  test("names are compared exactly as written, and saved as written", async () => {
    const concept = drafting("upper", "lower", "spaced");
    await concept.start({ owner: "alice", name: "Frieren" });
    await concept.start({ owner: "alice", name: "frieren" });
    await concept.start({ owner: "alice", name: " Frieren " });

    expect(await concept._draftsOf({ owner: "alice" })).toEqual([
      { draft: "spaced" as Draft, name: " Frieren " },
      { draft: "upper" as Draft, name: "Frieren" },
      { draft: "lower" as Draft, name: "frieren" },
    ]);
    // Renaming to a name that differs only in case from another draft's name is accepted.
    await concept.rename({ draft: "spaced" as Draft, name: "FRIEREN" });
    expect(await concept._get({ draft: "spaced" as Draft })).toEqual([{ owner: "alice", name: "FRIEREN" }]);
  });

  test("renaming a draft to its current name is accepted and changes nothing", async () => {
    const concept = drafting();
    const { draft } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });
    const { draft: other } = await concept.start({ owner: "alice", name: "Dungeon Meshi discussions" });

    expect(await concept.rename({ draft, name: "Frieren and sketch swaps" })).toEqual({ draft });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([
      { draft: other, name: "Dungeon Meshi discussions" },
      { draft, name: "Frieren and sketch swaps" },
    ]);
  });

  test("a name is free again after its draft is discarded or renamed away", async () => {
    const concept = drafting("first", "second", "third");
    const first = await concept.start({ owner: "alice", name: "Frieren" });
    await concept.discard({ draft: first.draft });
    const second = await concept.start({ owner: "alice", name: "Frieren" });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft: second.draft, name: "Frieren" }]);

    await concept.rename({ draft: second.draft, name: "Dungeon Meshi" });
    const third = await concept.start({ owner: "alice", name: "Frieren" });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([
      { draft: second.draft, name: "Dungeon Meshi" },
      { draft: third.draft, name: "Frieren" },
    ]);

    // Another draft can also take a discarded draft's name by renaming.
    await concept.discard({ draft: second.draft });
    await concept.rename({ draft: third.draft, name: "Dungeon Meshi" });
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft: third.draft, name: "Dungeon Meshi" }]);
  });
});

describe("Drafting queries", () => {
  test("an owner's drafts are ordered by name ignoring case, then by name", async () => {
    const concept = drafting();
    for (const name of ["sketch swaps", "frieren", "Dungeon Meshi", "Frieren", "apothecary diaries"]) {
      await concept.start({ owner: "alice", name });
    }
    await concept.start({ owner: "bob", name: "Blue Lock" });

    expect((await concept._draftsOf({ owner: "alice" })).map(({ name }) => name)).toEqual([
      "apothecary diaries",
      "Dungeon Meshi",
      "Frieren",
      "frieren",
      "sketch swaps",
    ]);
  });

  test("unknown and discarded drafts, and an owner with no drafts, answer with no rows", async () => {
    const concept = drafting();
    expect(await concept._draftsOf({ owner: "nobody" })).toEqual([]);
    expect(await concept._owner({ draft: unknown })).toEqual([]);
    expect(await concept._get({ draft: unknown })).toEqual([]);

    const { draft } = await concept.start({ owner: "alice", name: "Frieren and sketch swaps" });
    expect(await concept._owner({ draft })).toEqual([{ owner: "alice" }]);
    expect(await concept._get({ draft })).toEqual([{ owner: "alice", name: "Frieren and sketch swaps" }]);

    await concept.discard({ draft });
    expect(await concept._owner({ draft })).toEqual([]);
    expect(await concept._get({ draft })).toEqual([]);
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([]);
  });
});

describe("Drafting requests arriving together", () => {
  test("when several requests start the same name at once, one is accepted and the rest are refused", async () => {
    const concept = drafting();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => concept.start({ owner: "alice", name: "Frieren and sketch swaps" })),
    );

    const accepted = results.filter((result) => result.status === "fulfilled");
    const refused = results.filter((result) => result.status === "rejected");
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(7);
    for (const { reason } of refused) {
      expect(reason).toBeInstanceOf(DraftNameTaken);
      expect((reason as Error).message).toBe(NAME_TAKEN);
    }
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([
      { draft: accepted[0]!.value.draft, name: "Frieren and sketch swaps" },
    ]);
  });

  test("when two drafts are renamed to one name at once, one is accepted and the other keeps its name", async () => {
    const concept = drafting("a", "b");
    await concept.start({ owner: "alice", name: "Frieren" });
    await concept.start({ owner: "alice", name: "Dungeon Meshi" });

    const [first, second] = await Promise.allSettled([
      concept.rename({ draft: "a" as Draft, name: "Sketch swaps" }),
      concept.rename({ draft: "b" as Draft, name: "Sketch swaps" }),
    ]);
    const refused = [first, second].filter((result) => result.status === "rejected");
    expect(refused).toHaveLength(1);
    expect(refused[0]!.reason).toBeInstanceOf(DraftNameTaken);
    expect((refused[0]!.reason as Error).message).toBe(NAME_TAKEN);

    // Whichever request was accepted, the other draft still has the name it started with.
    expect(await concept._draftsOf({ owner: "alice" })).toEqual(
      first.status === "fulfilled"
        ? [{ draft: "b" as Draft, name: "Dungeon Meshi" }, { draft: "a" as Draft, name: "Sketch swaps" }]
        : [{ draft: "a" as Draft, name: "Frieren" }, { draft: "b" as Draft, name: "Sketch swaps" }],
    );
  });
});

describe("Drafting storage", () => {
  test("drafts survive a new instance on the same database, and so does the rule about names", async () => {
    const { draft } = await drafting().start({ owner: "alice", name: "Frieren and sketch swaps" });
    // A second instance stands in for the server after a restart.
    const restarted = drafting();
    expect(await restarted._draftsOf({ owner: "alice" })).toEqual([{ draft, name: "Frieren and sketch swaps" }]);
    expect(await restarted._owner({ draft })).toEqual([{ owner: "alice" }]);
    expect(await refusal(() => restarted.start({ owner: "alice", name: "Frieren and sketch swaps" }))).toBeInstanceOf(
      DraftNameTaken,
    );

    await restarted.rename({ draft, name: "Dungeon Meshi discussions" });
    expect(await drafting()._get({ draft })).toEqual([{ owner: "alice", name: "Dungeon Meshi discussions" }]);
    await drafting().discard({ draft });
    expect(await restarted._get({ draft })).toEqual([]);
  });

  test("two instances of the concept keep separate drafts", async () => {
    const bios = new DraftingConcept<string>(database(), "BioDrafting", () => "same");
    const posts = new DraftingConcept<string>(database(), "PostDrafting", () => "same");
    const { draft } = await bios.start({ owner: "alice", name: "Frieren" });
    expect(await posts._draftsOf({ owner: "alice" })).toEqual([]);
    expect(await posts._get({ draft })).toEqual([]);

    // The same owner, name, and identity in the other instance is a different draft.
    await posts.start({ owner: "alice", name: "Frieren" });
    await posts.discard({ draft });
    expect(await bios._get({ draft })).toEqual([{ owner: "alice", name: "Frieren" }]);
  });

  test("a repeated draft identity is not reported as a taken name, and the first draft is kept", async () => {
    const concept = new DraftingConcept<string>(database(), "Drafting", () => "same");
    const { draft } = await concept.start({ owner: "alice", name: "Frieren" });

    const error = await refusal(() => concept.start({ owner: "alice", name: "Dungeon Meshi" }));
    expect(error).not.toBeInstanceOf(DraftNameTaken);
    expect(await concept._draftsOf({ owner: "alice" })).toEqual([{ draft, name: "Frieren" }]);
  });
});
