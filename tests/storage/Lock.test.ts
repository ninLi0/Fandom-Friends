/**
 * The startup lock in src/storage/mongo.ts, and the reason the server has one: two servers that load the tag
 * list at the same moment must not add any tag twice.
 */
import { describe, expect, test } from "bun:test";
import { createInstances } from "../../src/assembly.ts";
import { seedVocabulary } from "../../src/seed/apply.ts";
import { tags as starterTags } from "../../src/seed/vocabulary.ts";
import { withLock } from "../../src/storage/mongo.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** A task that writes down when it starts and ends, and takes long enough for another to overlap it. */
function recorded(events: string[], name: string) {
  return async () => {
    events.push(`${name} starts`);
    await pause(150);
    events.push(`${name} ends`);
    return name;
  };
}

describe("the startup lock", () => {
  test("tasks under one lock run one after another, and each returns its own result", async () => {
    const events: string[] = [];

    const results = await Promise.all(
      ["first", "second", "third"].map((name) =>
        withLock(database(), "load", recorded(events, name), { retryEveryMs: 10 }),
      ),
    );

    expect(results).toEqual(["first", "second", "third"]);
    expect(events).toHaveLength(6);
    // Whoever starts also ends before anyone else starts.
    for (let at = 0; at < events.length; at += 2) {
      const name = events[at]!.replace(" starts", "");
      expect([events[at], events[at + 1]]).toEqual([`${name} starts`, `${name} ends`]);
    }
  });

  test("locks with different names do not wait for each other", async () => {
    const events: string[] = [];

    await Promise.all([
      withLock(database(), "tags", recorded(events, "tags")),
      withLock(database(), "templates", recorded(events, "templates")),
    ]);

    expect(events.slice(0, 2).sort()).toEqual(["tags starts", "templates starts"]);
  });

  test("a task that throws releases the lock, and its error reaches the caller", async () => {
    const error = await refusal(() =>
      withLock(database(), "load", async () => {
        throw new Error("The load failed.");
      }),
    );
    expect(error.message).toBe("The load failed.");

    // Nothing is left to wait for, so this returns at once.
    expect(await withLock(database(), "load", async () => "done", { staleAfterMs: 60_000 })).toBe("done");
    expect(await database().collection("host.locks").countDocuments()).toBe(0);
  });

  test("a lock left by a process that stopped is taken over once it is old", async () => {
    const locks = database().collection<{ _id: string; holder: string; takenAt: Date }>("host.locks");
    await locks.insertOne({ _id: "load", holder: "a-process-that-stopped", takenAt: new Date(Date.now() - 5_000) });

    const result = await withLock(database(), "load", async () => "done", { staleAfterMs: 1_000, retryEveryMs: 10 });

    expect(result).toBe("done");
    expect(await locks.countDocuments()).toBe(0);
  });

  test("a lock that is still fresh is waited for, not taken over", async () => {
    const locks = database().collection<{ _id: string; holder: string; takenAt: Date }>("host.locks");
    await locks.insertOne({ _id: "load", holder: "a-running-process", takenAt: new Date() });
    let ran = false;

    const waiting = withLock(database(), "load", async () => { ran = true; }, { staleAfterMs: 60_000, retryEveryMs: 10 });
    await pause(150);
    expect(ran).toBe(false);

    // The running process finishes and releases its lock.
    await locks.deleteOne({ _id: "load", holder: "a-running-process" });
    await waiting;
    expect(ran).toBe(true);
  });
});

describe("two servers loading the tag list at the same moment", () => {
  const everyName = starterTags.flatMap(({ name, alsoCalled = [] }) => [name, ...alsoCalled]);

  test("under the lock every name is saved once, and the second load adds nothing", async () => {
    // Two sets of concepts on one database stand in for two server processes.
    const servers = [createInstances(database()), createInstances(database())];

    const reports = await Promise.all(
      servers.map((server) => withLock(database(), "vocabulary", () => seedVocabulary(server), { retryEveryMs: 10 })),
    );

    const saved = (await servers[0]!.Tagging._suggest({ text: "" })).map(({ name }) => name);
    expect(saved.sort()).toEqual([...everyName].sort());
    expect(reports.map(({ tagsDefined }) => tagsDefined).sort((left, right) => left - right)).toEqual([
      0,
      everyName.length,
    ]);
    expect(await servers[0]!.Templating._templates({})).toHaveLength(3);
  });
});
