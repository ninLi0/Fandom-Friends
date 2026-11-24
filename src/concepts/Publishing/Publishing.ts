import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class HandleAlreadyClaimed extends Error {}
export class InvalidHandle extends Error {}
export class HandleTaken extends Error {}
export class HandleRequired extends Error {}
export class AlreadyPublished extends Error {}
export class NothingPublished extends Error {}
export class AlreadyListed extends Error {}
export class NotListed extends Error {}
export class NoHandle extends Error {}
export class StillPublished extends Error {}

/**
 * One user who has a handle, with their publication if they have one. A publisher always has a handle,
 * so the publication lives in its publisher's document, and every action is a single write.
 */
interface UserDocument {
  /** The user, who is also the publisher. */
  _id: string;
  handle: string;
  /** The one item this user has published. Absent while they have published nothing. */
  item?: string;
  /** When the publication was listed. Absent while it is not listed, and never present without an item. */
  listedOn?: Date;
}

const HANDLE_ALREADY_CLAIMED = "You already have a handle.";
const ALREADY_PUBLISHED = "That item is already published.";
const NOTHING_PUBLISHED = "You have not published anything.";

function validHandle(handle: string): boolean {
  return typeof handle === "string" && /^[a-z0-9-]{3,30}$/.test(handle);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Lets a person choose which one of their items is public, and how far it travels. */
export class PublishingConcept<User extends string = string, Item extends string = string> {
  private readonly users: Collection<UserDocument>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    database: Db,
    name = "Publishing",
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.users = database.collection(`${name.toLowerCase()}.users`);
  }

  /** Creates the indexes once. If creating them fails, the next action tries again. */
  #ready() {
    this.indexes ??= Promise.all([
      this.users.createIndex({ handle: 1 }, { unique: true }),
      // Only documents that have an item are indexed, so any number of users may have nothing published.
      this.users.createIndex({ item: 1 }, { unique: true, partialFilterExpression: { item: { $exists: true } } }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async #hasHandle(user: User): Promise<boolean> {
    return (await this.users.countDocuments({ _id: user }, { limit: 1 })) === 1;
  }

  async claim({ user, handle }: { user: User; handle: string }) {
    if (await this.#hasHandle(user)) throw new HandleAlreadyClaimed(HANDLE_ALREADY_CLAIMED);
    if (!validHandle(handle)) {
      throw new InvalidHandle("A handle must be 3 to 30 lowercase letters, digits, or hyphens.");
    }
    await this.#ready();
    try {
      await this.users.insertOne({ _id: user, handle });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      // Either someone else has this handle, or this user claimed one since the check above.
      if (await this.#hasHandle(user)) throw new HandleAlreadyClaimed(HANDLE_ALREADY_CLAIMED);
      throw new HandleTaken("That handle is already taken.");
    }
    return { user, handle };
  }

  async publish({ publisher, item }: { publisher: User; item: Item }) {
    await this.#ready();
    let before: UserDocument | null;
    try {
      // One write puts item in place of any earlier one and leaves listedOn as it was.
      before = await this.users.findOneAndUpdate({ _id: publisher }, { $set: { item } }, { returnDocument: "before" });
    } catch (error) {
      // The unique index on item refused the write: someone else has published it.
      if (isDuplicateKey(error)) throw new AlreadyPublished(ALREADY_PUBLISHED);
      throw error;
    }
    if (before === null) throw new HandleRequired("You need a handle before you can publish.");
    // The write found item already there, so it changed nothing.
    if (before.item === item) throw new AlreadyPublished(ALREADY_PUBLISHED);
    return { publisher, item };
  }

  async list({ publisher }: { publisher: User }) {
    const now = this.clock();
    // The update keeps a listedOn that is already there, so listing a second time changes nothing.
    const before = await this.users.findOneAndUpdate(
      { _id: publisher, item: { $exists: true } },
      [{ $set: { listedOn: { $ifNull: ["$listedOn", now] } } }],
      { returnDocument: "before" },
    );
    if (before === null) throw new NothingPublished(NOTHING_PUBLISHED);
    if (before.listedOn !== undefined) throw new AlreadyListed("Your published item is already listed.");
    return { publisher };
  }

  async unlist({ publisher }: { publisher: User }) {
    const unlisted = await this.users.updateOne(
      { _id: publisher, listedOn: { $exists: true } },
      { $unset: { listedOn: "" } },
    );
    if (unlisted.matchedCount === 0) throw new NotListed("You have nothing listed.");
    return { publisher };
  }

  async unpublish({ publisher }: { publisher: User }) {
    // One write removes the item and its listing together.
    const before = await this.users.findOneAndUpdate(
      { _id: publisher, item: { $exists: true } },
      { $unset: { item: "", listedOn: "" } },
      { returnDocument: "before" },
    );
    if (before === null || before.item === undefined) throw new NothingPublished(NOTHING_PUBLISHED);
    return { publisher, item: before.item as Item };
  }

  async release({ user }: { user: User }) {
    // The filter makes the check and the removal one write, so a publish cannot land between them.
    const released = await this.users.deleteOne({ _id: user, item: { $exists: false } });
    if (released.deletedCount === 0) {
      // Nothing was removed: either there is no handle, or something is still published.
      if (await this.#hasHandle(user)) throw new StillPublished("Unpublish your item before you release your handle.");
      throw new NoHandle("You do not have a handle.");
    }
    return { user };
  }

  async _byHandle({ handle }: { handle: string }): Promise<Array<{ user: User }>> {
    // A handle that could never be claimed belongs to nobody.
    if (!validHandle(handle)) return [];
    const found = await this.users.findOne({ handle });
    return found === null ? [] : [{ user: found._id as User }];
  }

  async _handle({ user }: { user: User }): Promise<Array<{ handle: string }>> {
    const found = await this.users.findOne({ _id: user });
    return found === null ? [] : [{ handle: found.handle }];
  }

  async _published({ publisher }: { publisher: User }): Promise<Array<{ item: Item; listed: boolean }>> {
    const found = await this.users.findOne({ _id: publisher });
    if (found === null || found.item === undefined) return [];
    return [{ item: found.item as Item, listed: found.listedOn !== undefined }];
  }

  async _publisherOf({ item }: { item: Item }): Promise<Array<{ publisher: User }>> {
    const found = await this.users.findOne({ item });
    return found === null ? [] : [{ publisher: found._id as User }];
  }

  async _listed(_: Record<string, never>): Promise<Array<{ publisher: User; item: Item; listedOn: Date }>> {
    const found = await this.users.find({ listedOn: { $exists: true } }).toArray();
    const rows: Array<{ publisher: User; item: Item; listedOn: Date }> = [];
    for (const { _id, item, listedOn } of found) {
      if (item !== undefined && listedOn !== undefined) rows.push({ publisher: _id as User, item: item as Item, listedOn });
    }
    // Newest first, then by publisher identity.
    return rows.sort(
      (left, right) =>
        right.listedOn.getTime() - left.listedOn.getTime() || compareText(left.publisher, right.publisher),
    );
  }
}
