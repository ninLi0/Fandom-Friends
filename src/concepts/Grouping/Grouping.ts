import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class GroupSameItem extends Error {}
export class GroupAlreadyPlaced extends Error {}
export class GroupCycle extends Error {}
export class GroupNotPlaced extends Error {}

/** One item placed directly under one parent. The pair is unique. */
interface PlacedDocument<Item> {
  item: Item;
  parent: Item;
}

const ALREADY_PLACED = "The item is already placed under this parent.";
const CYCLE = "The item cannot be placed under a parent that already lies under it.";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Every placement, readable in both directions. */
interface Placements<Item> {
  parentsOf: Map<Item, Item[]>;
  childrenOf: Map<Item, Item[]>;
}

/**
 * Every item reached from `start` by following `next` any number of steps, each once, with whether it is one
 * step away. `start` itself is never among them. Each item is visited once, so the walk ends even if the
 * stored placements hold a cycle.
 */
function reach<Item>(start: Item, next: Map<Item, Item[]>): Map<Item, boolean> {
  const direct = new Set(next.get(start) ?? []);
  const reached = new Map<Item, boolean>();
  const waiting = [...direct];
  for (let current = waiting.pop(); current !== undefined; current = waiting.pop()) {
    if (current === start || reached.has(current)) continue;
    reached.set(current, direct.has(current));
    waiting.push(...(next.get(current) ?? []));
  }
  return reached;
}

/** Lets a specific thing count as part of the broader things it belongs to. */
export class GroupingConcept<Item extends string = string> {
  private readonly placed: Collection<PlacedDocument<Item>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Grouping") {
    this.placed = database.collection(`${name.toLowerCase()}.placed`);
  }

  /** Creates the index once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.placed.createIndex({ item: 1, parent: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  /** Reads every placement. There are a few hundred at most, so walking them in memory is simpler than a graph query. */
  async #placements(): Promise<Placements<Item>> {
    const parentsOf = new Map<Item, Item[]>();
    const childrenOf = new Map<Item, Item[]>();
    const add = (lists: Map<Item, Item[]>, from: Item, to: Item) => {
      const list = lists.get(from);
      if (list === undefined) lists.set(from, [to]);
      else list.push(to);
    };
    for (const { item, parent } of await this.placed.find().toArray()) {
      add(parentsOf, item, parent);
      add(childrenOf, parent, item);
    }
    return { parentsOf, childrenOf };
  }

  async place({ item, parent }: { item: Item; parent: Item }) {
    if (item === parent) throw new GroupSameItem("An item cannot be placed under itself.");
    await this.#ready();
    const before = await this.#placements();
    if (before.parentsOf.get(item)?.includes(parent)) throw new GroupAlreadyPlaced(ALREADY_PLACED);
    if (reach(parent, before.parentsOf).has(item)) throw new GroupCycle(CYCLE);

    let saved;
    try {
      saved = await this.placed.insertOne({ item, parent } as PlacedDocument<Item>);
    } catch (error) {
      if (isDuplicateKey(error)) throw new GroupAlreadyPlaced(ALREADY_PLACED);
      throw error;
    }

    // There are no transactions, so another placement may have been saved since the first read. Reading again
    // after saving means that of several placements that would close a cycle together, the last to look sees
    // all of them and takes its own back. If the server stops between the two writes, the cycle stays, and
    // every walk still ends.
    const after = await this.#placements();
    if (reach(parent, after.parentsOf).has(item)) {
      await this.placed.deleteOne({ _id: saved.insertedId });
      throw new GroupCycle(CYCLE);
    }
    return { item, parent };
  }

  async remove({ item, parent }: { item: Item; parent: Item }) {
    const removed = await this.placed.deleteOne({ item, parent } as PlacedDocument<Item>);
    if (removed.deletedCount === 0) throw new GroupNotPlaced("The item is not placed under this parent.");
    return { item, parent };
  }

  async _under({ item }: { item: Item }): Promise<Array<{ member: Item; direct: boolean }>> {
    const { childrenOf } = await this.#placements();
    return [...reach(item, childrenOf)]
      .map(([member, direct]) => ({ member, direct }))
      .sort((left, right) => compareText(left.member, right.member));
  }

  async _above({ item }: { item: Item }): Promise<Array<{ broader: Item; direct: boolean }>> {
    const { parentsOf } = await this.#placements();
    return [...reach(item, parentsOf)]
      .map(([broader, direct]) => ({ broader, direct }))
      .sort((left, right) => compareText(left.broader, right.broader));
  }

  async _top(_: Record<string, never>): Promise<Array<{ item: Item }>> {
    const { parentsOf, childrenOf } = await this.#placements();
    return [...childrenOf.keys()]
      .filter((item) => !parentsOf.has(item))
      .map((item) => ({ item }))
      .sort((left, right) => compareText(left.item, right.item));
  }
}
