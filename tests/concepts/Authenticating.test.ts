import { describe, expect, test } from "bun:test";
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidUsername,
  UsernameTaken,
  WeakPassword,
} from "../../src/concepts/Authenticating/Authenticating.ts";
import { refusal, useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();
const authenticating = () => new AuthenticatingConcept(database(), "Authenticating");

describe("Authenticating", () => {
  test("its principle: register, refuse a duplicate and a wrong password, accept the right one", async () => {
    const concept = authenticating();
    expect(await concept._registered({ username: "ari" })).toEqual({ registered: false });
    expect(await concept.register({ username: "ari", password: "correct horse" })).toEqual({ account: "ari" });
    expect(await concept._registered({ username: "ari" })).toEqual({ registered: true });

    expect(await refusal(() => concept.register({ username: "ari", password: "another one" }))).toBeInstanceOf(UsernameTaken);
    expect(await refusal(() => concept.authenticate({ username: "ari", password: "wrong horse" }))).toBeInstanceOf(InvalidCredentials);
    expect(await concept.authenticate({ username: "ari", password: "correct horse" })).toEqual({ account: "ari" });
  });

  test("an unknown username is refused the same way as a wrong password", async () => {
    const error = await refusal(() => authenticating().authenticate({ username: "nobody", password: "correct horse" }));
    expect(error).toBeInstanceOf(InvalidCredentials);
    expect(error.message).toBe("The username or password is incorrect.");
  });

  test("a malformed username or a weak password is refused and saves nothing", async () => {
    const concept = authenticating();
    for (const username of ["ab", "has space", "x".repeat(33), "émile"]) {
      expect(await refusal(() => concept.register({ username, password: "correct horse" }))).toBeInstanceOf(InvalidUsername);
    }
    for (const password of ["short", "x".repeat(129)]) {
      expect(await refusal(() => concept.register({ username: "ari", password }))).toBeInstanceOf(WeakPassword);
    }
    expect(await concept._registered({ username: "ari" })).toEqual({ registered: false });
  });

  test("the password is not stored as written, and an account survives a new connection to the same database", async () => {
    await authenticating().register({ username: "ari", password: "correct horse" });
    const saved = await database().collection("authenticating.accounts").find().toArray();
    expect(saved).toHaveLength(1);
    expect(JSON.stringify(saved)).not.toContain("correct horse");
    // A second instance stands in for the server after a restart.
    expect(await authenticating().authenticate({ username: "ari", password: "correct horse" })).toEqual({ account: "ari" });
  });
});
