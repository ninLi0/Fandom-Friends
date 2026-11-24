import { describe, expect, test } from "bun:test";
import type { Draft } from "../../src/concepts/Drafting/Drafting.ts";
import { DescribingConcept } from "../../src/concepts/Describing/Describing.ts";
import { startApp } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

describe("bio public details", () => {
  test("the owner, public link and discovery see the same saved details, without the private bio name", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    const bio = (await alice("/bios/start", { name: "Private draft name" })).body.bio;
    const before = (await alice("/bios/view", { bio })).body;
    expect(before.card.displayName).toBe("");
    expect(before.card.note).toBe("");
    expect(before.overrides).toEqual({ font: null, palette: null });

    const details = { bio, displayName: "Mika", note: "Let’s trade sketches.\nフリーレン" };
    const changed = await alice("/bios/details", details);
    expect(changed.status).toBe(200);
    expect(changed.body.card).toMatchObject({ displayName: details.displayName, note: details.note });
    expect(await new DescribingConcept(database())._get({ item: bio })).toEqual({ name: details.displayName, text: details.note });

    await alice("/sharing/claim", { handle: "mika-draws" });
    await alice("/sharing/display", { bio });
    await alice("/sharing/open");
    const preview = (await alice("/bios/view", { bio })).body;
    const publicCard = (await app.visitor("/cards/view", { handle: "mika-draws" })).body.card;
    const found = (await bob("/search", { tags: [] })).body.people;
    expect(publicCard).toEqual(preview.card);
    expect(found[0].card).toEqual(preview.card);
    expect(JSON.stringify(publicCard)).not.toContain("Private draft name");

    await alice("/bios/details", { bio, displayName: "Mika draws", note: "" });
    expect((await app.visitor("/cards/view", { handle: "mika-draws" })).body.card).toMatchObject({ displayName: "Mika draws", note: "" });
  });

  test("only the owner can update details and unknown and foreign bios answer alike", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    const bio = (await alice("/bios/start", { name: "Private" })).body.bio;
    const details = { bio, displayName: "Mika", note: "Saved" };
    expect((await app.visitor("/bios/details", details)).status).toBe(401);
    const foreign = await bob("/bios/details", details);
    const unknown = await bob("/bios/details", { ...details, bio: "not-a-bio" });
    expect(foreign.status).toBe(404);
    expect(unknown.body).toEqual(foreign.body);
    expect((await alice("/bios/view", { bio })).body.card).toMatchObject({ displayName: "", note: "" });
  });

  test("text limits and input shapes are enforced without replacing accepted details", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bio = (await alice("/bios/start", { name: "Private" })).body.bio;
    const longest = { bio, displayName: "a".repeat(60), note: "b".repeat(280) };
    expect((await alice("/bios/details", longest)).status).toBe(200);
    for (const input of [
      { ...longest, displayName: "" }, { ...longest, displayName: " \n" },
      { ...longest, displayName: "a".repeat(61) }, { ...longest, note: "b".repeat(281) },
    ]) {
      const rejected = await alice("/bios/details", input);
      expect(rejected.status).toBe(400);
      expect(rejected.body.code).toMatch(/^INVALID_DESCRIPTION_/);
    }
    for (const input of [
      { bio, displayName: "Mika" }, { ...longest, note: null }, { ...longest, displayName: { $ne: "" } }, { ...longest, extra: true },
    ]) expect((await alice("/bios/details", input)).status).toBe(400);
    expect((await alice("/bios/view", { bio })).body.card).toMatchObject({ displayName: longest.displayName, note: longest.note });
  });

  test("discard removes the public details as well as the public card", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bio = (await alice("/bios/start", { name: "Private" })).body.bio;
    await alice("/bios/details", { bio, displayName: "Mika", note: "Saved" });
    await alice("/sharing/claim", { handle: "mika-draws" });
    await alice("/sharing/display", { bio });
    expect((await alice("/bios/discard", { bio })).status).toBe(200);
    // Reactions can finish just after the HTTP answer; wait for that cleanup, not a fixed delay.
    for (let remaining = 30; remaining > 0; remaining -= 1) {
      if ((await app.runtime.instances.Describing._get({ item: bio as Draft })).name === "") break;
      await Bun.sleep(10);
    }
    expect(await app.runtime.instances.Describing._get({ item: bio as Draft })).toEqual({ name: "", text: "" });
    expect(await database().collection("describing.descriptions").countDocuments()).toBe(0);
    expect((await app.visitor("/cards/view", { handle: "mika-draws" })).status).toBe(404);
  });

  test("owner look overrides distinguish inherited values from explicit choices", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bio = (await alice("/bios/start", { name: "Private" })).body.bio;
    const inherited = (await alice("/bios/view", { bio })).body;
    expect(inherited.overrides).toEqual({ font: null, palette: null });
    await alice("/bios/look/font", { bio, font: inherited.card.look.font });
    await alice("/bios/look/palette", { bio, palette: inherited.card.look.palette });
    expect((await alice("/bios/view", { bio })).body.overrides).toEqual({ font: inherited.card.look.font, palette: inherited.card.look.palette });
    await alice("/bios/look/template", { bio, template: await app.template("Side by side") });
    expect((await alice("/bios/view", { bio })).body.overrides).toEqual({ font: inherited.card.look.font, palette: inherited.card.look.palette });
    await alice("/bios/look/reset", { bio });
    expect((await alice("/bios/view", { bio })).body.overrides).toEqual({ font: null, palette: null });
  });
});
