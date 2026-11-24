import { describe, expect, test } from "bun:test";
import {
  DescribingConcept,
  InvalidDescriptionName,
  InvalidDescriptionText,
} from "../../src/concepts/Describing/Describing.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

describe("Describing", () => {
  test("public details survive a new instance, revise together, and are independent between items", async () => {
    const descriptions = new DescribingConcept(database());
    expect(await descriptions._get({ item: "first" })).toEqual({ name: "", text: "" });
    await descriptions.set({ item: "first", name: "Mika", text: "Let’s trade sketches.\nフリーレン" });
    await descriptions.set({ item: "second", name: "Fern fan", text: "" });

    const restarted = new DescribingConcept(database());
    expect(await restarted._get({ item: "first" })).toEqual({ name: "Mika", text: "Let’s trade sketches.\nフリーレン" });
    await restarted.set({ item: "first", name: "Mika draws", text: "A new introduction." });
    expect(await descriptions._get({ item: "first" })).toEqual({ name: "Mika draws", text: "A new introduction." });
    expect(await descriptions._get({ item: "second" })).toEqual({ name: "Fern fan", text: "" });

    expect(await descriptions.remove({ item: "first" })).toEqual({ item: "first" });
    expect(await descriptions._get({ item: "first" })).toEqual({ name: "", text: "" });
    expect(await descriptions.remove({ item: "first" })).toEqual({ item: "first" });
    expect(await descriptions._get({ item: "second" })).toEqual({ name: "Fern fan", text: "" });
  });

  test("blank and excessive names and excessive notes leave saved details unchanged", async () => {
    const descriptions = new DescribingConcept(database());
    const before = { name: "Mika", text: "Saved introduction." };
    await descriptions.set({ item: "first", ...before });
    for (const name of ["", "  \n", "a".repeat(61)]) {
      expect(await refusal(() => descriptions.set({ item: "first", name, text: "Changed" }))).toBeInstanceOf(InvalidDescriptionName);
      expect(await descriptions._get({ item: "first" })).toEqual(before);
    }
    expect(await refusal(() => descriptions.set({ item: "first", name: "Changed", text: "a".repeat(281) }))).toBeInstanceOf(InvalidDescriptionText);
    expect(await descriptions._get({ item: "first" })).toEqual(before);

    const longest = { item: "first", name: "a".repeat(60), text: "b".repeat(280) };
    expect(await descriptions.set(longest)).toEqual({ item: "first" });
    expect(await descriptions.set(longest)).toEqual({ item: "first" });
    expect(await descriptions._get({ item: "first" })).toEqual({ name: longest.name, text: longest.text });
  });

  test("two concept instances keep separate descriptions", async () => {
    const bios = new DescribingConcept(database(), "BioDescriptions");
    const posts = new DescribingConcept(database(), "PostDescriptions");
    await bios.set({ item: "same", name: "Mika", text: "Bio" });
    await posts.set({ item: "same", name: "Post", text: "Post details" });
    await posts.remove({ item: "same" });
    expect(await bios._get({ item: "same" })).toEqual({ name: "Mika", text: "Bio" });
    expect(await posts._get({ item: "same" })).toEqual({ name: "", text: "" });
  });
});
