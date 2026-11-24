import { describe, expect, test } from "bun:test";
import { startApp, tagNames } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

describe("the journey in user-journey.md, end to end over HTTP", () => {
  test("Alice builds a bio, displays it, opens it to new friends, and Bob finds her by tag", async () => {
    let now = new Date("2026-11-23T12:00:00Z");
    const app = await startApp(database(), { clock: () => now });
    const alice = await app.person("alice");
    const bob = await app.person("bob");

    // Alice builds a bio from tags. Picking another name of a tag adds the main tag.
    const { body: started } = await alice("/bios/start", { name: "Frieren and sketch swaps" });
    const bio = started.bio as string;
    await alice("/bios/tags/add", { bio, tag: await app.tag("Sousou no Frieren") });
    await alice("/bios/tags/add", { bio, tag: await app.tag("Fern × Stark") });
    const added = await alice("/bios/tags/add", { bio, tag: await app.tag("Sketch swaps") });
    expect(added.status).toBe(200);
    expect(tagNames(added.body.card)).toEqual(["Fern/Stark", "Frieren", "Sketch swaps"]);

    // The preview shows the default look until she picks a template and a font of her own.
    expect(added.body.card.look).toMatchObject({ layout: "Stacked", font: "Serif", palette: "Parchment" });
    await alice("/bios/look/template", { bio, template: await app.template("Side by side") });
    const styled = await alice("/bios/look/font", { bio, font: "Rounded" });
    expect(styled.body.card.look).toMatchObject({ layout: "Two columns", font: "Rounded", palette: "Midnight" });

    // She keeps a second bio. Only the displayed one is public.
    const { body: second } = await alice("/bios/start", { name: "Dungeon Meshi discussions" });
    await alice("/bios/tags/add", { bio: second.bio, tag: await app.tag("Delicious in Dungeon") });
    expect((await alice("/bios/list")).body.bios.map((saved: { name: string }) => saved.name)).toEqual([
      "Dungeon Meshi discussions",
      "Frieren and sketch swaps",
    ]);

    // Displaying needs a handle first.
    const early = await alice("/sharing/display", { bio });
    expect(early.status).toBe(409);
    expect(early.body).toEqual({ error: "CONFLICT", code: "HANDLE_REQUIRED", detail: "Claim a handle before you display a bio." });
    expect((await alice("/sharing/claim", { handle: "alice-draws" })).body).toEqual({ handle: "alice-draws" });
    expect((await alice("/sharing/display", { bio })).body).toEqual({ bio });

    // Anyone with the link sees the card, with no session.
    const shown = await app.visitor("/cards/view", { handle: "alice-draws" });
    expect(shown.status).toBe(200);
    expect(shown.body.handle).toBe("alice-draws");
    expect(tagNames(shown.body.card)).toEqual(["Fern/Stark", "Frieren", "Sketch swaps"]);
    const pairing = shown.body.card.tags[0];
    expect(pairing.under.map((broader: { name: string; direct: boolean }) => [broader.name, broader.direct]).sort()).toEqual([
      ["Fern", true],
      ["Frieren", false],
      ["Stark", true],
    ]);

    // Until she is open to new friends, search does not find her.
    expect((await bob("/search", { tags: [] })).body).toEqual({ people: [] });
    now = new Date("2026-11-23T12:05:00Z");
    expect((await alice("/sharing/open")).body).toEqual({ open: true });
    expect((await alice("/sharing/status")).body).toEqual({ sharing: { handle: "alice-draws", displayed: bio, open: true } });

    // Bob searches by a broader tag and by another name; a bio must have every searched tag.
    const byFrieren = await bob("/search", { tags: [await app.tag("Frieren")] });
    expect(byFrieren.body.people.map((found: { handle: string }) => found.handle)).toEqual(["alice-draws"]);
    expect(byFrieren.body.people[0].listedOn).toBe("2026-11-23T12:05:00.000Z");
    const byStarkAndSwaps = await bob("/search", { tags: [await app.tag("Stark"), await app.tag("Art trades")] });
    expect(byStarkAndSwaps.body.people).toHaveLength(1);
    const byDungeon = await bob("/search", { tags: [await app.tag("Frieren"), await app.tag("Dungeon Meshi")] });
    expect(byDungeon.body.people).toEqual([]);

    // Alice never finds herself.
    expect((await alice("/search", { tags: [] })).body).toEqual({ people: [] });

    // Later she displays the other bio: the first stops being public and the listing stays on.
    expect((await alice("/sharing/display", { bio: second.bio })).status).toBe(200);
    expect(tagNames((await app.visitor("/cards/view", { handle: "alice-draws" })).body.card)).toEqual(["Dungeon Meshi"]);
    expect((await bob("/search", { tags: [await app.tag("Frieren")] })).body.people).toEqual([]);
    expect((await bob("/search", { tags: [await app.tag("Dungeon Meshi")] })).body.people).toHaveLength(1);
  });
});
