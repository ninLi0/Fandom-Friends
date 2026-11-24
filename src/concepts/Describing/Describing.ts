import type { Collection, Db } from "mongodb";

export class InvalidDescriptionName extends Error {}
export class InvalidDescriptionText extends Error {}

interface DescriptionDocument<Item> {
  _id: Item;
  name: string;
  text: string;
}

const INVALID_NAME = "A display name must not be blank and must be at most 60 characters.";
const INVALID_TEXT = "A description must be at most 280 characters.";

/** Keeps an item's public name and short description separately from its private identity. */
export class DescribingConcept<Item extends string = string> {
  private readonly descriptions: Collection<DescriptionDocument<Item>>;

  constructor(database: Db, name = "Describing") {
    this.descriptions = database.collection(`${name.toLowerCase()}.descriptions`);
  }

  async set({ item, name, text }: { item: Item; name: string; text: string }) {
    if (name.trim().length === 0 || name.length > 60) throw new InvalidDescriptionName(INVALID_NAME);
    if (text.length > 280) throw new InvalidDescriptionText(INVALID_TEXT);
    await this.descriptions.updateOne({ _id: item }, { $set: { name, text } }, { upsert: true });
    return { item };
  }

  /** Removing an absent description is harmless, including for an older item that never had one. */
  async remove({ item }: { item: Item }) {
    await this.descriptions.deleteOne({ _id: item });
    return { item };
  }

  /** Older items still produce a card; their public details stay empty until the owner supplies them. */
  async _get({ item }: { item: Item }): Promise<{ name: string; text: string }> {
    const found = await this.descriptions.findOne({ _id: item });
    return { name: found?.name ?? "", text: found?.text ?? "" };
  }
}
