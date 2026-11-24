import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class InvalidTemplateName extends Error {}
export class InvalidLookLayout extends Error {}
export class InvalidLookFont extends Error {}
export class InvalidLookPalette extends Error {}
export class TemplateNameTaken extends Error {}
export class TemplateNotFound extends Error {}
export class TemplateAlreadyDefault extends Error {}
export class TemplateIsDefault extends Error {}
export class TemplateInUse extends Error {}
export class TemplateAlreadyApplied extends Error {}
export class LookNotCustomized extends Error {}
export class LookNotSet extends Error {}

export type Template = string & { readonly __brand: "Template" };

interface TemplateDocument {
  _id: Template;
  name: string;
  layout: string;
  font: string;
  palette: string;
}

/** The one document that names the default template. While there is no such document, there is no default. */
interface DefaultDocument {
  _id: "default";
  template: Template;
}

/** What one item chose. A missing field is a part the item has not chosen. A document always has at least one. */
interface ItemDocument {
  _id: string;
  template?: Template;
  font?: string;
  palette?: string;
}

const INVALID_NAME = "A template name must not be blank and must be at most 64 characters.";
const INVALID_LAYOUT = "A layout must not be blank and must be at most 64 characters.";
const INVALID_FONT = "A font must not be blank and must be at most 64 characters.";
const INVALID_PALETTE = "A palette must not be blank and must be at most 64 characters.";
const NOT_FOUND = "There is no such template.";

const HAS_OWN_FONT_OR_PALETTE = [{ font: { $exists: true } }, { palette: { $exists: true } }];

function valid(text: string): boolean {
  return text.trim().length > 0 && text.length <= 64;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Name ignoring case, then name, then template identity. */
function byName(left: { template: Template; name: string }, right: { template: Template; name: string }): number {
  return (
    compareText(left.name.toLowerCase(), right.name.toLowerCase()) ||
    compareText(left.name, right.name) ||
    compareText(left.template, right.template)
  );
}

/** Lets a person give something a finished look by choosing a ready-made design. */
export class TemplatingConcept<Item extends string = string> {
  private readonly templates: Collection<TemplateDocument>;
  private readonly chosenDefault: Collection<DefaultDocument>;
  private readonly items: Collection<ItemDocument>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    database: Db,
    name = "Templating",
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {
    this.templates = database.collection(`${name.toLowerCase()}.templates`);
    this.chosenDefault = database.collection(`${name.toLowerCase()}.default`);
    this.items = database.collection(`${name.toLowerCase()}.items`);
  }

  /**
   * Creates the indexes once. If creating them fails, the next action tries again. Only `define` waits for
   * them: a template exists only after a `define`, so wherever a template is known the indexes are there.
   */
  #ready() {
    this.indexes ??= Promise.all([
      this.templates.createIndex({ name: 1 }, { unique: true }),
      this.items.createIndex({ template: 1 }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async #known(template: Template): Promise<boolean> {
    return (await this.templates.countDocuments({ _id: template }, { limit: 1 })) > 0;
  }

  /** The template named as the default, whether or not it still exists. */
  async #default(): Promise<Template | undefined> {
    return (await this.chosenDefault.findOne({ _id: "default" }))?.template;
  }

  /** The default template, or null when none is named or the one named no longer exists. */
  async #defaultTemplate(): Promise<TemplateDocument | null> {
    const template = await this.#default();
    return template === undefined ? null : await this.templates.findOne({ _id: template });
  }

  async define({ name, layout, font, palette }: { name: string; layout: string; font: string; palette: string }) {
    if (!valid(name)) throw new InvalidTemplateName(INVALID_NAME);
    if (!valid(layout)) throw new InvalidLookLayout(INVALID_LAYOUT);
    if (!valid(font)) throw new InvalidLookFont(INVALID_FONT);
    if (!valid(palette)) throw new InvalidLookPalette(INVALID_PALETTE);
    await this.#ready();
    const template = this.freshID() as Template;
    try {
      await this.templates.insertOne({ _id: template, name, layout, font, palette });
    } catch (error) {
      // The identity is fresh, so the repeated value is the name. The index also refuses the second of two
      // templates defined with one name at the same moment.
      if (isDuplicateKey(error)) throw new TemplateNameTaken("Another template already has that name.");
      throw error;
    }
    return { template };
  }

  async revise({ template, font, palette }: { template: Template; font: string; palette: string }) {
    if (!(await this.#known(template))) throw new TemplateNotFound(NOT_FOUND);
    if (!valid(font)) throw new InvalidLookFont(INVALID_FONT);
    if (!valid(palette)) throw new InvalidLookPalette(INVALID_PALETTE);
    const revised = await this.templates.updateOne({ _id: template }, { $set: { font, palette } });
    if (revised.matchedCount === 0) throw new TemplateNotFound(NOT_FOUND);
    return { template };
  }

  async makeDefault({ template }: { template: Template }) {
    if (!(await this.#known(template))) throw new TemplateNotFound(NOT_FOUND);
    // One write to one document names the default, so there are never two. If the template was already the
    // default, the write changed nothing.
    const before = await this.chosenDefault.findOneAndUpdate(
      { _id: "default" },
      { $set: { template } },
      { upsert: true, returnDocument: "before" },
    );
    if (before?.template === template) throw new TemplateAlreadyDefault("That template is already the default.");
    return { template };
  }

  async retire({ template }: { template: Template }) {
    if (!(await this.#known(template))) throw new TemplateNotFound(NOT_FOUND);
    if ((await this.#default()) === template) throw new TemplateIsDefault("The default template cannot be retired.");
    if ((await this.items.countDocuments({ template }, { limit: 1 })) > 0) {
      throw new TemplateInUse("A template that an item uses cannot be retired.");
    }
    // There are no transactions, so a template applied or made the default between the checks above and this
    // write is still removed. Whatever then names it is ignored: `_look` and `_templates` treat a template
    // that no longer exists as not chosen.
    const retired = await this.templates.deleteOne({ _id: template });
    if (retired.deletedCount === 0) throw new TemplateNotFound(NOT_FOUND);
    return { template };
  }

  async apply({ item, template }: { item: Item; template: Template }) {
    if (!(await this.#known(template))) throw new TemplateNotFound(NOT_FOUND);
    // If the item already had this template, the write changed nothing.
    const before = await this.items.findOneAndUpdate(
      { _id: item },
      { $set: { template } },
      { upsert: true, returnDocument: "before" },
    );
    if (before?.template === template) throw new TemplateAlreadyApplied("The item already has this template.");
    return { item, template };
  }

  async setFont({ item, font }: { item: Item; font: string }) {
    if (!valid(font)) throw new InvalidLookFont(INVALID_FONT);
    await this.items.updateOne({ _id: item }, { $set: { font } }, { upsert: true });
    return { item };
  }

  async setPalette({ item, palette }: { item: Item; palette: string }) {
    if (!valid(palette)) throw new InvalidLookPalette(INVALID_PALETTE);
    await this.items.updateOne({ _id: item }, { $set: { palette } }, { upsert: true });
    return { item };
  }

  async reset({ item }: { item: Item }) {
    // An item with no template has nothing left after a reset, so its document goes. Each write checks what it
    // needs in the same step, so no document is ever left with nothing in it.
    const emptied = await this.items.deleteOne({
      _id: item,
      template: { $exists: false },
      $or: HAS_OWN_FONT_OR_PALETTE,
    });
    if (emptied.deletedCount > 0) return { item };
    const reset = await this.items.updateOne(
      { _id: item, template: { $exists: true }, $or: HAS_OWN_FONT_OR_PALETTE },
      { $unset: { font: "", palette: "" } },
    );
    if (reset.matchedCount === 0) throw new LookNotCustomized("The item has no font or palette of its own.");
    return { item };
  }

  async remove({ item }: { item: Item }) {
    const removed = await this.items.deleteOne({ _id: item });
    if (removed.deletedCount === 0) throw new LookNotSet("The item has no template, font, or palette.");
    return { item };
  }

  async _templates(
    _: Record<string, never>,
  ): Promise<
    Array<{ template: Template; name: string; layout: string; font: string; palette: string; default: boolean }>
  > {
    const [found, chosen] = await Promise.all([this.templates.find().toArray(), this.#default()]);
    return found
      .map(({ _id, name, layout, font, palette }) => ({
        template: _id,
        name,
        layout,
        font,
        palette,
        default: _id === chosen,
      }))
      .sort(byName);
  }

  async _look({
    item,
  }: {
    item: Item;
  }): Promise<Array<{ template: Template; layout: string; font: string; palette: string }>> {
    const chosen = await this.items.findOne({ _id: item });
    // A template retired after the item applied it counts as not applied, and one retired after it was made
    // the default counts as no default.
    const template =
      (chosen?.template === undefined ? null : await this.templates.findOne({ _id: chosen.template })) ??
      (await this.#defaultTemplate());
    if (template === null) return [];
    return [
      {
        template: template._id,
        layout: template.layout,
        font: chosen?.font ?? template.font,
        palette: chosen?.palette ?? template.palette,
      },
    ];
  }

  async _styled({ item }: { item: Item }): Promise<{ styled: boolean }> {
    // An item has a document exactly while it has a template, a font, or a palette.
    return { styled: (await this.items.countDocuments({ _id: item }, { limit: 1 })) > 0 };
  }

  /** Reports only the item's own choices, so editors can preserve inheritance when saving. */
  async _overrides({ item }: { item: Item }): Promise<{ font: string | null; palette: string | null }> {
    const chosen = await this.items.findOne({ _id: item });
    return { font: chosen?.font ?? null, palette: chosen?.palette ?? null };
  }
}
