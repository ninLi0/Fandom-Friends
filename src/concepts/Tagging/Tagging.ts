import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class InvalidTagName extends Error {}
export class TagNotFound extends Error {}
export class TagAlreadyAdded extends Error {}
export class TagNotAdded extends Error {}

export type Tag = string & { readonly __brand: "Tag" };

interface TagDocument {
  _id: Tag;
  name: string;
}

/** One tag on one item. The pair is unique. */
interface AddedDocument<Item> {
  item: Item;
  tag: Tag;
}

const INVALID_NAME = "A tag name must not be blank and must be at most 64 characters.";
const NOT_FOUND = "There is no such tag.";

function validName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 64;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Name ignoring case, then name, then tag identity. */
function byName(left: { tag: Tag; name: string }, right: { tag: Tag; name: string }): number {
  return (
    compareText(left.name.toLowerCase(), right.name.toLowerCase()) ||
    compareText(left.name, right.name) ||
    compareText(left.tag, right.tag)
  );
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lets items be found by what they are about. */
export class TaggingConcept<Item extends string = string> {
  private readonly tags: Collection<TagDocument>;
  private readonly added: Collection<AddedDocument<Item>>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    database: Db,
    name = "Tagging",
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {
    this.tags = database.collection(`${name.toLowerCase()}.tags`);
    this.added = database.collection(`${name.toLowerCase()}.added`);
  }

  /** Creates the indexes once. If creating them fails, the next action tries again. */
  #ready() {
    this.indexes ??= Promise.all([
      this.added.createIndex({ item: 1, tag: 1 }, { unique: true }),
      this.added.createIndex({ tag: 1 }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async define({ name }: { name: string }) {
    if (!validName(name)) throw new InvalidTagName(INVALID_NAME);
    const tag = this.freshID() as Tag;
    await this.tags.insertOne({ _id: tag, name });
    return { tag };
  }

  async rename({ tag, name }: { tag: Tag; name: string }) {
    if ((await this.tags.countDocuments({ _id: tag }, { limit: 1 })) === 0) throw new TagNotFound(NOT_FOUND);
    if (!validName(name)) throw new InvalidTagName(INVALID_NAME);
    const renamed = await this.tags.updateOne({ _id: tag }, { $set: { name } });
    if (renamed.matchedCount === 0) throw new TagNotFound(NOT_FOUND);
    return { tag };
  }

  async retire({ tag }: { tag: Tag }) {
    // The tag goes first. If the second write fails, the leftover rows name a tag that no longer exists,
    // and every query ignores them.
    const retired = await this.tags.deleteOne({ _id: tag });
    if (retired.deletedCount === 0) throw new TagNotFound(NOT_FOUND);
    await this.added.deleteMany({ tag });
    return { tag };
  }

  async add({ item, tag }: { item: Item; tag: Tag }) {
    if ((await this.tags.countDocuments({ _id: tag }, { limit: 1 })) === 0) throw new TagNotFound(NOT_FOUND);
    await this.#ready();
    try {
      await this.added.insertOne({ item, tag } as AddedDocument<Item>);
    } catch (error) {
      if (isDuplicateKey(error)) throw new TagAlreadyAdded("The item already has this tag.");
      throw error;
    }
    return { item, tag };
  }

  async remove({ item, tag }: { item: Item; tag: Tag }) {
    const removed = await this.added.deleteOne({ item, tag } as AddedDocument<Item>);
    if (removed.deletedCount === 0) throw new TagNotAdded("The item does not have this tag.");
    return { item, tag };
  }

  async _suggest({ text }: { text: string }): Promise<Array<{ tag: Tag; name: string }>> {
    const found = await this.tags.find({ name: { $regex: escapeRegex(text), $options: "i" } }).toArray();
    return found.map(({ _id, name }) => ({ tag: _id, name })).sort(byName);
  }

  async _get({ tag }: { tag: Tag }): Promise<Array<{ name: string }>> {
    const found = await this.tags.findOne({ _id: tag });
    return found === null ? [] : [{ name: found.name }];
  }

  async _tagsOf({ item }: { item: Item }): Promise<Array<{ tag: Tag; name: string }>> {
    const rows = await this.added.find({ item } as AddedDocument<Item>).toArray();
    if (rows.length === 0) return [];
    // Reading the tags again leaves out any tag retired since it was added.
    const found = await this.tags.find({ _id: { $in: rows.map(({ tag }) => tag) } }).toArray();
    return found.map(({ _id, name }) => ({ tag: _id, name })).sort(byName);
  }

  async _itemsWith({ tag }: { tag: Tag }): Promise<Array<{ item: Item }>> {
    if ((await this.tags.countDocuments({ _id: tag }, { limit: 1 })) === 0) return [];
    const rows = await this.added.find({ tag }).toArray();
    return rows.map(({ item }) => ({ item })).sort((left, right) => compareText(left.item, right.item));
  }
}
