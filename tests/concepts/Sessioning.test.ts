import { describe, expect, test } from "bun:test";
import { NotSignedIn, SessioningConcept, type Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const start = new Date("2026-11-23T12:00:00Z");

/** A concept on the test database with a clock the test moves by hand. */
function sessioning() {
  let now = start;
  const concept = new SessioningConcept<string>(database(), "Sessioning", () => now);
  return {
    concept,
    /** Moves the clock to this long after the start. */
    at(elapsed: number) {
      now = new Date(start.getTime() + elapsed);
    },
  };
}

async function expectEnded(run: () => Promise<unknown>) {
  const error = await refusal(run);
  expect(error).toBeInstanceOf(NotSignedIn);
  expect(error.message).toBe("Your session has ended. Sign in again.");
}

describe("Sessioning principle", () => {
  test("a started session returns its person on every use, and is refused after it ends", async () => {
    const { concept } = sessioning();
    const { session, expiresAt } = await concept.start({ subject: "maya" });
    expect(expiresAt).toEqual(new Date(start.getTime() + 90 * DAY));

    expect(await concept.use({ session })).toEqual({ subject: "maya" });
    expect(await concept.use({ session })).toEqual({ subject: "maya" });

    expect(await concept.end({ session })).toEqual({ session });
    await expectEnded(() => concept.use({ session }));
  });

  test("a session nobody uses for a week is refused, and one used every day lasts until three months", async () => {
    const { concept, at } = sessioning();
    const library = await concept.start({ subject: "maya" });
    const laptop = await concept.start({ subject: "maya" });

    // The laptop session is used every day; the library session is never used.
    for (let day = 1; day <= 6; day += 1) {
      at(day * DAY);
      expect(await concept.use({ session: laptop.session })).toEqual({ subject: "maya" });
    }
    at(7 * DAY - 1);
    expect(await concept.use({ session: library.session })).toEqual({ subject: "maya" });

    const { concept: idle, at: idleAt } = sessioning();
    const left = await idle.start({ subject: "maya" });
    idleAt(7 * DAY);
    await expectEnded(() => idle.use({ session: left.session }));

    for (let day = 7; day < 90; day += 1) {
      at(day * DAY);
      expect(await concept.use({ session: laptop.session })).toEqual({ subject: "maya" });
    }
    at(90 * DAY - 1);
    expect(await concept.use({ session: laptop.session })).toEqual({ subject: "maya" });
    at(90 * DAY);
    await expectEnded(() => concept.use({ session: laptop.session }));
  });
});

describe("Sessioning refusals", () => {
  test("an unknown session is refused by use and end", async () => {
    const { concept } = sessioning();
    await expectEnded(() => concept.use({ session: "made-up" as Session }));
    await expectEnded(() => concept.end({ session: "made-up" as Session }));
  });

  test("ending a session twice is refused the second time", async () => {
    const { concept } = sessioning();
    const { session } = await concept.start({ subject: "maya" });
    await concept.end({ session });
    await expectEnded(() => concept.end({ session }));
  });

  test("an idle or expired session cannot be ended either", async () => {
    const { concept, at } = sessioning();
    const { session } = await concept.start({ subject: "maya" });
    at(7 * DAY);
    await expectEnded(() => concept.end({ session }));
  });
});

describe("Sessioning variants", () => {
  test("each start gives a different session that is hard to guess, and ending one leaves the others", async () => {
    const { concept } = sessioning();
    const first = await concept.start({ subject: "maya" });
    const second = await concept.start({ subject: "maya" });
    const other = await concept.start({ subject: "noor" });

    expect(new Set([first.session, second.session, other.session]).size).toBe(3);
    // 32 random bytes, written in 43 URL-safe characters.
    expect(first.session).toMatch(/^[A-Za-z0-9_-]{43}$/);

    await concept.end({ session: first.session });
    expect(await concept.use({ session: second.session })).toEqual({ subject: "maya" });
    expect(await concept.use({ session: other.session })).toEqual({ subject: "noor" });
  });

  test("using a session does not move the three-month limit", async () => {
    const { concept, at } = sessioning();
    const { session } = await concept.start({ subject: "maya" });
    for (let day = 5; day < 90; day += 5) {
      at(day * DAY);
      await concept.use({ session });
    }
    at(90 * DAY);
    await expectEnded(() => concept.use({ session }));
  });
});

describe("Sessioning storage", () => {
  test("a session survives a new instance on the same database", async () => {
    const { session } = await sessioning().concept.start({ subject: "maya" });
    // A second instance stands in for the server after a restart.
    expect(await sessioning().concept.use({ session })).toEqual({ subject: "maya" });
  });

  test("two instances of the concept keep separate sessions", async () => {
    const browsers = new SessioningConcept<string>(database(), "BrowserSessions");
    const devices = new SessioningConcept<string>(database(), "DeviceSessions");
    const { session } = await browsers.start({ subject: "maya" });
    await expectEnded(() => devices.use({ session }));
  });
});
