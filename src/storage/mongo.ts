import { randomUUID } from "node:crypto";
import { MongoClient, type Db } from "mongodb";

/** The local standalone server from compose.yaml. The path names the database, as on the class platform. */
export const localMongoUri = "mongodb://127.0.0.1:27017/fandomfriends?directConnection=true";

/** Connects with the database named in the URI. Tests pass their own database name. */
export async function connectMongo({
  uri = process.env.MONGODB_URI ?? localMongoUri,
  database,
}: { uri?: string; database?: string } = {}) {
  const client = new MongoClient(uri, {
    appName: "FandomFriends",
    serverSelectionTimeoutMS: 5_000,
    writeConcern: { w: "majority", j: true },
    // The class platform allows 10 connections, and the old and new versions overlap during a deploy.
    ...(/[?&]maxPoolSize=/i.test(uri) ? {} : { maxPoolSize: 4 }),
  });

  try {
    await client.connect();
    const db = database === undefined ? client.db() : client.db(database);
    await db.command({ ping: 1 });
    return { client, db };
  } catch (error) {
    await client.close();
    throw error;
  }
}

/** True when MongoDB refused a write because it would repeat a unique value. */
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

/**
 * Runs a task while holding a named lock in the database, so that server processes sharing the database do the
 * task one after another. The server uses it for work that reads first and writes second at startup, such as
 * loading the tag list: two servers starting at the same moment would otherwise both find a tag missing and
 * both add it.
 *
 * A lock left behind by a process that stopped partway is taken over once it is older than `staleAfterMs`.
 */
export async function withLock<Result>(
  db: Db,
  name: string,
  task: () => Promise<Result>,
  { staleAfterMs = 120_000, retryEveryMs = 200 }: { staleAfterMs?: number; retryEveryMs?: number } = {},
): Promise<Result> {
  const locks = db.collection<{ _id: string; holder: string; takenAt: Date }>("host.locks");
  const holder = randomUUID();
  for (;;) {
    try {
      await locks.insertOne({ _id: name, holder, takenAt: new Date() });
      break;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    // Someone holds the lock. Clear it if it is old, then wait and try again.
    await locks.deleteOne({ _id: name, takenAt: { $lt: new Date(Date.now() - staleAfterMs) } });
    await new Promise((resolve) => setTimeout(resolve, retryEveryMs));
  }
  try {
    return await task();
  } finally {
    // Only this holder's lock is released: one that was taken over as stale now belongs to someone else.
    await locks.deleteOne({ _id: name, holder });
  }
}
