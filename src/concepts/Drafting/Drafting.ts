import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class InvalidDraftName extends Error {}
export class DraftNameTaken extends Error {}
export class DraftNotFound extends Error {}

export type Draft = string & { readonly __brand: "Draft" };

/** One draft. The owner and name together are unique. */
interface DraftDocument<User> {
  _id: Draft;
  owner: User;
  name: string;
}

const INVALID_NAME = "A draft name must not be blank and must be at most 80 characters.";
const NAME_TAKEN = "The owner already has a draft with this name.";
const NOT_FOUND = "There is no such draft.";

/** A name is kept exactly as written, so nothing is trimmed. A name of nothing but whitespace is blank. */
function validName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 80;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Name ignoring case, then name, then draft identity. */
function byName(left: { draft: Draft; name: string }, right: { draft: Draft; name: string }): number {
  return (
    compareText(left.name.toLowerCase(), right.name.toLowerCase()) ||
    compareText(left.name, right.name) ||
    compareText(left.draft, right.draft)
  );
}

/** True when the write repeated an owner's name, and not when it repeated a draft identity. */
function repeatsName(error: unknown): boolean {
  if (!isDuplicateKey(error)) return false;
  const { keyPattern } = error as { keyPattern?: Record<string, unknown> };
  return keyPattern === undefined || !("_id" in keyPattern);
}

/** Lets a person keep several named versions of something. */
export class DraftingConcept<User extends string = string> {
  private readonly drafts: Collection<DraftDocument<User>>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    database: Db,
    name = "Drafting",
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {
    this.drafts = database.collection(`${name.toLowerCase()}.drafts`);
  }

  /** Creates the index once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.drafts.createIndex({ owner: 1, name: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async start({ owner, name }: { owner: User; name: string }) {
    if (!validName(name)) throw new InvalidDraftName(INVALID_NAME);
    await this.#ready();
    const draft = this.freshID() as Draft;
    try {
      // The index refuses a second draft with this owner and name, even when two requests arrive together.
      await this.drafts.insertOne({ _id: draft, owner, name } as DraftDocument<User>);
    } catch (error) {
      if (repeatsName(error)) throw new DraftNameTaken(NAME_TAKEN);
      throw error;
    }
    return { draft };
  }

  async rename({ draft, name }: { draft: Draft; name: string }) {
    if ((await this.drafts.countDocuments({ _id: draft }, { limit: 1 })) === 0) throw new DraftNotFound(NOT_FOUND);
    if (!validName(name)) throw new InvalidDraftName(INVALID_NAME);
    await this.#ready();
    let renamed;
    try {
      // Setting the name it already has matches the draft and changes nothing.
      renamed = await this.drafts.updateOne({ _id: draft }, { $set: { name } });
    } catch (error) {
      if (repeatsName(error)) throw new DraftNameTaken(NAME_TAKEN);
      throw error;
    }
    // The draft was discarded between the check and the write.
    if (renamed.matchedCount === 0) throw new DraftNotFound(NOT_FOUND);
    return { draft };
  }

  async discard({ draft }: { draft: Draft }) {
    const discarded = await this.drafts.deleteOne({ _id: draft });
    if (discarded.deletedCount === 0) throw new DraftNotFound(NOT_FOUND);
    return { draft };
  }

  async _draftsOf({ owner }: { owner: User }): Promise<Array<{ draft: Draft; name: string }>> {
    const found = await this.drafts.find({ owner } as DraftDocument<User>).toArray();
    return found.map(({ _id, name }) => ({ draft: _id, name })).sort(byName);
  }

  async _owner({ draft }: { draft: Draft }): Promise<Array<{ owner: User }>> {
    const found = await this.drafts.findOne({ _id: draft });
    return found === null ? [] : [{ owner: found.owner }];
  }

  async _get({ draft }: { draft: Draft }): Promise<Array<{ owner: User; name: string }>> {
    const found = await this.drafts.findOne({ _id: draft });
    return found === null ? [] : [{ owner: found.owner, name: found.name }];
  }
}
