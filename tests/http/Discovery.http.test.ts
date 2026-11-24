import { describe, expect, test } from "bun:test";
import type { SeedTag } from "../../src/seed/vocabulary.ts";
import { startApp, type Answer, type Caller } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

type App = Awaited<ReturnType<typeof startApp>>;

/** One person in a test: their signed-in caller, their handle, and the bio they display. */
interface Person {
  call: Caller;
  handle: string;
  bio: string;
}

/** A setup step must succeed. A refused one would make the test check something else. */
async function done(step: Promise<Answer>): Promise<Record<string, any>> {
  const answer = await step;
  if (answer.status !== 200) throw new Error(`A setup step was refused: ${JSON.stringify(answer.body)}`);
  return answer.body;
}

/** The identities of the tags with these names. */
function identities(app: App, names: string[]): Promise<string[]> {
  return Promise.all(names.map((name) => app.tag(name)));
}

/** Saves a bio under this name with these tags, picked by name, and answers the bio. */
async function saveBio(app: App, call: Caller, name: string, tags: string[]): Promise<string> {
  const { bio } = await done(call("/bios/start", { name }));
  for (const tag of await identities(app, tags)) await done(call("/bios/tags/add", { bio, tag }));
  return bio;
}

/**
 * Registers a person, saves one bio with these tags, claims the handle "<username>-page", and displays the bio.
 * The person is not yet open to new friends.
 */
async function displayingBio(app: App, username: string, tags: string[] = []): Promise<Person> {
  const call = await app.person(username);
  const handle = `${username}-page`;
  const bio = await saveBio(app, call, `${username}'s bio`, tags);
  await done(call("/sharing/claim", { handle }));
  await done(call("/sharing/display", { bio }));
  return { call, handle, bio };
}

/** The same, and open to new friends, so search can find them. */
async function openToNewFriends(app: App, username: string, tags: string[] = []): Promise<Person> {
  const person = await displayingBio(app, username, tags);
  await done(person.call("/sharing/open"));
  return person;
}

/** The handles a search answered, in the order answered. */
function handles(answer: Answer): string[] {
  return answer.body.people.map((found: { handle: string }) => found.handle);
}

/** Each result's handle and listing time, in the order answered. */
function listing(answer: Answer): string[][] {
  return answer.body.people.map((found: { handle: string; listedOn: string }) => [found.handle, found.listedOn]);
}

/**
 * Searches by tag names and answers the handles found, in alphabetical order.
 * Most tests ask who is found, not in what order; the order has its own tests.
 */
async function found(app: App, searcher: Caller, tags: string[] = []): Promise<string[]> {
  const answer = await searcher("/search", { tags: await identities(app, tags) });
  expect(answer.status).toBe(200);
  return handles(answer).sort();
}

/** A time on the day the tests pretend it is. */
function at(time: string): Date {
  return new Date(`2026-11-23T${time}:00Z`);
}

describe("who appears when no tag is chosen", () => {
  test("everyone who is open to new friends appears, whatever their tags", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    await openToNewFriends(app, "bob", ["Dungeon Meshi", "Sketch swaps"]);
    await openToNewFriends(app, "carol", []);
    const dana = await app.person("dana");

    expect(await found(app, dana)).toEqual(["alice-page", "bob-page", "carol-page"]);
  });

  test("a person who displays a bio but is not open to new friends does not appear", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await displayingBio(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");

    // Bob's address works, so his bio really is displayed.
    expect((await app.visitor("/cards/view", { handle: bob.handle })).status).toBe(200);
    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a person with a handle and no displayed bio does not appear", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await app.person("bob");
    await saveBio(app, bob, "bob's bio", ["Frieren"]);
    await done(bob("/sharing/claim", { handle: "bob-page" }));
    const dana = await app.person("dana");

    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a person who only saved a bio, with no handle, does not appear", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await app.person("bob");
    await saveBio(app, bob, "bob's bio", ["Frieren"]);
    const dana = await app.person("dana");

    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a person who closed again no longer appears", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await openToNewFriends(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");
    expect(await found(app, dana)).toEqual(["alice-page", "bob-page"]);

    expect((await bob.call("/sharing/close")).body).toEqual({ open: false });

    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a person who stopped displaying their bio no longer appears", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await openToNewFriends(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");

    expect((await bob.call("/sharing/hide")).body).toEqual({ bio: bob.bio });

    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("displaying a bio again after hiding it does not make a person open again", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await openToNewFriends(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");

    await done(bob.call("/sharing/hide"));
    await done(bob.call("/sharing/display", { bio: bob.bio }));
    expect(await found(app, dana)).toEqual(["alice-page"]);

    // Only turning Open to New Friends on again brings Bob back.
    await done(bob.call("/sharing/open"));
    expect(await found(app, dana)).toEqual(["alice-page", "bob-page"]);
  });

  test("a person who discarded their displayed bio no longer appears", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const bob = await openToNewFriends(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");

    expect((await bob.call("/bios/discard", { bio: bob.bio })).body).toEqual({ bio: bob.bio });

    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a searcher who is open to new friends never finds themself", async () => {
    const app = await startApp(database());
    const alice = await openToNewFriends(app, "alice", ["Frieren"]);
    const dana = await openToNewFriends(app, "dana", ["Frieren"]);

    expect(await found(app, dana.call)).toEqual(["alice-page"]);
    expect(await found(app, dana.call, ["Frieren"])).toEqual(["alice-page"]);
    // Dana is listed: Alice finds her.
    expect(await found(app, alice.call, ["Frieren"])).toEqual(["dana-page"]);
  });
});

describe("the order of results", () => {
  test("the person listed most recently comes first", async () => {
    let now = at("12:00");
    const app = await startApp(database(), { clock: () => now });
    const alice = await displayingBio(app, "alice", ["Frieren"]);
    const bob = await displayingBio(app, "bob", ["Frieren"]);
    const carol = await displayingBio(app, "carol", ["Frieren"]);
    const dana = await app.person("dana");

    // They open in an order that is neither the order they registered in nor the order of their names.
    now = at("12:01");
    await done(bob.call("/sharing/open"));
    now = at("12:05");
    await done(carol.call("/sharing/open"));
    now = at("12:10");
    await done(alice.call("/sharing/open"));

    now = at("12:30");
    const newestFirst = [
      ["alice-page", "2026-11-23T12:10:00.000Z"],
      ["carol-page", "2026-11-23T12:05:00.000Z"],
      ["bob-page", "2026-11-23T12:01:00.000Z"],
    ];
    expect(listing(await dana("/search", { tags: [] }))).toEqual(newestFirst);
    expect(listing(await dana("/search", { tags: [await app.tag("Frieren")] }))).toEqual(newestFirst);
  });

  test("closing and opening again moves a person to the top", async () => {
    let now = at("12:00");
    const app = await startApp(database(), { clock: () => now });
    const alice = await openToNewFriends(app, "alice", ["Frieren"]);
    now = at("12:05");
    await openToNewFriends(app, "bob", ["Frieren"]);
    now = at("12:10");
    await openToNewFriends(app, "carol", ["Frieren"]);
    const dana = await app.person("dana");
    expect(handles(await dana("/search", { tags: [] }))).toEqual(["carol-page", "bob-page", "alice-page"]);

    now = at("12:20");
    await done(alice.call("/sharing/close"));
    now = at("12:25");
    await done(alice.call("/sharing/open"));

    expect(listing(await dana("/search", { tags: [] }))).toEqual([
      ["alice-page", "2026-11-23T12:25:00.000Z"],
      ["carol-page", "2026-11-23T12:10:00.000Z"],
      ["bob-page", "2026-11-23T12:05:00.000Z"],
    ]);
  });

  test("displaying a different bio keeps a person's place", async () => {
    let now = at("12:00");
    const app = await startApp(database(), { clock: () => now });
    const alice = await openToNewFriends(app, "alice", ["Frieren"]);
    now = at("12:05");
    await openToNewFriends(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");

    now = at("12:10");
    const other = await saveBio(app, alice.call, "alice's other bio", ["Dungeon Meshi"]);
    await done(alice.call("/sharing/display", { bio: other }));

    expect(listing(await dana("/search", { tags: [] }))).toEqual([
      ["bob-page", "2026-11-23T12:05:00.000Z"],
      ["alice-page", "2026-11-23T12:00:00.000Z"],
    ]);
  });

  // Publishing's `_listed` orders rows listed at the same moment by publisher, so the order does not change
  // from one search to the next.
  test("people listed at the same moment come in the same order every time", async () => {
    const now = at("12:00");
    const app = await startApp(database(), { clock: () => now });
    await openToNewFriends(app, "carol", ["Frieren"]);
    await openToNewFriends(app, "alice", ["Frieren"]);
    await openToNewFriends(app, "bob", ["Frieren"]);
    const dana = await app.person("dana");

    const first = handles(await dana("/search", { tags: [] }));
    expect(first).toEqual(["alice-page", "bob-page", "carol-page"]);
    expect(handles(await dana("/search", { tags: [] }))).toEqual(first);
    expect(handles(await dana("/search", { tags: [await app.tag("Frieren")] }))).toEqual(first);
  });
});

describe("every searched tag is required", () => {
  /** Alice has both tags, Bob and Carol one each. Answers the app and a searcher. */
  async function threeBios() {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern", "Sketch swaps"]);
    await openToNewFriends(app, "bob", ["Fern"]);
    await openToNewFriends(app, "carol", ["Sketch swaps"]);
    return { app, dana: await app.person("dana") };
  }

  test("one tag finds every open bio that has it", async () => {
    const { app, dana } = await threeBios();

    expect(await found(app, dana, ["Fern"])).toEqual(["alice-page", "bob-page"]);
    expect(await found(app, dana, ["Sketch swaps"])).toEqual(["alice-page", "carol-page"]);
  });

  test("two tags find only the bios that have both", async () => {
    const { app, dana } = await threeBios();

    expect(await found(app, dana, ["Fern", "Sketch swaps"])).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Sketch swaps", "Fern"])).toEqual(["alice-page"]);
  });

  test("a tag nobody has finds nobody", async () => {
    const { app, dana } = await threeBios();

    const answer = await dana("/search", { tags: [await app.tag("Dungeon Meshi")] });

    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({ people: [] });
  });

  test("one tag nobody has empties a search whose other tags would match", async () => {
    const { app, dana } = await threeBios();

    expect(await found(app, dana, ["Fern", "Dungeon Meshi"])).toEqual([]);
    expect(await found(app, dana, ["Dungeon Meshi", "Fern", "Sketch swaps"])).toEqual([]);
  });

  test("an open bio with no tags is found only when no tag is chosen", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", []);
    const dana = await app.person("dana");

    expect(await found(app, dana)).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Frieren"])).toEqual([]);
  });
});

describe("other names of a tag", () => {
  /** Alice picked "Frieren", Bob picked its other name, and Carol has a different tag. */
  async function twoFrierenBios() {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    await openToNewFriends(app, "bob", ["Sousou no Frieren"]);
    await openToNewFriends(app, "carol", ["Dungeon Meshi"]);
    return { app, dana: await app.person("dana") };
  }

  test("searching by another name finds what the main name finds", async () => {
    const { app, dana } = await twoFrierenBios();

    const byMainName = await dana("/search", { tags: [await app.tag("Frieren")] });
    const byOtherName = await dana("/search", { tags: [await app.tag("Sousou no Frieren")] });

    expect(handles(byMainName).sort()).toEqual(["alice-page", "bob-page"]);
    expect(byOtherName.status).toBe(200);
    expect(byOtherName.body).toEqual(byMainName.body);
  });

  test("both names of one tag together find what either finds", async () => {
    const { app, dana } = await twoFrierenBios();

    expect(await found(app, dana, ["Frieren", "Sousou no Frieren"])).toEqual(["alice-page", "bob-page"]);
  });
});

describe("broader tags", () => {
  test("a bio tagged with a character is found by the series the character lies under", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern"]);
    await openToNewFriends(app, "carol", ["Dungeon Meshi"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a bio tagged with a pairing is found by the series two levels above it", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern/Stark"]);
    await openToNewFriends(app, "carol", ["Dungeon Meshi"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
  });

  test("a bio is found by a broader tag three levels above its own", async () => {
    const fourLevels: SeedTag[] = [
      { name: "Anime" },
      { name: "Frieren", under: ["Anime"] },
      { name: "Fern", under: ["Frieren"] },
      { name: "Stark", under: ["Frieren"] },
      { name: "Fern/Stark", under: ["Fern", "Stark"] },
      { name: "Cooking" },
    ];
    const app = await startApp(database(), { tags: fourLevels });
    await openToNewFriends(app, "alice", ["Fern/Stark"]);
    await openToNewFriends(app, "carol", ["Cooking"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Anime"])).toEqual(["alice-page"]);
  });

  test("a narrower tag does not find a bio that only has the broader tag", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    await openToNewFriends(app, "bob", ["Fern"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page", "bob-page"]);
    expect(await found(app, dana, ["Fern"])).toEqual(["bob-page"]);
    expect(await found(app, dana, ["Fern/Stark"])).toEqual([]);
    expect(await found(app, dana, ["Fern × Stark"])).toEqual([]);
  });

  test("a tag under two parents is found by either parent", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern/Stark"]);
    await openToNewFriends(app, "carol", ["Dungeon Meshi"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Fern"])).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Stark"])).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Fern", "Stark"])).toEqual(["alice-page"]);
  });

  test("a tag does not find a bio whose tag lies beside it under the same parent", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Stark"])).toEqual([]);
  });

  test("each searched tag may be met by a different narrower tag of the bio", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern/Stark", "Sketch swaps"]);
    await openToNewFriends(app, "bob", ["Fern/Stark"]);
    await openToNewFriends(app, "carol", ["Sketch swaps"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Frieren", "Interests"])).toEqual(["alice-page"]);
  });
});

describe("other names and broader tags together", () => {
  test("a bio tagged with a pairing is found by another name of the series", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern/Stark"]);
    await openToNewFriends(app, "carol", ["Dungeon Meshi"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Sousou no Frieren"])).toEqual(["alice-page"]);
  });

  test("a bio tagged by another name of a pairing is found by another name of the series", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern × Stark"]);
    await openToNewFriends(app, "carol", ["Dungeon Meshi"]);
    const dana = await app.person("dana");

    expect(await found(app, dana, ["Sousou no Frieren"])).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Sousou no Frieren", "Fern × Stark"])).toEqual(["alice-page"]);
  });
});

describe("only the displayed bio counts", () => {
  /** Alice displays a Dungeon Meshi bio and is open; she also keeps a saved Frieren bio. */
  async function aliceWithTwoBios() {
    const app = await startApp(database());
    const alice = await openToNewFriends(app, "alice", ["Dungeon Meshi"]);
    const saved = await saveBio(app, alice.call, "alice's other bio", ["Frieren"]);
    return { app, alice, saved, dana: await app.person("dana") };
  }

  test("a saved bio that is not displayed does not make its owner appear", async () => {
    const { app, dana } = await aliceWithTwoBios();

    expect(await found(app, dana, ["Frieren"])).toEqual([]);
    expect(await found(app, dana, ["Dungeon Meshi"])).toEqual(["alice-page"]);
  });

  test("once the other bio is displayed, its tags are the ones that count", async () => {
    const { app, alice, saved, dana } = await aliceWithTwoBios();

    await done(alice.call("/sharing/display", { bio: saved }));

    expect(await found(app, dana, ["Frieren"])).toEqual(["alice-page"]);
    expect(await found(app, dana, ["Dungeon Meshi"])).toEqual([]);
  });
});

describe("what a result shows", () => {
  /** A card with each tag's broader tags put in name order, so a test can compare it whole. */
  function withBroaderTagsInNameOrder(card: Record<string, any>): Record<string, any> {
    const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name);
    return { ...card, tags: card.tags.map((tag: Record<string, any>) => ({ ...tag, under: [...tag.under].sort(byName) })) };
  }

  test("a result carries the full card: each tag with what it lies under, and the look", async () => {
    const app = await startApp(database());
    const alice = await openToNewFriends(app, "alice", ["Sketch swaps", "Fern/Stark", "Dungeon Meshi"]);
    const sideBySide = await app.template("Side by side");
    await done(alice.call("/bios/look/template", { bio: alice.bio, template: sideBySide }));
    await done(alice.call("/bios/look/font", { bio: alice.bio, font: "Rounded" }));
    const dana = await app.person("dana");

    const { body } = await dana("/search", { tags: [] });

    expect(body.people).toHaveLength(1);
    expect(withBroaderTagsInNameOrder(body.people[0].card)).toEqual({
      displayName: "",
      note: "",
      tags: [
        { tag: await app.tag("Dungeon Meshi"), name: "Dungeon Meshi", under: [] },
        {
          tag: await app.tag("Fern/Stark"),
          name: "Fern/Stark",
          under: [
            { tag: await app.tag("Fern"), name: "Fern", direct: true },
            { tag: await app.tag("Frieren"), name: "Frieren", direct: false },
            { tag: await app.tag("Stark"), name: "Stark", direct: true },
          ],
        },
        {
          tag: await app.tag("Sketch swaps"),
          name: "Sketch swaps",
          under: [{ tag: await app.tag("Interests"), name: "Interests", direct: true }],
        },
      ],
      look: { template: sideBySide, layout: "Two columns", font: "Rounded", palette: "Midnight" },
    });
  });

  test("a result shows the same card as the public page and the owner's own preview", async () => {
    const app = await startApp(database());
    const alice = await openToNewFriends(app, "alice", ["Fern/Stark", "Sketch swaps"]);
    await done(alice.call("/bios/look/palette", { bio: alice.bio, palette: "Sakura" }));
    const dana = await app.person("dana");

    const { body } = await dana("/search", { tags: [await app.tag("Frieren")] });
    const publicPage = await app.visitor("/cards/view", { handle: alice.handle });
    const preview = await alice.call("/bios/view", { bio: alice.bio });

    expect(body.people).toHaveLength(1);
    expect(body.people[0].card.look.palette).toBe("Sakura");
    expect(body.people[0].card).toEqual(publicPage.body.card);
    expect(body.people[0].card).toEqual(preview.body.card);
  });

  test("a result holds a handle, a listing time and a card, and nothing that names the account or the bio", async () => {
    let now = at("12:00");
    const app = await startApp(database(), { clock: () => now });
    // The username, the handle and the bio names share no words, so finding one in the answer means it leaked.
    const owl = await app.person("quietowl");
    const displayed = await saveBio(app, owl, "Private working title", ["Fern/Stark"]);
    await saveBio(app, owl, "Second secret draft", ["Frieren"]);
    await done(owl("/sharing/claim", { handle: "moon-rabbit" }));
    await done(owl("/sharing/display", { bio: displayed }));
    now = at("12:07");
    await done(owl("/sharing/open"));
    const dana = await app.person("dana");

    const { status, body } = await dana("/search", { tags: [await app.tag("Frieren")] });

    expect(status).toBe(200);
    expect(Object.keys(body)).toEqual(["people"]);
    expect(body.people).toHaveLength(1);
    expect(Object.keys(body.people[0]).sort()).toEqual(["card", "handle", "listedOn"]);
    expect(body.people[0].handle).toBe("moon-rabbit");
    expect(body.people[0].listedOn).toBe("2026-11-23T12:07:00.000Z");
    expect(Object.keys(body.people[0].card).sort()).toEqual(["displayName", "look", "note", "tags"]);

    const text = JSON.stringify(body).toLowerCase();
    expect(text).not.toContain("quietowl");
    expect(text).not.toContain("private working title");
    expect(text).not.toContain("second secret draft");
    expect(text).not.toContain(displayed.toLowerCase());
  });
});

describe("unusual tag lists", () => {
  test("the same tag given twice behaves like giving it once", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern"]);
    await openToNewFriends(app, "bob", ["Stark"]);
    const dana = await app.person("dana");
    const fern = await app.tag("Fern");

    const once = await dana("/search", { tags: [fern] });
    const twice = await dana("/search", { tags: [fern, fern] });

    expect(handles(once)).toEqual(["alice-page"]);
    expect(twice.status).toBe(200);
    expect(twice.body).toEqual(once.body);
  });

  test("a tag identity that does not exist is a tag no bio has, so searching for it finds nobody", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern"]);
    await openToNewFriends(app, "bob", ["Dungeon Meshi"]);
    const dana = await app.person("dana");
    const fern = await app.tag("Fern");

    const unknownAlone = await dana("/search", { tags: ["no-such-tag"] });
    const unknownWithFern = await dana("/search", { tags: ["no-such-tag", fern] });

    expect(unknownAlone.status).toBe(200);
    expect(unknownAlone.body).toEqual({ people: [] });
    expect(unknownWithFern.status).toBe(200);
    expect(unknownWithFern.body).toEqual({ people: [] });
    // The same search without the unknown tag still finds Alice.
    expect(handles(await dana("/search", { tags: [fern] }))).toEqual(["alice-page"]);
  });
});

describe("access and input", () => {
  const notUnderstood = {
    error: "INVALID_REQUEST",
    detail: "The request was not understood: tags must be at most 10 tag identities and session must come from the cookie.",
  };

  /** The eleven names that Alice's bio below counts as having: its own tags, their other names, and what they lie under. */
  const elevenNames = [
    "Fern/Stark",
    "Fern × Stark",
    "Fern",
    "Stark",
    "Frieren",
    "Sousou no Frieren",
    "Sketch swaps",
    "Art trades",
    "Interests",
    "Dungeon Meshi",
    "Delicious in Dungeon",
  ];

  test("without a session the search is refused", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);

    const answer = await app.visitor("/search", { tags: [] });

    expect(answer.status).toBe(401);
    expect(answer.body).toEqual({
      error: "UNAUTHORIZED",
      code: "NOT_SIGNED_IN",
      detail: "Your session has ended. Sign in again.",
    });
  });

  test("a person who signed out is refused the same way", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Frieren"]);
    const dana = await app.person("dana");
    expect((await dana("/search", { tags: [] })).status).toBe(200);
    await done(dana("/auth/sign-out"));

    const answer = await dana("/search", { tags: [] });

    expect(answer.status).toBe(401);
    expect(answer.body).toEqual({
      error: "UNAUTHORIZED",
      code: "NOT_SIGNED_IN",
      detail: "Your session has ended. Sign in again.",
    });
  });

  test("a request with no tags field is rejected", async () => {
    const app = await startApp(database());
    const dana = await app.person("dana");

    const answer = await dana("/search", {});

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual({ error: "INVALID_REQUEST" });
  });

  test("tags that are not a list are rejected", async () => {
    const app = await startApp(database());
    const dana = await app.person("dana");

    for (const tags of [await app.tag("Frieren"), { 0: "Frieren" }, 5, null]) {
      const answer = await dana("/search", { tags });
      expect(answer.status).toBe(400);
      expect(answer.body).toEqual(notUnderstood);
    }
  });

  test("a list holding something that is not text is rejected", async () => {
    const app = await startApp(database());
    const dana = await app.person("dana");
    const frieren = await app.tag("Frieren");

    for (const tags of [[5], [null], [[frieren]], [frieren, { tag: frieren }]]) {
      const answer = await dana("/search", { tags });
      expect(answer.status).toBe(400);
      expect(answer.body).toEqual(notUnderstood);
    }
  });

  test("a blank tag identity, or one longer than 128 characters, is rejected", async () => {
    const app = await startApp(database());
    const dana = await app.person("dana");

    for (const tags of [[""], ["x".repeat(129)]]) {
      const answer = await dana("/search", { tags });
      expect(answer.status).toBe(400);
      expect(answer.body).toEqual(notUnderstood);
    }
  });

  test("more than 10 tags are rejected", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern/Stark", "Sketch swaps", "Dungeon Meshi"]);
    const dana = await app.person("dana");

    const answer = await dana("/search", { tags: await identities(app, elevenNames) });

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual(notUnderstood);
  });

  test("exactly 10 tags are accepted", async () => {
    const app = await startApp(database());
    await openToNewFriends(app, "alice", ["Fern/Stark", "Sketch swaps", "Dungeon Meshi"]);
    await openToNewFriends(app, "bob", ["Fern/Stark", "Sketch swaps"]);
    const dana = await app.person("dana");

    const answer = await dana("/search", { tags: await identities(app, elevenNames.slice(0, 10)) });

    expect(answer.status).toBe(200);
    expect(handles(answer)).toEqual(["alice-page"]);
  });

  test("a field the search does not take is rejected", async () => {
    const app = await startApp(database());
    const dana = await app.person("dana");

    const answer = await dana("/search", { tags: [], page: 2 });

    expect(answer.status).toBe(400);
    expect(answer.body).toEqual(notUnderstood);
  });
});

describe("searching changes nothing", () => {
  test("after searching, the searcher's bios, tags and sharing are as before, and so is the person found", async () => {
    const app = await startApp(database());
    const alice = await openToNewFriends(app, "alice", ["Fern/Stark", "Sketch swaps"]);
    const dana = await openToNewFriends(app, "dana", ["Dungeon Meshi"]);
    const draft = await saveBio(app, dana.call, "dana's draft", []);

    /** Everything Dana can read about herself, and Alice's public card. */
    async function everything() {
      return {
        bios: (await dana.call("/bios/list")).body,
        displayed: (await dana.call("/bios/view", { bio: dana.bio })).body,
        draft: (await dana.call("/bios/view", { bio: draft })).body,
        sharing: (await dana.call("/sharing/status")).body,
        ownCard: (await app.visitor("/cards/view", { handle: dana.handle })).body,
        aliceCard: (await app.visitor("/cards/view", { handle: alice.handle })).body,
        aliceSharing: (await alice.call("/sharing/status")).body,
      };
    }
    const before = await everything();

    expect(await found(app, dana.call, ["Frieren", "Art trades"])).toEqual(["alice-page"]);
    expect(await found(app, dana.call, ["Episode discussions"])).toEqual([]);
    expect(await found(app, dana.call)).toEqual(["alice-page"]);

    expect(await everything()).toEqual(before);
    // The searched tags were not added to either of Dana's bios.
    expect(before.displayed.card.tags.map((tag: { name: string }) => tag.name)).toEqual(["Dungeon Meshi"]);
    expect(before.draft.card.tags).toEqual([]);
  });
});

describe("how long a search takes", () => {
  test("one search with 2 tags among 8 open people (the time is printed, not checked)", async () => {
    const app = await startApp(database());
    const bios = [
      ["Fern/Stark", "Sketch swaps"],
      ["Fern", "Episode discussions"],
      ["Stark", "Sketch swaps"],
      ["Frieren", "Sketch swaps", "Episode discussions"],
      ["Fern/Stark"],
      ["Dungeon Meshi", "Sketch swaps"],
      ["Sketch swaps"],
      ["Frieren", "Dungeon Meshi"],
    ];
    for (const [index, tags] of bios.entries()) await openToNewFriends(app, `person${index + 1}`, tags);
    const dana = await app.person("dana");
    const tags = await identities(app, ["Frieren", "Interests"]);

    const started = performance.now();
    const answer = await dana("/search", { tags });
    const milliseconds = performance.now() - started;
    console.log(`Search with 2 tags among 8 open people: ${milliseconds.toFixed(1)} ms`);

    expect(answer.status).toBe(200);
    expect(handles(answer).sort()).toEqual(["person1-page", "person2-page", "person3-page", "person4-page"]);
  });
});
