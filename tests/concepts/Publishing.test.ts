import { describe, expect, test } from "bun:test";
import {
  AlreadyListed,
  AlreadyPublished,
  HandleAlreadyClaimed,
  HandleRequired,
  HandleTaken,
  InvalidHandle,
  NoHandle,
  NotListed,
  NothingPublished,
  PublishingConcept,
  StillPublished,
} from "../../src/concepts/Publishing/Publishing.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

const NOON = Date.parse("2026-11-02T12:00:00.000Z");

/** A concept whose clock the test moves by hand: `at(5)` makes it five minutes past noon and returns that time. */
function publishing(name = "Publishing") {
  let now = NOON;
  const concept = new PublishingConcept<string, string>(database(), name, () => new Date(now));
  const at = (minutes: number) => {
    now = NOON + minutes * 60_000;
    return new Date(now);
  };
  return { concept, at };
}

type Concept = PublishingConcept<string, string>;

/** What someone given a handle reaches: the one item its owner has published, or nothing. */
async function reach(concept: Concept, handle: string) {
  const [owner] = await concept._byHandle({ handle });
  return owner === undefined ? [] : concept._published({ publisher: owner.user });
}

/** Runs an action that must refuse, and checks the refusal's class and its exact sentence. */
async function refused(run: () => Promise<unknown>, type: new (message?: string) => Error, message: string) {
  const error = await refusal(run);
  expect(error).toBeInstanceOf(type);
  expect(error.message).toBe(message);
}

/** Waits for actions started at the same moment, and separates the ones that returned from the ones that refused. */
async function together<Result>(...started: Array<Promise<Result>>) {
  const settled = await Promise.allSettled(started);
  return {
    returned: settled.flatMap((one) => (one.status === "fulfilled" ? [one.value] : [])),
    refusals: settled.flatMap((one) => (one.status === "rejected" ? [one.reason as Error] : [])),
  };
}

describe("Publishing principle", () => {
  test("a handle reaches the one published item; publishing another replaces it; listing, unlisting, and unpublishing change how far it travels", async () => {
    const { concept, at } = publishing();

    expect(await concept.claim({ user: "alice", handle: "alice-draws" })).toEqual({ user: "alice", handle: "alice-draws" });
    expect(await concept._handle({ user: "alice" })).toEqual([{ handle: "alice-draws" }]);
    expect(await reach(concept, "alice-draws")).toEqual([]);

    // One item is public. The handle reaches it, and none of her other items.
    expect(await concept.publish({ publisher: "alice", item: "alice-bio-1" })).toEqual({ publisher: "alice", item: "alice-bio-1" });
    expect(await reach(concept, "alice-draws")).toEqual([{ item: "alice-bio-1", listed: false }]);
    expect(await concept._publisherOf({ item: "alice-bio-1" })).toEqual([{ publisher: "alice" }]);
    expect(await concept._publisherOf({ item: "alice-bio-2" })).toEqual([]);

    // Publishing another item makes it public, and the first stops being public.
    await concept.publish({ publisher: "alice", item: "alice-bio-2" });
    expect(await reach(concept, "alice-draws")).toEqual([{ item: "alice-bio-2", listed: false }]);
    expect(await concept._publisherOf({ item: "alice-bio-1" })).toEqual([]);

    // Published is not listed: people browsing do not find it yet.
    expect(await concept._listed({})).toEqual([]);

    // Bob lists at noon and Alice five minutes later, so Alice comes first.
    await concept.claim({ user: "bob", handle: "bob-reads" });
    await concept.publish({ publisher: "bob", item: "bob-bio" });
    const bobListed = at(0);
    expect(await concept.list({ publisher: "bob" })).toEqual({ publisher: "bob" });
    const aliceListed = at(5);
    expect(await concept.list({ publisher: "alice" })).toEqual({ publisher: "alice" });
    expect(await concept._listed({})).toEqual([
      { publisher: "alice", item: "alice-bio-2", listedOn: aliceListed },
      { publisher: "bob", item: "bob-bio", listedOn: bobListed },
    ]);
    expect(await reach(concept, "alice-draws")).toEqual([{ item: "alice-bio-2", listed: true }]);

    // Unlisting takes it out of listings and keeps the address working.
    expect(await concept.unlist({ publisher: "alice" })).toEqual({ publisher: "alice" });
    expect(await concept._listed({})).toEqual([{ publisher: "bob", item: "bob-bio", listedOn: bobListed }]);
    expect(await reach(concept, "alice-draws")).toEqual([{ item: "alice-bio-2", listed: false }]);

    // Unpublishing leaves nothing public. The handle is still hers, and she can publish under it again.
    expect(await concept.unpublish({ publisher: "alice" })).toEqual({ publisher: "alice", item: "alice-bio-2" });
    expect(await reach(concept, "alice-draws")).toEqual([]);
    expect(await concept._publisherOf({ item: "alice-bio-2" })).toEqual([]);
    expect(await concept._byHandle({ handle: "alice-draws" })).toEqual([{ user: "alice" }]);
    await concept.publish({ publisher: "alice", item: "alice-bio-1" });
    expect(await reach(concept, "alice-draws")).toEqual([{ item: "alice-bio-1", listed: false }]);
  });
});

describe("Publishing refusals", () => {
  test("claim: a user who has a handle cannot claim another, and that is checked before the handle's form", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    for (const handle of ["alice-paints", "alice-draws", "Not A Handle"]) {
      await refused(() => concept.claim({ user: "alice", handle }), HandleAlreadyClaimed, "You already have a handle.");
    }
    expect(await concept._handle({ user: "alice" })).toEqual([{ handle: "alice-draws" }]);
    expect(await concept._byHandle({ handle: "alice-paints" })).toEqual([]);
  });

  test("claim: a handle that is too short, too long, or has other characters is refused, and nothing is saved", async () => {
    const { concept } = publishing();
    const malformed = [
      "", // empty
      "ab", // 2 characters
      "a".repeat(31), // 31 characters
      "Alice", // uppercase
      "alice w", // a space
      " alice", // a space in front
      "alice\n", // a line break at the end
      "alice_w", // an underscore
      "alice.w", // a dot
      "émile", // a letter outside a to z
    ];
    for (const handle of malformed) {
      await refused(
        () => concept.claim({ user: "alice", handle }),
        InvalidHandle,
        "A handle must be 3 to 30 lowercase letters, digits, or hyphens.",
      );
      expect(await concept._byHandle({ handle })).toEqual([]);
    }
    expect(await concept._handle({ user: "alice" })).toEqual([]);
    // Alice is still free to claim a well-formed handle.
    expect(await concept.claim({ user: "alice", handle: "alice-w" })).toEqual({ user: "alice", handle: "alice-w" });
  });

  test("claim: a handle another user has is refused, and that user keeps it", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "frieren-fan" });
    await refused(() => concept.claim({ user: "bob", handle: "frieren-fan" }), HandleTaken, "That handle is already taken.");
    expect(await concept._byHandle({ handle: "frieren-fan" })).toEqual([{ user: "alice" }]);
    expect(await concept._handle({ user: "bob" })).toEqual([]);
    // Bob got no handle from the refused claim, so he can still claim another.
    expect(await concept.claim({ user: "bob", handle: "fern-fan" })).toEqual({ user: "bob", handle: "fern-fan" });
  });

  test("publish: a publisher with no handle is refused, and that is checked before whether the item is published", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });

    for (const item of ["bob-bio", "alice-bio"]) {
      await refused(() => concept.publish({ publisher: "bob", item }), HandleRequired, "You need a handle before you can publish.");
    }
    expect(await concept._published({ publisher: "bob" })).toEqual([]);
    expect(await concept._handle({ user: "bob" })).toEqual([]);
    expect(await concept._publisherOf({ item: "bob-bio" })).toEqual([]);
    expect(await concept._publisherOf({ item: "alice-bio" })).toEqual([{ publisher: "alice" }]);
  });

  test("publish: an item someone else has published is refused, and both people keep what they had", async () => {
    const { concept, at } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    await concept.claim({ user: "bob", handle: "bob-reads" });
    await concept.publish({ publisher: "bob", item: "bob-bio" });
    const bobListed = at(1);
    await concept.list({ publisher: "bob" });
    await concept.claim({ user: "carol", handle: "carol-sews" });

    // Bob has something published, and Carol has nothing. Neither can take Alice's item.
    for (const publisher of ["bob", "carol"]) {
      await refused(() => concept.publish({ publisher, item: "alice-bio" }), AlreadyPublished, "That item is already published.");
    }
    expect(await concept._publisherOf({ item: "alice-bio" })).toEqual([{ publisher: "alice" }]);
    expect(await concept._published({ publisher: "bob" })).toEqual([{ item: "bob-bio", listed: true }]);
    expect(await concept._published({ publisher: "carol" })).toEqual([]);
    expect(await concept._listed({})).toEqual([{ publisher: "bob", item: "bob-bio", listedOn: bobListed }]);
  });

  test("publish: the item the publisher already has published is refused, and its listing is untouched", async () => {
    const { concept, at } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    await refused(() => concept.publish({ publisher: "alice", item: "alice-bio" }), AlreadyPublished, "That item is already published.");
    expect(await concept._published({ publisher: "alice" })).toEqual([{ item: "alice-bio", listed: false }]);

    const listedOn = at(2);
    await concept.list({ publisher: "alice" });
    at(9);
    await refused(() => concept.publish({ publisher: "alice", item: "alice-bio" }), AlreadyPublished, "That item is already published.");
    expect(await concept._listed({})).toEqual([{ publisher: "alice", item: "alice-bio", listedOn }]);
  });

  test("list: refused when nothing is published, and refused when the publication is already listed", async () => {
    const { concept, at } = publishing();
    // Bob has no handle at all, and Alice has a handle with nothing published.
    await concept.claim({ user: "alice", handle: "alice-draws" });
    for (const publisher of ["bob", "alice"]) {
      await refused(() => concept.list({ publisher }), NothingPublished, "You have not published anything.");
    }
    expect(await concept._listed({})).toEqual([]);

    await concept.publish({ publisher: "alice", item: "alice-bio" });
    const listedOn = at(1);
    await concept.list({ publisher: "alice" });
    at(8);
    await refused(() => concept.list({ publisher: "alice" }), AlreadyListed, "Your published item is already listed.");
    // The refused listing did not move the time.
    expect(await concept._listed({})).toEqual([{ publisher: "alice", item: "alice-bio", listedOn }]);

    await concept.unpublish({ publisher: "alice" });
    await refused(() => concept.list({ publisher: "alice" }), NothingPublished, "You have not published anything.");
    expect(await concept._listed({})).toEqual([]);
  });

  test("unlist: refused with no publication, with a publication that is not listed, and a second time", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    // Bob has no handle at all, and Alice has a handle with nothing published.
    for (const publisher of ["bob", "alice"]) {
      await refused(() => concept.unlist({ publisher }), NotListed, "You have nothing listed.");
    }

    await concept.publish({ publisher: "alice", item: "alice-bio" });
    await refused(() => concept.unlist({ publisher: "alice" }), NotListed, "You have nothing listed.");
    expect(await concept._published({ publisher: "alice" })).toEqual([{ item: "alice-bio", listed: false }]);

    await concept.list({ publisher: "alice" });
    await concept.unlist({ publisher: "alice" });
    await refused(() => concept.unlist({ publisher: "alice" }), NotListed, "You have nothing listed.");
    expect(await concept._published({ publisher: "alice" })).toEqual([{ item: "alice-bio", listed: false }]);
  });

  test("unpublish: refused when nothing is published, including a second time, and the handle stays", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    // Bob has no handle at all, and Alice has a handle with nothing published.
    for (const publisher of ["bob", "alice"]) {
      await refused(() => concept.unpublish({ publisher }), NothingPublished, "You have not published anything.");
    }

    await concept.publish({ publisher: "alice", item: "alice-bio" });
    await concept.unpublish({ publisher: "alice" });
    await refused(() => concept.unpublish({ publisher: "alice" }), NothingPublished, "You have not published anything.");
    expect(await concept._handle({ user: "alice" })).toEqual([{ handle: "alice-draws" }]);
    expect(await concept._handle({ user: "bob" })).toEqual([]);
  });

  test("release: refused with no handle, and refused while something is published", async () => {
    const { concept, at } = publishing();
    await refused(() => concept.release({ user: "alice" }), NoHandle, "You do not have a handle.");

    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    const listedOn = at(3);
    await concept.list({ publisher: "alice" });
    await refused(() => concept.release({ user: "alice" }), StillPublished, "Unpublish your item before you release your handle.");
    // The handle, the publication, and its listing are all still there.
    expect(await concept._byHandle({ handle: "alice-draws" })).toEqual([{ user: "alice" }]);
    expect(await concept._listed({})).toEqual([{ publisher: "alice", item: "alice-bio", listedOn }]);

    // An unlisted publication still blocks the release.
    await concept.unlist({ publisher: "alice" });
    await refused(() => concept.release({ user: "alice" }), StillPublished, "Unpublish your item before you release your handle.");

    await concept.unpublish({ publisher: "alice" });
    expect(await concept.release({ user: "alice" })).toEqual({ user: "alice" });
    await refused(() => concept.release({ user: "alice" }), NoHandle, "You do not have a handle.");
  });
});

describe("Publishing variants", () => {
  test("replacing the published item keeps the listing and the time it was first listed", async () => {
    const { concept, at } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio-1" });
    const listedOn = at(3);
    await concept.list({ publisher: "alice" });

    at(60);
    expect(await concept.publish({ publisher: "alice", item: "alice-bio-2" })).toEqual({ publisher: "alice", item: "alice-bio-2" });
    expect(await concept._published({ publisher: "alice" })).toEqual([{ item: "alice-bio-2", listed: true }]);
    expect(await concept._listed({})).toEqual([{ publisher: "alice", item: "alice-bio-2", listedOn }]);
    // The first item is free again, so someone else may publish it.
    expect(await concept._publisherOf({ item: "alice-bio-1" })).toEqual([]);
  });

  test("unpublishing removes the listing, and listing again later takes the new time and moves to the top", async () => {
    const { concept, at } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.claim({ user: "bob", handle: "bob-reads" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    await concept.publish({ publisher: "bob", item: "bob-bio" });
    at(0);
    await concept.list({ publisher: "alice" });
    const bobListed = at(10);
    await concept.list({ publisher: "bob" });
    expect((await concept._listed({})).map(({ publisher }) => publisher)).toEqual(["bob", "alice"]);

    at(20);
    expect(await concept.unpublish({ publisher: "alice" })).toEqual({ publisher: "alice", item: "alice-bio" });
    expect(await concept._listed({})).toEqual([{ publisher: "bob", item: "bob-bio", listedOn: bobListed }]);

    // Publishing again does not bring the old listing back.
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    expect(await concept._published({ publisher: "alice" })).toEqual([{ item: "alice-bio", listed: false }]);
    expect(await concept._listed({})).toEqual([{ publisher: "bob", item: "bob-bio", listedOn: bobListed }]);

    const aliceListedAgain = at(30);
    await concept.list({ publisher: "alice" });
    expect(await concept._listed({})).toEqual([
      { publisher: "alice", item: "alice-bio", listedOn: aliceListedAgain },
      { publisher: "bob", item: "bob-bio", listedOn: bobListed },
    ]);
  });

  test("unlisting and listing again takes the new time", async () => {
    const { concept, at } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    at(0);
    await concept.list({ publisher: "alice" });
    at(4);
    await concept.unlist({ publisher: "alice" });
    const listedAgain = at(7);
    await concept.list({ publisher: "alice" });
    expect(await concept._listed({})).toEqual([{ publisher: "alice", item: "alice-bio", listedOn: listedAgain }]);
  });

  test("listings are ordered newest first, and those made at the same moment by publisher identity", async () => {
    const { concept, at } = publishing();
    for (const user of ["aaron", "carol", "alice", "bob"]) {
      await concept.claim({ user, handle: `${user}-fan` });
      await concept.publish({ publisher: user, item: `${user}-bio` });
    }
    // Aaron lists first. The other three list at one later moment, out of order.
    at(0);
    await concept.list({ publisher: "aaron" });
    at(5);
    for (const publisher of ["carol", "alice", "bob"]) await concept.list({ publisher });

    expect((await concept._listed({})).map(({ publisher }) => publisher)).toEqual(["alice", "bob", "carol", "aaron"]);
  });

  test("a handle of 3 or 30 characters, of digits only, or with hyphens is accepted", async () => {
    const { concept } = publishing();
    const accepted = ["abc", "a".repeat(30), "2026", "fern-and-stark-4ever"];
    for (const [index, handle] of accepted.entries()) {
      const user = `fan-${index}`;
      expect(await concept.claim({ user, handle })).toEqual({ user, handle });
      expect(await concept._byHandle({ handle })).toEqual([{ user }]);
    }
  });

  test("two users cannot claim the same handle, even at the same moment", async () => {
    const { concept } = publishing();
    // Both ask before either has the handle. Exactly one gets it.
    const { returned, refusals } = await together(
      concept.claim({ user: "alice", handle: "frieren-fan" }),
      concept.claim({ user: "bob", handle: "frieren-fan" }),
    );
    expect(returned).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toBeInstanceOf(HandleTaken);
    expect(refusals[0].message).toBe("That handle is already taken.");

    const winner = returned[0].user;
    const loser = winner === "alice" ? "bob" : "alice";
    expect(await concept._byHandle({ handle: "frieren-fan" })).toEqual([{ user: winner }]);
    expect(await concept._handle({ user: loser })).toEqual([]);
  });

  test("one user claiming two handles at the same moment gets only one of them", async () => {
    const { concept } = publishing();
    const { returned, refusals } = await together(
      concept.claim({ user: "alice", handle: "alice-draws" }),
      concept.claim({ user: "alice", handle: "alice-paints" }),
    );
    expect(returned).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toBeInstanceOf(HandleAlreadyClaimed);
    expect(refusals[0].message).toBe("You already have a handle.");

    const kept = returned[0].handle;
    const lost = kept === "alice-draws" ? "alice-paints" : "alice-draws";
    expect(await concept._handle({ user: "alice" })).toEqual([{ handle: kept }]);
    expect(await concept._byHandle({ handle: lost })).toEqual([]);
  });

  test("one item cannot be published by two people, even at the same moment", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.claim({ user: "bob", handle: "bob-reads" });
    await concept.publish({ publisher: "bob", item: "bob-bio" });

    // Both publish the shared item before either has it. Exactly one gets it.
    const { returned, refusals } = await together(
      concept.publish({ publisher: "alice", item: "shared-bio" }),
      concept.publish({ publisher: "bob", item: "shared-bio" }),
    );
    expect(returned).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toBeInstanceOf(AlreadyPublished);
    expect(refusals[0].message).toBe("That item is already published.");

    const winner = returned[0].publisher;
    expect(await concept._publisherOf({ item: "shared-bio" })).toEqual([{ publisher: winner }]);
    // Whoever lost keeps what they had: nothing for Alice, his own bio for Bob.
    expect(await concept._published({ publisher: "alice" })).toEqual(
      winner === "alice" ? [{ item: "shared-bio", listed: false }] : [],
    );
    expect(await concept._published({ publisher: "bob" })).toEqual([
      { item: winner === "bob" ? "shared-bio" : "bob-bio", listed: false },
    ]);
  });

  test("a publish and a release at the same moment never leave a publication without a handle", async () => {
    const { concept } = publishing();
    for (let round = 0; round < 10; round += 1) {
      const user = `fan-${round}`;
      const item = `bio-${round}`;
      await concept.claim({ user, handle: user });
      const { returned, refusals } = await together<unknown>(
        concept.publish({ publisher: user, item }),
        concept.release({ user }),
      );
      // Exactly one of the two happened, and the other was refused for that reason.
      expect(returned).toHaveLength(1);
      expect(refusals).toHaveLength(1);
      if ((await concept._published({ publisher: user })).length === 1) {
        expect(refusals[0]).toBeInstanceOf(StillPublished);
        expect(await concept._handle({ user })).toEqual([{ handle: user }]);
        expect(await concept._publisherOf({ item })).toEqual([{ publisher: user }]);
      } else {
        expect(refusals[0]).toBeInstanceOf(HandleRequired);
        expect(await concept._handle({ user })).toEqual([]);
        expect(await concept._publisherOf({ item })).toEqual([]);
      }
    }
  });

  test("release frees the handle for someone else, and the person who released needs a handle to publish again", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "frieren-fan" });
    expect(await concept.release({ user: "alice" })).toEqual({ user: "alice" });
    expect(await concept._byHandle({ handle: "frieren-fan" })).toEqual([]);
    expect(await concept._handle({ user: "alice" })).toEqual([]);
    await refused(() => concept.publish({ publisher: "alice", item: "alice-bio" }), HandleRequired, "You need a handle before you can publish.");

    expect(await concept.claim({ user: "bob", handle: "frieren-fan" })).toEqual({ user: "bob", handle: "frieren-fan" });
    expect(await concept._byHandle({ handle: "frieren-fan" })).toEqual([{ user: "bob" }]);

    // The handle is Bob's now. Alice claims a different one and publishes under it.
    await refused(() => concept.claim({ user: "alice", handle: "frieren-fan" }), HandleTaken, "That handle is already taken.");
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    expect(await reach(concept, "alice-draws")).toEqual([{ item: "alice-bio", listed: false }]);
    expect(await reach(concept, "frieren-fan")).toEqual([]);
  });
});

describe("Publishing queries", () => {
  test("unknown handles, users, and items answer with no rows", async () => {
    const { concept } = publishing();
    expect(await concept._byHandle({ handle: "nobody" })).toEqual([]);
    expect(await concept._handle({ user: "nobody" })).toEqual([]);
    expect(await concept._published({ publisher: "nobody" })).toEqual([]);
    expect(await concept._publisherOf({ item: "nothing" })).toEqual([]);
    expect(await concept._listed({})).toEqual([]);
  });

  test("a handle is found only as it was claimed", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    expect(await concept._byHandle({ handle: "alice-draws" })).toEqual([{ user: "alice" }]);
    for (const handle of ["Alice-Draws", "alice-draws ", "alice-draw", "alice"]) {
      expect(await concept._byHandle({ handle })).toEqual([]);
    }
  });

  test("a handle that is not text finds nobody and cannot be claimed", async () => {
    const { concept } = publishing();
    await concept.claim({ user: "alice", handle: "alice-draws" });
    // A request can carry any value where the handle goes. A database operator there must not match Alice,
    // and a number must not be saved as a handle.
    const operator = { $ne: "" } as unknown as string;
    const number = 12345 as unknown as string;
    expect(await concept._byHandle({ handle: operator })).toEqual([]);
    for (const handle of [operator, number]) {
      await refused(
        () => concept.claim({ user: "bob", handle }),
        InvalidHandle,
        "A handle must be 3 to 30 lowercase letters, digits, or hyphens.",
      );
    }
    expect(await concept._handle({ user: "bob" })).toEqual([]);
  });
});

describe("Publishing storage", () => {
  test("handles, publications, and listings survive a new instance on the same database", async () => {
    const first = publishing();
    await first.concept.claim({ user: "alice", handle: "alice-draws" });
    await first.concept.publish({ publisher: "alice", item: "alice-bio" });
    const listedOn = first.at(4);
    await first.concept.list({ publisher: "alice" });

    // A second instance stands in for the server after a restart.
    const { concept: restarted } = publishing();
    expect(await restarted._byHandle({ handle: "alice-draws" })).toEqual([{ user: "alice" }]);
    expect(await restarted._handle({ user: "alice" })).toEqual([{ handle: "alice-draws" }]);
    expect(await restarted._published({ publisher: "alice" })).toEqual([{ item: "alice-bio", listed: true }]);
    expect(await restarted._publisherOf({ item: "alice-bio" })).toEqual([{ publisher: "alice" }]);
    const listed = await restarted._listed({});
    expect(listed).toEqual([{ publisher: "alice", item: "alice-bio", listedOn }]);
    expect(listed[0].listedOn).toBeInstanceOf(Date);

    // What was saved still refuses a second handle, a taken handle, and a taken item.
    expect(await refusal(() => restarted.claim({ user: "alice", handle: "alice-paints" }))).toBeInstanceOf(HandleAlreadyClaimed);
    expect(await refusal(() => restarted.claim({ user: "bob", handle: "alice-draws" }))).toBeInstanceOf(HandleTaken);
    await restarted.claim({ user: "bob", handle: "bob-reads" });
    expect(await refusal(() => restarted.publish({ publisher: "bob", item: "alice-bio" }))).toBeInstanceOf(AlreadyPublished);
    expect(await refusal(() => restarted.list({ publisher: "alice" }))).toBeInstanceOf(AlreadyListed);
  });

  test("two instances of the concept keep separate handles, publications, and listings", async () => {
    const { concept: bios } = publishing("BioPublishing");
    const { concept: cards } = publishing("CardPublishing");
    await bios.claim({ user: "alice", handle: "alice-draws" });
    await bios.publish({ publisher: "alice", item: "shared-item" });
    await bios.list({ publisher: "alice" });

    expect(await cards._byHandle({ handle: "alice-draws" })).toEqual([]);
    expect(await cards._handle({ user: "alice" })).toEqual([]);
    expect(await cards._publisherOf({ item: "shared-item" })).toEqual([]);
    expect(await cards._listed({})).toEqual([]);

    // The same handle and the same item are free in the other instance.
    expect(await cards.claim({ user: "bob", handle: "alice-draws" })).toEqual({ user: "bob", handle: "alice-draws" });
    expect(await cards.publish({ publisher: "bob", item: "shared-item" })).toEqual({ publisher: "bob", item: "shared-item" });
    expect(await bios._publisherOf({ item: "shared-item" })).toEqual([{ publisher: "alice" }]);
    expect(await cards._publisherOf({ item: "shared-item" })).toEqual([{ publisher: "bob" }]);
    expect((await bios._listed({})).map(({ publisher }) => publisher)).toEqual(["alice"]);
    expect(await cards._listed({})).toEqual([]);
  });

  test("without a clock of its own, a listing takes the current time", async () => {
    const concept = new PublishingConcept<string, string>(database());
    await concept.claim({ user: "alice", handle: "alice-draws" });
    await concept.publish({ publisher: "alice", item: "alice-bio" });
    const before = Date.now();
    await concept.list({ publisher: "alice" });
    const after = Date.now();

    const [listed] = await concept._listed({});
    expect(listed.listedOn).toBeInstanceOf(Date);
    expect(listed.listedOn.getTime()).toBeGreaterThanOrEqual(before);
    expect(listed.listedOn.getTime()).toBeLessThanOrEqual(after);
  });
});
