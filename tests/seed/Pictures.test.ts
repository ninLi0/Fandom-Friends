/**
 * The pictures tags show: src/seed/pictures.ts checked as plain data against the tag list in vocabulary.ts.
 * Nothing here reaches the network; whether AniList still serves an image is not something a test should need.
 */
import { describe, expect, test } from "bun:test";
import { pictureCredit, pictureOf, picturesFor, tagPictures } from "../../src/seed/pictures.ts";
import { interestsGroup, tags as starterTags } from "../../src/seed/vocabulary.ts";

const mainNames = new Set(starterTags.map((tag) => tag.name));
const series = starterTags.filter((tag) => (tag.under ?? []).length === 0 && tag.name !== interestsGroup).map((tag) => tag.name);
const characters = starterTags.filter((tag) => (tag.under ?? []).length === 1 && series.includes(tag.under![0]!)).map((tag) => tag.name);
const pairings = starterTags.filter((tag) => (tag.under ?? []).length === 2);

describe("the pictures tags show", () => {
  test("every picture belongs to a tag's main name", () => {
    const strays = Object.keys(tagPictures).filter((name) => !mainNames.has(name));
    expect(strays).toEqual([]);
  });

  test("every picture is a link to AniList's image host, and names the page it comes from", () => {
    for (const [name, picture] of Object.entries(tagPictures)) {
      expect(picture.image, name).toStartWith("https://s4.anilist.co/file/anilistcdn/");
      expect(picture.page, name).toMatch(/^https:\/\/anilist\.co\/(anime|character)\/\d+$/);
      if (picture.wide !== undefined) expect(picture.wide, name).toStartWith("https://s4.anilist.co/file/anilistcdn/");
    }
  });

  test("no two tags share a picture", () => {
    const images = Object.values(tagPictures).map((picture) => picture.image);
    expect(new Set(images).size).toBe(images.length);
  });

  test("every series has a picture and a wide one", () => {
    expect(series.length).toBeGreaterThan(0);
    for (const name of series) {
      expect(pictureOf(name)?.image, name).toBeString();
      expect(pictureOf(name)?.wide, name).toBeString();
    }
  });

  test("every character has a picture, except the one AniList has no page for", () => {
    const without = characters.filter((name) => pictureOf(name) === undefined);
    expect(without).toEqual(["Mimic"]);
  });

  test("a pairing has no picture of its own, and both of its characters have one", () => {
    expect(pairings.length).toBeGreaterThan(0);
    for (const pairing of pairings) {
      expect(pictureOf(pairing.name), pairing.name).toBeUndefined();
      for (const character of pairing.under!) expect(pictureOf(character)?.image, `${pairing.name}: ${character}`).toBeString();
    }
  });

  test("an interest has no picture", () => {
    const interests = starterTags.filter((tag) => (tag.under ?? []).includes(interestsGroup));
    expect(interests.length).toBeGreaterThan(0);
    for (const interest of interests) expect(pictureOf(interest.name), interest.name).toBeUndefined();
  });

  test("a name that is not a tag, or is a word every object has, gives nothing", () => {
    expect(pictureOf("Nobody")).toBeUndefined();
    expect(pictureOf("constructor")).toBeUndefined();
    expect(pictureOf("toString")).toBeUndefined();
  });

  test("a tag shows its own picture, a pairing shows its two characters, in order", () => {
    expect(picturesFor("Fern", ["Frieren"])).toEqual([pictureOf("Fern")!]);
    for (const pairing of pairings) {
      expect(picturesFor(pairing.name, pairing.under), pairing.name).toEqual(pairing.under!.map((character) => pictureOf(character)!));
    }
  });

  test("a character without a picture does not borrow its series', and an interest shows none", () => {
    expect(picturesFor("Mimic", ["Frieren"])).toEqual([]);
    expect(picturesFor("Fan art", [interestsGroup])).toEqual([]);
    expect(picturesFor("Nobody")).toEqual([]);
  });

  test("the credit line names AniList and links to it", () => {
    expect(pictureCredit.text).toContain("AniList");
    expect(pictureCredit.page).toBe("https://anilist.co");
  });
});
