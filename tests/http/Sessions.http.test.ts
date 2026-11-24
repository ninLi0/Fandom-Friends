import { describe, expect, test } from "bun:test";
import { createRuntime } from "../../src/host/runtime.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();
const origin = "http://localhost:3000";

/** Sends one JSON request the way a browser on the app's own page would. */
async function post(handle: (request: Request) => Promise<Response>, path: string, body: unknown, cookie?: string) {
  const response = await handle(new Request(`${origin}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  }));
  const setCookie = response.headers.get("Set-Cookie");
  return { status: response.status, body: await response.json() as Record<string, unknown>, cookie: setCookie?.split(";")[0] };
}

describe("signing in over HTTP", () => {
  test("register sets a session cookie, the cookie identifies the person, and signing out ends it", async () => {
    const { handle } = createRuntime({ database: database(), publicOrigin: origin });

    const registered = await post(handle, "/auth/register", { username: "alice", password: "correct horse" });
    expect(registered.status).toBe(200);
    // The session travels only in the cookie, never in the response body.
    expect(registered.body).toEqual({ username: "alice" });
    expect(registered.cookie).toBeDefined();

    const current = await post(handle, "/auth/current", {}, registered.cookie);
    expect(current.body).toEqual({ username: "alice" });

    const signedOut = await post(handle, "/auth/sign-out", {}, registered.cookie);
    expect(signedOut.body).toEqual({ signedOut: true });

    const after = await post(handle, "/auth/current", {}, registered.cookie);
    expect(after.status).toBe(401);
    expect(after.body.error).toBe("UNAUTHORIZED");
  });

  test("a request with no cookie is not signed in, and a body cannot stand in for the cookie", async () => {
    const { handle } = createRuntime({ database: database(), publicOrigin: origin });
    const registered = await post(handle, "/auth/register", { username: "alice", password: "correct horse" });
    const session = registered.cookie!.split("=")[1];

    expect((await post(handle, "/auth/current", {})).status).toBe(401);
    expect((await post(handle, "/auth/current", { session })).status).toBe(401);
  });

  test("a wrong password and a taken username are refused with their public categories", async () => {
    const { handle } = createRuntime({ database: database(), publicOrigin: origin });
    await post(handle, "/auth/register", { username: "alice", password: "correct horse" });

    const taken = await post(handle, "/auth/register", { username: "alice", password: "another one" });
    expect(taken.status).toBe(409);
    expect(taken.body.error).toBe("CONFLICT");

    const wrong = await post(handle, "/auth/sign-in", { username: "alice", password: "wrong horse" });
    expect(wrong.status).toBe(401);
    expect(wrong.cookie).toBeUndefined();

    const right = await post(handle, "/auth/sign-in", { username: "alice", password: "correct horse" });
    expect(right.body).toEqual({ username: "alice" });
    expect(right.cookie).toBeDefined();
  });
});
