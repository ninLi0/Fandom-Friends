import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class SynonymOfItself extends Error {}
export class SynonymAlreadyLinked extends Error {}
export class SynonymCanonicalLinked extends Error {}
export class SynonymIsCanonical extends Error {}
export class SynonymNotLinked extends Error {}

/** One item's canonical item. The item is the document's identity, so it has at most one. */
interface LinkDocument<Item> {
  _id: Item;
  canonical: Item;
}

const ALREADY_LINKED = "The item already has a canonical item.";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Lets several items that stand for the same thing be treated as one, without merging them. */
export class SynonymizingConcept<Item extends string = string> {
  private readonly links: Collection<LinkDocument<Item>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Synonymizing") {
    this.links = database.collection(`${name.toLowerCase()}.links`);
  }

  /** Creates the index once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.links.createIndex({ canonical: 1 }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  /** True when the item has a canonical item. */
  async #linked(item: Item): Promise<boolean> {
    return (await this.links.countDocuments({ _id: item }, { limit: 1 })) > 0;
  }

  async link({ item, canonical }: { item: Item; canonical: Item }) {
    if (item === canonical) throw new SynonymOfItself("An item cannot be its own canonical item.");
    await this.#ready();
    if (await this.#linked(item)) throw new SynonymAlreadyLinked(ALREADY_LINKED);
    if (await this.#linked(canonical)) {
      throw new SynonymCanonicalLinked("The canonical item has a canonical item of its own.");
    }
    if ((await this.links.countDocuments({ canonical: item }, { limit: 1 })) > 0) {
      throw new SynonymIsCanonical("The item is the canonical item of another item.");
    }
    // The link is one document, so it is saved whole or not at all.
    try {
      await this.links.insertOne({ _id: item, canonical });
    } catch (error) {
      if (isDuplicateKey(error)) throw new SynonymAlreadyLinked(ALREADY_LINKED);
      throw error;
    }
    return { item, canonical };
  }

  async unlink({ item }: { item: Item }) {
    const removed = await this.links.deleteOne({ _id: item });
    if (removed.deletedCount === 0) throw new SynonymNotLinked("The item has no canonical item.");
    return { item };
  }

  async _same({ item }: { item: Item }): Promise<Array<{ other: Item }>> {
    const { canonical } = await this._canonical({ item });
    // The items that share item's canonical item, and the items that have item as theirs.
    const linked = await this.links.find({ $or: [{ canonical }, { canonical: item }] }).toArray();
    const same = new Set<Item>([item, canonical, ...linked.map(({ _id }) => _id)]);
    return [...same].sort(compareText).map((other) => ({ other }));
  }

  async _canonical({ item }: { item: Item }): Promise<{ canonical: Item }> {
    const found = await this.links.findOne({ _id: item });
    return { canonical: found === null ? item : found.canonical };
  }
}
