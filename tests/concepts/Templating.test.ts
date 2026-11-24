import { describe, expect, test } from "bun:test";
import {
  InvalidLookFont,
  InvalidLookLayout,
  InvalidLookPalette,
  InvalidTemplateName,
  LookNotCustomized,
  LookNotSet,
  TemplateAlreadyApplied,
  TemplateAlreadyDefault,
  TemplateInUse,
  TemplateIsDefault,
  TemplateNameTaken,
  TemplateNotFound,
  TemplatingConcept,
  type Template,
} from "../../src/concepts/Templating/Templating.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

/** Template identities come out in the order given, so a test can name them. */
function templating(...identities: string[]) {
  const fresh = identities.length === 0 ? undefined : () => {
    const next = identities.shift();
    if (next === undefined) throw new Error("No identity remains.");
    return next;
  };
  return new TemplatingConcept<string>(database(), "Templating", fresh);
}

const unknown = "missing" as Template;

const CLASSIC = { name: "Classic", layout: "Two columns", font: "Serif", palette: "Sunset" };
const CARD = { name: "Card", layout: "Single card", font: "Sans", palette: "Ocean" };
const POSTER = { name: "Poster", layout: "Poster", font: "Display", palette: "Forest" };

/** Defines the three templates the team starts with. None is the default yet. */
async function threeTemplates(concept: TemplatingConcept<string>) {
  const { template: classic } = await concept.define(CLASSIC);
  const { template: card } = await concept.define(CARD);
  const { template: poster } = await concept.define(POSTER);
  return { classic, card, poster };
}

/** The look a template gives an item that has no font or palette of its own. */
function lookOf(template: Template, { layout, font, palette }: { layout: string; font: string; palette: string }) {
  return [{ template, layout, font, palette }];
}

describe("Templating principle", () => {
  test("an item shows the default look until a template is applied; its own font survives a switch, and a reset returns to the template", async () => {
    const concept = templating("classic", "card", "poster");
    const { classic, card, poster } = await threeTemplates(concept);
    expect(classic).toBe("classic" as Template);
    expect(await concept.makeDefault({ template: classic })).toEqual({ template: classic });

    // Nothing chosen yet: the default look.
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: classic, layout: "Two columns", font: "Serif", palette: "Sunset" },
    ]);

    expect(await concept.apply({ item: "alice-bio", template: card })).toEqual({ item: "alice-bio", template: card });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Sans", palette: "Ocean" },
    ]);

    expect(await concept.setFont({ item: "alice-bio", font: "Handwritten" })).toEqual({ item: "alice-bio" });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Handwritten", palette: "Ocean" },
    ]);

    // Switching template changes the layout and palette and keeps the person's own font.
    await concept.apply({ item: "alice-bio", template: poster });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: poster, layout: "Poster", font: "Handwritten", palette: "Forest" },
    ]);

    expect(await concept.reset({ item: "alice-bio" })).toEqual({ item: "alice-bio" });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: poster, layout: "Poster", font: "Display", palette: "Forest" },
    ]);

    // An item nobody touched still shows the default.
    expect(await concept._look({ item: "bob-bio" })).toEqual(lookOf(classic, CLASSIC));
  });
});

describe("Templating refusals", () => {
  test("a blank or too-long name, layout, font, or palette is refused by define, and nothing is saved", async () => {
    const concept = templating();
    for (const value of ["", "   ", "x".repeat(65)]) {
      const name = await refusal(() => concept.define({ ...CLASSIC, name: value }));
      expect(name).toBeInstanceOf(InvalidTemplateName);
      expect(name.message).toBe("A template name must not be blank and must be at most 64 characters.");

      const layout = await refusal(() => concept.define({ ...CLASSIC, layout: value }));
      expect(layout).toBeInstanceOf(InvalidLookLayout);
      expect(layout.message).toBe("A layout must not be blank and must be at most 64 characters.");

      const font = await refusal(() => concept.define({ ...CLASSIC, font: value }));
      expect(font).toBeInstanceOf(InvalidLookFont);
      expect(font.message).toBe("A font must not be blank and must be at most 64 characters.");

      const palette = await refusal(() => concept.define({ ...CLASSIC, palette: value }));
      expect(palette).toBeInstanceOf(InvalidLookPalette);
      expect(palette.message).toBe("A palette must not be blank and must be at most 64 characters.");
    }
    // With several problems, the first of name, layout, font, palette is the one reported.
    expect(await refusal(() => concept.define({ name: "", layout: "", font: "", palette: "" }))).toBeInstanceOf(
      InvalidTemplateName,
    );
    expect(await refusal(() => concept.define({ ...CLASSIC, layout: "", font: "", palette: "" }))).toBeInstanceOf(
      InvalidLookLayout,
    );
    expect(await refusal(() => concept.define({ ...CLASSIC, font: "", palette: "" }))).toBeInstanceOf(InvalidLookFont);
    expect(await concept._templates({})).toEqual([]);

    // 64 characters is still accepted.
    const long = "x".repeat(64);
    const { template } = await concept.define({ name: long, layout: long, font: long, palette: long });
    expect(await concept._templates({})).toEqual([
      { template, name: long, layout: long, font: long, palette: long, default: false },
    ]);
  });

  test("a name another template has is refused, and the first template is unchanged", async () => {
    const concept = templating();
    const { template } = await concept.define(CLASSIC);

    const error = await refusal(() => concept.define({ ...POSTER, name: "Classic" }));
    expect(error).toBeInstanceOf(TemplateNameTaken);
    expect(error.message).toBe("Another template already has that name.");
    // A blank layout, font, or palette is reported before the name being taken.
    expect(await refusal(() => concept.define({ ...POSTER, name: "Classic", palette: "" }))).toBeInstanceOf(
      InvalidLookPalette,
    );

    expect(await concept._templates({})).toEqual([{ template, ...CLASSIC, default: false }]);
  });

  test("an unknown template is refused by revise, makeDefault, retire, and apply, and nothing is saved", async () => {
    const concept = templating("missing");
    for (const run of [
      () => concept.revise({ template: unknown, font: "Sans", palette: "Ocean" }),
      // An unknown template is checked before the font and palette.
      () => concept.revise({ template: unknown, font: "", palette: "" }),
      () => concept.makeDefault({ template: unknown }),
      () => concept.retire({ template: unknown }),
      () => concept.apply({ item: "alice-bio", template: unknown }),
    ]) {
      const error = await refusal(run);
      expect(error).toBeInstanceOf(TemplateNotFound);
      expect(error.message).toBe("There is no such template.");
    }
    expect(await concept._templates({})).toEqual([]);
    expect(await concept._styled({ item: "alice-bio" })).toEqual({ styled: false });

    // A template defined later with that very identity is as defined: not revised, not the default, and not
    // applied to the item.
    const { template } = await concept.define(CLASSIC);
    expect(template).toBe(unknown);
    expect(await concept._templates({})).toEqual([{ template, ...CLASSIC, default: false }]);
    expect(await concept._look({ item: "alice-bio" })).toEqual([]);
  });

  test("a blank or too-long font or palette is refused by revise, setFont, and setPalette, and nothing changes", async () => {
    const concept = templating();
    const { template } = await concept.define(CLASSIC);
    for (const value of ["", "   ", "x".repeat(65)]) {
      for (const run of [
        () => concept.revise({ template, font: value, palette: "Ocean" }),
        () => concept.setFont({ item: "alice-bio", font: value }),
      ]) {
        const error = await refusal(run);
        expect(error).toBeInstanceOf(InvalidLookFont);
        expect(error.message).toBe("A font must not be blank and must be at most 64 characters.");
      }
      for (const run of [
        () => concept.revise({ template, font: "Sans", palette: value }),
        () => concept.setPalette({ item: "alice-bio", palette: value }),
      ]) {
        const error = await refusal(run);
        expect(error).toBeInstanceOf(InvalidLookPalette);
        expect(error.message).toBe("A palette must not be blank and must be at most 64 characters.");
      }
    }
    // With both wrong, revise reports the font.
    expect(await refusal(() => concept.revise({ template, font: "", palette: "" }))).toBeInstanceOf(InvalidLookFont);

    // The accepted half of a refused revise was not saved, and the item has nothing of its own.
    expect(await concept._templates({})).toEqual([{ template, ...CLASSIC, default: false }]);
    expect(await concept._styled({ item: "alice-bio" })).toEqual({ styled: false });

    // 64 characters is still accepted.
    const long = "x".repeat(64);
    await concept.revise({ template, font: long, palette: long });
    await concept.setFont({ item: "alice-bio", font: long });
    await concept.setPalette({ item: "alice-bio", palette: long });
    await concept.makeDefault({ template });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template, layout: "Two columns", font: long, palette: long },
    ]);
  });

  test("making the default template the default again is refused, and it stays the only default", async () => {
    const concept = templating();
    const { classic, card } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });

    const error = await refusal(() => concept.makeDefault({ template: classic }));
    expect(error).toBeInstanceOf(TemplateAlreadyDefault);
    expect(error.message).toBe("That template is already the default.");
    expect((await concept._templates({})).filter((row) => row.default).map((row) => row.template)).toEqual([classic]);

    // A template that stopped being the default can be made the default again.
    await concept.makeDefault({ template: card });
    expect(await concept.makeDefault({ template: classic })).toEqual({ template: classic });
  });

  test("retiring the default template or a template an item uses is refused, and the default is checked first", async () => {
    const concept = templating();
    const { classic, card } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    await concept.apply({ item: "alice-bio", template: card });
    // Classic is both the default and in use.
    await concept.apply({ item: "bob-bio", template: classic });

    const isDefault = await refusal(() => concept.retire({ template: classic }));
    expect(isDefault).toBeInstanceOf(TemplateIsDefault);
    expect(isDefault.message).toBe("The default template cannot be retired.");

    const inUse = await refusal(() => concept.retire({ template: card }));
    expect(inUse).toBeInstanceOf(TemplateInUse);
    expect(inUse.message).toBe("A template that an item uses cannot be retired.");

    expect((await concept._templates({})).map(({ name }) => name)).toEqual(["Card", "Classic", "Poster"]);
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(card, CARD));
    expect(await concept._look({ item: "bob-bio" })).toEqual(lookOf(classic, CLASSIC));
  });

  test("applying the template an item already has is refused, and its look is unchanged", async () => {
    const concept = templating();
    const { classic, card } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    await concept.apply({ item: "alice-bio", template: card });
    await concept.setFont({ item: "alice-bio", font: "Handwritten" });

    const error = await refusal(() => concept.apply({ item: "alice-bio", template: card }));
    expect(error).toBeInstanceOf(TemplateAlreadyApplied);
    expect(error.message).toBe("The item already has this template.");
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Handwritten", palette: "Ocean" },
    ]);

    // Another item can apply the same template, and an item that only shows the default can apply it.
    expect(await concept.apply({ item: "bob-bio", template: card })).toEqual({ item: "bob-bio", template: card });
    expect(await concept.apply({ item: "carol-bio", template: classic })).toEqual({
      item: "carol-bio",
      template: classic,
    });
    expect(await refusal(() => concept.apply({ item: "carol-bio", template: classic }))).toBeInstanceOf(
      TemplateAlreadyApplied,
    );
  });

  test("resetting an item with no font or palette of its own is refused, including a second reset", async () => {
    const concept = templating();
    const { card } = await threeTemplates(concept);

    const error = await refusal(() => concept.reset({ item: "alice-bio" }));
    expect(error).toBeInstanceOf(LookNotCustomized);
    expect(error.message).toBe("The item has no font or palette of its own.");
    expect(await concept._styled({ item: "alice-bio" })).toEqual({ styled: false });

    // A template alone is not a font or palette of its own, and the refused reset keeps the template.
    await concept.apply({ item: "alice-bio", template: card });
    expect(await refusal(() => concept.reset({ item: "alice-bio" }))).toBeInstanceOf(LookNotCustomized);
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(card, CARD));

    await concept.setPalette({ item: "alice-bio", palette: "Midnight" });
    await concept.reset({ item: "alice-bio" });
    expect(await refusal(() => concept.reset({ item: "alice-bio" }))).toBeInstanceOf(LookNotCustomized);
  });

  test("removing the look of an item with nothing chosen is refused, including a second removal", async () => {
    const concept = templating();
    const error = await refusal(() => concept.remove({ item: "alice-bio" }));
    expect(error).toBeInstanceOf(LookNotSet);
    expect(error.message).toBe("The item has no template, font, or palette.");

    await concept.setFont({ item: "alice-bio", font: "Handwritten" });
    expect(await concept.remove({ item: "alice-bio" })).toEqual({ item: "alice-bio" });
    expect(await refusal(() => concept.remove({ item: "alice-bio" }))).toBeInstanceOf(LookNotSet);

    // An item whose only choices were a font and a palette has nothing left after a reset.
    await concept.setFont({ item: "bob-bio", font: "Handwritten" });
    await concept.setPalette({ item: "bob-bio", palette: "Midnight" });
    await concept.reset({ item: "bob-bio" });
    expect(await refusal(() => concept.remove({ item: "bob-bio" }))).toBeInstanceOf(LookNotSet);
  });
});

describe("Templating looks", () => {
  test("with no default and no template applied there is no look, even for an item with its own font and palette", async () => {
    const concept = templating();
    const { classic } = await threeTemplates(concept);
    expect(await concept._look({ item: "alice-bio" })).toEqual([]);

    await concept.setFont({ item: "alice-bio", font: "Handwritten" });
    await concept.setPalette({ item: "alice-bio", palette: "Midnight" });
    expect(await concept._look({ item: "alice-bio" })).toEqual([]);

    // Once there is a default, the item shows it with the choices made earlier.
    await concept.makeDefault({ template: classic });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: classic, layout: "Two columns", font: "Handwritten", palette: "Midnight" },
    ]);
  });

  test("revising a template changes the look of every item that uses it, but not an item's own font", async () => {
    const concept = templating();
    const { classic, card, poster } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    await concept.apply({ item: "alice-bio", template: card });
    await concept.apply({ item: "bob-bio", template: card });
    await concept.setFont({ item: "bob-bio", font: "Handwritten" });

    expect(await concept.revise({ template: card, font: "Rounded", palette: "Dusk" })).toEqual({ template: card });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Rounded", palette: "Dusk" },
    ]);
    expect(await concept._look({ item: "bob-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Handwritten", palette: "Dusk" },
    ]);

    // Revising the default changes the items that applied nothing.
    await concept.revise({ template: classic, font: "Slab", palette: "Dawn" });
    expect(await concept._look({ item: "carol-bio" })).toEqual([
      { template: classic, layout: "Two columns", font: "Slab", palette: "Dawn" },
    ]);

    // Names and layouts stay, and the template nobody revised is untouched.
    expect(await concept._templates({})).toEqual([
      { template: card, name: "Card", layout: "Single card", font: "Rounded", palette: "Dusk", default: false },
      { template: classic, name: "Classic", layout: "Two columns", font: "Slab", palette: "Dawn", default: true },
      { template: poster, ...POSTER, default: false },
    ]);
  });

  test("a template can be retired once it is neither the default nor in use, and its name is free again", async () => {
    const concept = templating("classic", "card", "poster", "card-again");
    const { classic, card, poster } = await threeTemplates(concept);
    await concept.makeDefault({ template: card });
    await concept.apply({ item: "alice-bio", template: card });
    await concept.apply({ item: "bob-bio", template: card });
    // A font alone uses no template, so it never stands in the way.
    await concept.setFont({ item: "carol-bio", font: "Handwritten" });

    expect(await refusal(() => concept.retire({ template: card }))).toBeInstanceOf(TemplateIsDefault);
    await concept.makeDefault({ template: classic });
    expect(await refusal(() => concept.retire({ template: card }))).toBeInstanceOf(TemplateInUse);
    // One item switches to another template; the other still uses it.
    await concept.apply({ item: "alice-bio", template: poster });
    expect(await refusal(() => concept.retire({ template: card }))).toBeInstanceOf(TemplateInUse);
    await concept.remove({ item: "bob-bio" });

    expect(await concept.retire({ template: card })).toEqual({ template: card });
    expect((await concept._templates({})).map(({ name }) => name)).toEqual(["Classic", "Poster"]);
    expect(await refusal(() => concept.retire({ template: card }))).toBeInstanceOf(TemplateNotFound);
    expect(await refusal(() => concept.apply({ item: "bob-bio", template: card }))).toBeInstanceOf(TemplateNotFound);
    // The other templates and the items are as they were.
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(poster, POSTER));
    expect(await concept._look({ item: "bob-bio" })).toEqual(lookOf(classic, CLASSIC));

    const again = await concept.define(CARD);
    expect(again.template).toBe("card-again" as Template);
    expect((await concept._templates({})).map(({ name }) => name)).toEqual(["Card", "Classic", "Poster"]);
  });

  test("removing an item's look clears its template, font, and palette, so it shows the default again", async () => {
    const concept = templating();
    const { classic, card, poster } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    await concept.apply({ item: "alice-bio", template: card });
    await concept.setFont({ item: "alice-bio", font: "Handwritten" });
    await concept.setPalette({ item: "alice-bio", palette: "Midnight" });
    await concept.apply({ item: "bob-bio", template: card });
    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Handwritten", palette: "Midnight" },
    ]);

    expect(await concept.remove({ item: "alice-bio" })).toEqual({ item: "alice-bio" });
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(classic, CLASSIC));
    // The other item keeps its template.
    expect(await concept._look({ item: "bob-bio" })).toEqual(lookOf(card, CARD));

    // The font and palette removed do not come back with a later template.
    await concept.apply({ item: "alice-bio", template: poster });
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(poster, POSTER));
  });

  test("making another template the default changes only the items with no template applied", async () => {
    const concept = templating();
    const { classic, card, poster } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    await concept.apply({ item: "alice-bio", template: card });
    // Bob applied no template and has a palette of his own.
    await concept.setPalette({ item: "bob-bio", palette: "Midnight" });

    expect(await concept.makeDefault({ template: poster })).toEqual({ template: poster });
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(card, CARD));
    expect(await concept._look({ item: "bob-bio" })).toEqual([
      { template: poster, layout: "Poster", font: "Display", palette: "Midnight" },
    ]);
    expect(await concept._look({ item: "carol-bio" })).toEqual(lookOf(poster, POSTER));
    expect((await concept._templates({})).filter((row) => row.default).map((row) => row.template)).toEqual([poster]);
  });

  test("a reset removes both the font and the palette and keeps the template; with no template the default shows", async () => {
    const concept = templating();
    const { classic, card } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    await concept.apply({ item: "alice-bio", template: card });
    await concept.setFont({ item: "alice-bio", font: "Handwritten" });
    await concept.setPalette({ item: "alice-bio", palette: "Midnight" });

    await concept.reset({ item: "alice-bio" });
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(card, CARD));

    // A palette alone is enough to reset.
    await concept.setPalette({ item: "alice-bio", palette: "Midnight" });
    expect(await concept.reset({ item: "alice-bio" })).toEqual({ item: "alice-bio" });
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(card, CARD));

    // An item with a font and no template goes back to the plain default.
    await concept.setFont({ item: "bob-bio", font: "Handwritten" });
    expect(await concept._look({ item: "bob-bio" })).toEqual([
      { template: classic, layout: "Two columns", font: "Handwritten", palette: "Sunset" },
    ]);
    expect(await concept.reset({ item: "bob-bio" })).toEqual({ item: "bob-bio" });
    expect(await concept._look({ item: "bob-bio" })).toEqual(lookOf(classic, CLASSIC));
  });

  test("setting a font or palette again replaces the earlier one, and the same value is accepted twice", async () => {
    const concept = templating();
    const { classic } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });

    await concept.setFont({ item: "alice-bio", font: "Handwritten" });
    await concept.setFont({ item: "alice-bio", font: "Rounded" });
    expect(await concept.setFont({ item: "alice-bio", font: "Rounded" })).toEqual({ item: "alice-bio" });
    await concept.setPalette({ item: "alice-bio", palette: "Midnight" });
    expect(await concept.setPalette({ item: "alice-bio", palette: "Dusk" })).toEqual({ item: "alice-bio" });

    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: classic, layout: "Two columns", font: "Rounded", palette: "Dusk" },
    ]);
  });
});

describe("Templating queries", () => {
  test("templates are listed by name with the default marked, and there are no rows before any is defined", async () => {
    const concept = templating("t1", "t2", "t3", "t4");
    expect(await concept._templates({})).toEqual([]);

    await concept.define(POSTER);
    // Names that differ only in case are different names, and the capital comes first.
    await concept.define({ ...CARD, name: "card" });
    await concept.define(CLASSIC);
    await concept.define(CARD);

    expect(await concept._templates({})).toEqual([
      { template: "t4" as Template, ...CARD, default: false },
      { template: "t2" as Template, ...CARD, name: "card", default: false },
      { template: "t3" as Template, ...CLASSIC, default: false },
      { template: "t1" as Template, ...POSTER, default: false },
    ]);

    await concept.makeDefault({ template: "t3" as Template });
    expect((await concept._templates({})).map((row) => [row.name, row.default])).toEqual([
      ["Card", false],
      ["card", false],
      ["Classic", true],
      ["Poster", false],
    ]);
  });

  test("styled says whether an item has a template, font, or palette, which is when its look can be removed", async () => {
    const concept = templating();
    const { classic, card } = await threeTemplates(concept);
    await concept.makeDefault({ template: classic });
    // Showing the default look is not a choice of the item's.
    expect(await concept._look({ item: "alice-bio" })).toEqual(lookOf(classic, CLASSIC));
    expect(await concept._styled({ item: "alice-bio" })).toEqual({ styled: false });

    await concept.apply({ item: "alice-bio", template: card });
    await concept.setFont({ item: "bob-bio", font: "Handwritten" });
    await concept.setPalette({ item: "carol-bio", palette: "Midnight" });
    for (const item of ["alice-bio", "bob-bio", "carol-bio"]) {
      expect(await concept._styled({ item })).toEqual({ styled: true });
    }

    // A reset leaves a template in place, and leaves nothing for an item that had only a font.
    await concept.setFont({ item: "alice-bio", font: "Handwritten" });
    await concept.reset({ item: "alice-bio" });
    await concept.reset({ item: "bob-bio" });
    expect(await concept._styled({ item: "alice-bio" })).toEqual({ styled: true });
    expect(await concept._styled({ item: "bob-bio" })).toEqual({ styled: false });

    await concept.remove({ item: "alice-bio" });
    await concept.remove({ item: "carol-bio" });
    expect(await concept._styled({ item: "alice-bio" })).toEqual({ styled: false });
    expect(await concept._styled({ item: "carol-bio" })).toEqual({ styled: false });
  });
});

describe("Templating at the same moment", () => {
  test("of two templates defined with one name at once, one is refused", async () => {
    // Two instances stand in for two requests that each find the name free.
    const results = await Promise.allSettled([templating().define(CLASSIC), templating().define(CLASSIC)]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const refused = results.find(({ status }) => status === "rejected") as PromiseRejectedResult;
    expect(refused.reason).toBeInstanceOf(TemplateNameTaken);
    expect((await templating()._templates({})).map(({ name }) => name)).toEqual(["Classic"]);
  });

  test("templates made the default at once leave exactly one default", async () => {
    const concept = templating();
    const { classic, card, poster } = await threeTemplates(concept);
    await Promise.all([classic, card, poster].map((template) => concept.makeDefault({ template })));

    const marked = (await concept._templates({})).filter((row) => row.default);
    expect(marked).toHaveLength(1);
    const { template, layout, font, palette } = marked[0]!;
    expect(await concept._look({ item: "alice-bio" })).toEqual([{ template, layout, font, palette }]);
  });

  test("a template, a font, and a palette chosen at once for a new item are all kept", async () => {
    const concept = templating();
    const { card } = await threeTemplates(concept);
    await Promise.all([
      concept.apply({ item: "alice-bio", template: card }),
      concept.setFont({ item: "alice-bio", font: "Handwritten" }),
      concept.setPalette({ item: "alice-bio", palette: "Midnight" }),
    ]);

    expect(await concept._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Handwritten", palette: "Midnight" },
    ]);
  });
});

describe("Templating storage", () => {
  test("templates, the default, and what items chose survive a new instance on the same database", async () => {
    const { template: classic } = await templating().define(CLASSIC);
    const { template: card } = await templating().define(CARD);
    await templating().makeDefault({ template: classic });
    await templating().apply({ item: "alice-bio", template: card });
    await templating().setFont({ item: "alice-bio", font: "Handwritten" });

    // A new instance stands in for the server after a restart.
    const restarted = templating();
    expect(await restarted._templates({})).toEqual([
      { template: card, ...CARD, default: false },
      { template: classic, ...CLASSIC, default: true },
    ]);
    expect(await restarted._look({ item: "alice-bio" })).toEqual([
      { template: card, layout: "Single card", font: "Handwritten", palette: "Ocean" },
    ]);
    expect(await restarted._look({ item: "bob-bio" })).toEqual(lookOf(classic, CLASSIC));

    expect(await refusal(() => restarted.define(CLASSIC))).toBeInstanceOf(TemplateNameTaken);
    expect(await refusal(() => restarted.makeDefault({ template: classic }))).toBeInstanceOf(TemplateAlreadyDefault);
    expect(await refusal(() => restarted.apply({ item: "alice-bio", template: card }))).toBeInstanceOf(
      TemplateAlreadyApplied,
    );
    expect(await refusal(() => restarted.retire({ template: card }))).toBeInstanceOf(TemplateInUse);
  });

  test("two instances of the concept keep separate templates, defaults, and items", async () => {
    const bios = new TemplatingConcept<string>(database(), "BioTemplating");
    const posts = new TemplatingConcept<string>(database(), "PostTemplating");
    const { template } = await bios.define(CLASSIC);
    await bios.makeDefault({ template });
    await bios.setFont({ item: "alice", font: "Handwritten" });

    expect(await posts._templates({})).toEqual([]);
    expect(await posts._look({ item: "alice" })).toEqual([]);
    expect(await posts._styled({ item: "alice" })).toEqual({ styled: false });
    expect(await refusal(() => posts.apply({ item: "alice", template }))).toBeInstanceOf(TemplateNotFound);
    expect(await refusal(() => posts.remove({ item: "alice" }))).toBeInstanceOf(LookNotSet);

    // The other instance may use the same name, and that changes nothing in the first.
    const other = await posts.define({ ...POSTER, name: "Classic" });
    expect(await posts._templates({})).toEqual([{ template: other.template, ...POSTER, name: "Classic", default: false }]);
    expect(await bios._templates({})).toEqual([{ template, ...CLASSIC, default: true }]);
    expect(await bios._look({ item: "alice" })).toEqual([
      { template, layout: "Two columns", font: "Handwritten", palette: "Sunset" },
    ]);
  });
});
