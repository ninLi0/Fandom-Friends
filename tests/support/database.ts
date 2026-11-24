import { afterAll, beforeAll, beforeEach } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { connectMongo, localMongoUri } from "../../src/storage/mongo.ts";

/**
 * Gives a test file its own empty database on the local MongoDB (start it with `bun run db:up`).
 * The database is emptied before every test and dropped when the file finishes.
 * Call it once at the top of a test file, then call the returned function inside tests.
 */
export function useTestDatabase(): () => Db {
  const database = `fandomfriends_test_${randomUUID().replaceAll("-", "")}`;
  const uri = process.env.MONGODB_TEST_URI ?? localMongoUri;
  let connection: Awaited<ReturnType<typeof connectMongo>> | undefined;

  beforeAll(async () => {
    connection = await connectMongo({ uri, database });
  });
  beforeEach(async () => {
    await connection!.db.dropDatabase();
  });
  afterAll(async () => {
    try {
      if (connection) await connection.db.dropDatabase();
    } finally {
      await connection?.client.close();
    }
  });

  return () => connection!.db;
}

/** Runs an action and returns the error it threw, or fails the test if it returned. */
export async function refusal(run: () => Promise<unknown>): Promise<Error> {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error("The action returned instead of refusing.");
}
