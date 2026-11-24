// Adapted from the message-board example in @mit-sdg/sync-engine 1.2.0 (Apache-2.0): accounts are stored in
// MongoDB here. See THIRD_PARTY_NOTICES.md.
import type { Collection, Db } from "mongodb";
import { isDuplicateKey } from "../../storage/mongo.ts";

export class InvalidUsername extends Error {}
export class WeakPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}

/** An account is identified by its username. */
export type Account = string;

interface AccountDocument {
  _id: Account;
  passwordVerifier: string;
}

const USERNAME = /^[A-Za-z0-9_-]{3,32}$/;
const WRONG = "The username or password is incorrect.";

/** How much work one password hash costs. Leave it out to use the runtime's default, which is the safe choice. */
export interface PasswordHashing {
  /** Memory in kibibytes. */
  memoryCost: number;
  /** Passes over that memory. */
  timeCost: number;
}

/** Establishes who a person is from a username and a password. */
export class AuthenticatingConcept {
  private readonly accounts: Collection<AccountDocument>;

  /** `hashing` exists for tests, which register hundreds of people; the server never passes it. */
  constructor(database: Db, name = "Authenticating", private readonly hashing?: PasswordHashing) {
    this.accounts = database.collection(`${name.toLowerCase()}.accounts`);
  }

  async register({ username, password }: { username: string; password: string }) {
    if (!USERNAME.test(username)) {
      throw new InvalidUsername("A username must contain 3 to 32 letters, numbers, underscores, or hyphens.");
    }
    if (password.length < 8 || password.length > 128) {
      throw new WeakPassword("A password must contain 8 to 128 characters.");
    }
    if ((await this.accounts.countDocuments({ _id: username }, { limit: 1 })) > 0) {
      throw new UsernameTaken("That username is already registered.");
    }
    // The salt is part of the verifier string, so the password cannot be read back from the stored value.
    const passwordVerifier = await Bun.password.hash(
      password,
      this.hashing === undefined ? undefined : { algorithm: "argon2id", ...this.hashing },
    );
    try {
      await this.accounts.insertOne({ _id: username, passwordVerifier });
    } catch (error) {
      // Another request registered the same username between the check and the write.
      if (isDuplicateKey(error)) throw new UsernameTaken("That username is already registered.");
      throw error;
    }
    return { account: username };
  }

  async authenticate({ username, password }: { username: string; password: string }) {
    const found = await this.accounts.findOne({ _id: username });
    if (found === null || !(await Bun.password.verify(password, found.passwordVerifier))) {
      throw new InvalidCredentials(WRONG);
    }
    return { account: username };
  }

  async _registered({ username }: { username: string }): Promise<{ registered: boolean }> {
    return { registered: (await this.accounts.countDocuments({ _id: username }, { limit: 1 })) > 0 };
  }
}
