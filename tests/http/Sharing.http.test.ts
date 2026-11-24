/**
 * Sharing over HTTP: the handle a person is reached by, the one bio they display, whether it is open to new
 * friends, and the public card at the handle's address.
 *
 * The rules are in design/compositions/Sharing.md and design/concepts/Publishing.md. Every test starts the whole
 * application on an empty database and sets its state up through HTTP calls only.
 */
import { describe, expect, test } from "bun:test";
import { startApp, tagNames, type Answer, type Caller } from "../support/app.ts";
import { useTestDatabase } from "../support/database.ts";

const database = useTestDatabase();

type App = Awaited<ReturnType<typeof startApp>>;

/** What a request is expected to answer: the HTTP status and the whole JSON body. */
interface Expected {
  status: number;
  body: Record<string, unknown>;
}

function refusal(status: number, error: string, code: string, detail: string): Expected {
  return { status, body: { error, code, detail } };
}

// Each refusal as a browser sees it. The category (and so the status) and the application's own wording are in
// src/host/http-policy.ts; a code with no wording there keeps the sentence from its concept's specification.
const NOT_SIGNED_IN = refusal(401, "UNAUTHORIZED", "NOT_SIGNED_IN", "Your session has ended. Sign in again.");
const INVALID_HANDLE = refusal(
  400,
  "INVALID_REQUEST",
  "INVALID_HANDLE",
  "A handle must be 3 to 30 lowercase letters, digits, or hyphens.",
);
const HANDLE_ALREADY_CLAIMED = refusal(409, "CONFLICT", "HANDLE_ALREADY_CLAIMED", "You already have a handle.");
const HANDLE_TAKEN = refusal(409, "CONFLICT", "HANDLE_TAKEN", "That handle is already taken.");
const NO_HANDLE = refusal(409, "CONFLICT", "NO_HANDLE", "You do not have a handle.");
const STILL_PUBLISHED = refusal(
  409,
  "CONFLICT",
  "STILL_PUBLISHED",
  "Stop displaying your bio before you release your handle.",
);
const HANDLE_REQUIRED = refusal(409, "CONFLICT", "HANDLE_REQUIRED", "Claim a handle before you display a bio.");
const ALREADY_PUBLISHED = refusal(409, "CONFLICT", "ALREADY_PUBLISHED", "This bio is already displayed.");
const NOTHING_PUBLISHED = refusal(409, "CONFLICT", "NOTHING_PUBLISHED", "You are not displaying a bio.");
const ALREADY_LISTED = refusal(409, "CONFLICT", "ALREADY_LISTED", "You are already open to new friends.");
const NOT_LISTED = refusal(409, "CONFLICT", "NOT_LISTED", "You are not open to new friends.");
const BIO_NOT_FOUND = refusal(404, "NOT_FOUND", "BIO_NOT_FOUND", "There is no such bio among your saved bios.");
const CARD_NOT_FOUND = refusal(404, "NOT_FOUND", "CARD_NOT_FOUND", "Nobody is displaying a bio at that handle.");

/** Input that a validator in src/compositions/validators.ts turned away: its reason, and no refusal code. */
function notUnderstood(reason: string): Expected {
  return { status: 400, body: { error: "INVALID_REQUEST", detail: `The request was not understood: ${reason}.` } };
}

/** A request that leaves out a field the endpoint requires. */
const MISSING_FIELD: Expected = { status: 400, body: { error: "INVALID_REQUEST" } };

/** The status of someone who has claimed nothing and displayed nothing. */
const NOTHING_CHOSEN = { handle: null, displayed: null, open: null };

/** Shaped like a bio's identity, and nobody's bio. */
const NO_SUCH_BIO = "00000000-0000-4000-8000-000000000000";

/** Checks that a request succeeded with exactly this body. */
function expectOk(answer: Answer, body: Record<string, unknown>) {
  expect({ status: answer.status, body: answer.body }).toEqual({ status: 200, body });
}

/** Checks that a request was turned away with exactly this status and body. */
function expectRefused(answer: Answer, expected: Expected) {
  expect({ status: answer.status, body: answer.body }).toEqual(expected);
}

/** The body of a step that sets a test up. A step that did not work stops the test, so no test passes by accident. */
function given(answer: Answer): Record<string, any> {
  if (answer.status !== 200) {
    throw new Error(`A step that should have worked answered ${answer.status}: ${JSON.stringify(answer.body)}`);
  }
  return answer.body;
}

/** Saves a bio with these tags for its owner and returns the bio's identity. */
async function startBio(app: App, owner: Caller, name: string, ...tags: string[]): Promise<string> {
  const bio = given(await owner("/bios/start", { name })).bio as string;
  for (const tag of tags) given(await owner("/bios/tags/add", { bio, tag: await app.tag(tag) }));
  return bio;
}

/** A person's own sharing status: `{ handle, displayed, open }`. */
async function sharing(person: Caller) {
  return given(await person("/sharing/status")).sharing;
}

/** The tag names on the public card at a handle, as a visitor with no session sees it. */
async function publicTags(app: App, handle: string): Promise<string[]> {
  return tagNames(given(await app.visitor("/cards/view", { handle })).card);
}

describe("status: where a person stands", () => {
  test("a new person has no handle, no displayed bio, and no open setting", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectOk(await alice("/sharing/status"), { sharing: { handle: null, displayed: null, open: null } });
  });

  test("after claiming, status shows the handle and nothing else", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));

    expectOk(await alice("/sharing/status"), { sharing: { handle: "alice-draws", displayed: null, open: null } });
  });

  test("after displaying, status names the displayed bio, which is not open yet", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectOk(await alice("/sharing/status"), { sharing: { handle: "alice-draws", displayed: bio, open: false } });
  });

  test("after opening, status says the bio is open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));

    expectOk(await alice("/sharing/status"), { sharing: { handle: "alice-draws", displayed: bio, open: true } });
  });

  test("after closing, open is false and the bio is still displayed", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));
    given(await alice("/sharing/close"));

    expectOk(await alice("/sharing/status"), { sharing: { handle: "alice-draws", displayed: bio, open: false } });
  });

  test("after hiding, the displayed bio and the open setting are blank and the handle stays", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));
    given(await alice("/sharing/hide"));

    expectOk(await alice("/sharing/status"), { sharing: { handle: "alice-draws", displayed: null, open: null } });
  });
});

describe("handles: claiming and releasing", () => {
  test("claiming answers with the handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectOk(await alice("/sharing/claim", { handle: "alice-draws" }), { handle: "alice-draws" });
  });

  test("a person who has a handle cannot claim again, not even a valid handle nobody has", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));

    expectRefused(await alice("/sharing/claim", { handle: "alice-paints" }), HANDLE_ALREADY_CLAIMED);
    expectRefused(await alice("/sharing/claim", { handle: "alice-draws" }), HANDLE_ALREADY_CLAIMED);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
  });

  test("a handle another person has cannot be claimed", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "sketch-fan" }));

    expectRefused(await bob("/sharing/claim", { handle: "sketch-fan" }), HANDLE_TAKEN);
    expect(await sharing(bob)).toEqual(NOTHING_CHOSEN);
  });

  const invalidHandles: [why: string, handle: string][] = [
    ["of 2 characters", "ab"],
    ["of 31 characters", "a".repeat(31)],
    ["with an uppercase letter", "Alice"],
    ["with a space", "al ice"],
    ["with an underscore", "al_ice"],
    ["that is empty", ""],
    ["with a letter outside a to z", "café"],
    ["that ends with a line break", "alice\n"],
  ];
  for (const [why, handle] of invalidHandles) {
    test(`a handle ${why} is refused and nothing is claimed`, async () => {
      const app = await startApp(database());
      const alice = await app.person("alice");

      expectRefused(await alice("/sharing/claim", { handle }), INVALID_HANDLE);
      expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
    });
  }

  test("a handle of exactly 3 characters is accepted", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectOk(await alice("/sharing/claim", { handle: "abc" }), { handle: "abc" });
  });

  test("a handle of exactly 30 characters is accepted", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const handle = "a".repeat(30);

    expectOk(await alice("/sharing/claim", { handle }), { handle });
  });

  test("a handle may mix lowercase letters, digits, and hyphens", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectOk(await alice("/sharing/claim", { handle: "fern-stark-2026" }), { handle: "fern-stark-2026" });
  });

  test("releasing answers that the handle is released, and status shows no handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));

    expectOk(await alice("/sharing/release"), { released: true });
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });

  test("a released handle can be claimed by someone else", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "sketch-fan" }));
    given(await alice("/sharing/release"));

    expectOk(await bob("/sharing/claim", { handle: "sketch-fan" }), { handle: "sketch-fan" });
  });

  test("a released handle that someone else claims shows the new owner's bio, never the old owner's", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "sketch-fan" }));
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio: alices }));
    given(await alice("/sharing/hide"));
    given(await alice("/sharing/release"));

    given(await bob("/sharing/claim", { handle: "sketch-fan" }));
    const bobs = await startBio(app, bob, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await bob("/sharing/display", { bio: bobs }));

    expect(await publicTags(app, "sketch-fan")).toEqual(["Dungeon Meshi"]);
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });

  test("after releasing, the same person can claim a different handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    given(await alice("/sharing/release"));

    expectOk(await alice("/sharing/claim", { handle: "alice-paints" }), { handle: "alice-paints" });
  });

  test("release with no handle is refused", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectRefused(await alice("/sharing/release"), NO_HANDLE);
  });

  test("release while a bio is displayed is refused, and the handle and the card stay", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await alice("/sharing/release"), STILL_PUBLISHED);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: false });
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren"]);
  });

  test("release works once the bio is hidden", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/hide"));

    expectOk(await alice("/sharing/release"), { released: true });
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });
});

describe("displaying a bio", () => {
  test("display without a handle is refused", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");

    expectRefused(await alice("/sharing/display", { bio }), HANDLE_REQUIRED);
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });

  test("display answers with the bio and makes its card public at the handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren", "Sketch swaps");

    expectOk(await alice("/sharing/display", { bio }), { bio });
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren", "Sketch swaps"]);
  });

  test("displaying a second bio replaces the first at the same address", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const first = await startBio(app, alice, "Frieren and sketch swaps", "Frieren", "Sketch swaps");
    const second = await startBio(app, alice, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await alice("/sharing/display", { bio: first }));

    expectOk(await alice("/sharing/display", { bio: second }), { bio: second });
    // The address now shows the second bio alone, so nothing of the first is public any more.
    expect(await publicTags(app, "alice-draws")).toEqual(["Dungeon Meshi"]);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: second, open: false });
  });

  test("displaying the bio that is already displayed is refused", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await alice("/sharing/display", { bio }), ALREADY_PUBLISHED);
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren"]);
  });

  test("hide with nothing displayed is refused, with or without a handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));

    expectRefused(await alice("/sharing/hide"), NOTHING_PUBLISHED);
    expectRefused(await bob("/sharing/hide"), NOTHING_PUBLISHED);
  });

  test("hide answers with the bio it stopped displaying", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectOk(await alice("/sharing/hide"), { bio });
  });

  test("after hide the address answers 404 CARD_NOT_FOUND", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/hide"));

    expectRefused(await app.visitor("/cards/view", { handle: "alice-draws" }), CARD_NOT_FOUND);
  });

  test("after hide the bio can be displayed again under the same handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/hide"));

    expectOk(await alice("/sharing/display", { bio }), { bio });
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren"]);
  });
});

describe("access control", () => {
  // Each body is well formed, so the missing session is the only thing wrong with the request.
  const needSession: [path: string, body: object][] = [
    ["/sharing/status", {}],
    ["/sharing/claim", { handle: "free-handle" }],
    ["/sharing/release", {}],
    ["/sharing/display", { bio: NO_SUCH_BIO }],
    ["/sharing/hide", {}],
    ["/sharing/open", {}],
    ["/sharing/close", {}],
  ];
  for (const [path, body] of needSession) {
    test(`${path} with no session answers 401 NOT_SIGNED_IN`, async () => {
      const app = await startApp(database());

      expectRefused(await app.visitor(path, body), NOT_SIGNED_IN);
    });
  }

  test("a claim with no session does not take the handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectRefused(await app.visitor("/sharing/claim", { handle: "free-handle" }), NOT_SIGNED_IN);
    expectOk(await alice("/sharing/claim", { handle: "free-handle" }), { handle: "free-handle" });
  });

  test("a session sent in the request body instead of the cookie is not signed in", async () => {
    const app = await startApp(database());
    const registered = await app.visitor("/auth/register", { username: "carol", password: "carol-test-password" });
    const session = registered.cookie!.split("=")[1];

    expectRefused(await app.visitor("/sharing/status", { session }), NOT_SIGNED_IN);
    expectRefused(await app.visitor("/sharing/claim", { session, handle: "carol-reads" }), NOT_SIGNED_IN);
  });

  test("displaying another person's bio is refused exactly like a bio that does not exist", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await bob("/sharing/claim", { handle: "bob-reads" }));

    const anothers = await bob("/sharing/display", { bio: alices });
    const madeUp = await bob("/sharing/display", { bio: NO_SUCH_BIO });

    expectRefused(anothers, BIO_NOT_FOUND);
    expectRefused(madeUp, BIO_NOT_FOUND);
  });

  test("a bio its owner is displaying is refused the same way, with no hint that it is in use", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio: alices }));
    given(await bob("/sharing/claim", { handle: "bob-reads" }));

    expectRefused(await bob("/sharing/display", { bio: alices }), BIO_NOT_FOUND);
  });

  test("a refused attempt leaves the other person's bio out of public view", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await bob("/sharing/claim", { handle: "bob-reads" }));

    expectRefused(await bob("/sharing/display", { bio: alices }), BIO_NOT_FOUND);
    expectRefused(await app.visitor("/cards/view", { handle: "bob-reads" }), CARD_NOT_FOUND);
    expectRefused(await app.visitor("/cards/view", { handle: "alice-draws" }), CARD_NOT_FOUND);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
  });

  test("a refused attempt leaves the caller's own status and card as they were", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await bob("/sharing/claim", { handle: "bob-reads" }));
    const bobs = await startBio(app, bob, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await bob("/sharing/display", { bio: bobs }));
    given(await bob("/sharing/open"));

    expectRefused(await bob("/sharing/display", { bio: alices }), BIO_NOT_FOUND);
    expect(await sharing(bob)).toEqual({ handle: "bob-reads", displayed: bobs, open: true });
    expect(await publicTags(app, "bob-reads")).toEqual(["Dungeon Meshi"]);
  });

  test("one person's claim, display, open, close, hide, and release never change another person's status", async () => {
    const app = await startApp(database());
    // Alice has made every choice and Carol has made none. Bob then makes and undoes each of his own.
    const alice = await app.person("alice");
    const carol = await app.person("carol");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio: alices }));
    given(await alice("/sharing/open"));
    const bobs = await startBio(app, bob, "Dungeon Meshi discussions", "Dungeon Meshi");

    const bobsSteps: [path: string, body?: object][] = [
      ["/sharing/claim", { handle: "bob-reads" }],
      ["/sharing/display", { bio: bobs }],
      ["/sharing/open"],
      ["/sharing/close"],
      ["/sharing/hide"],
      ["/sharing/release"],
    ];
    for (const [path, body] of bobsSteps) {
      given(await bob(path, body));
      expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: alices, open: true });
      expect(await sharing(carol)).toEqual(NOTHING_CHOSEN);
    }
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren"]);
  });

  test("a person with nothing of their own cannot hide, close, or release what another person has", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const alices = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio: alices }));
    given(await alice("/sharing/open"));

    expectRefused(await bob("/sharing/hide"), NOTHING_PUBLISHED);
    expectRefused(await bob("/sharing/close"), NOT_LISTED);
    expectRefused(await bob("/sharing/release"), NO_HANDLE);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: alices, open: true });
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren"]);
  });
});

describe("Open to New Friends", () => {
  test("open without a displayed bio is refused", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));

    expectRefused(await alice("/sharing/open"), NOTHING_PUBLISHED);
  });

  test("open answers that the bio is open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectOk(await alice("/sharing/open"), { open: true });
  });

  test("open twice is refused", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));

    expectRefused(await alice("/sharing/open"), ALREADY_LISTED);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: true });
  });

  test("close when not open is refused", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await alice("/sharing/close"), NOT_LISTED);
  });

  test("close answers that the bio is no longer open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));

    expectOk(await alice("/sharing/close"), { open: false });
  });

  test("close leaves the card reachable at its address", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));
    const whileOpen = given(await app.visitor("/cards/view", { handle: "alice-draws" }));
    given(await alice("/sharing/close"));

    expectOk(await app.visitor("/cards/view", { handle: "alice-draws" }), whileOpen);
  });

  test("search finds a displayed bio only while it is open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    const found = async () =>
      (given(await bob("/search", { tags: [] })).people as { handle: string }[]).map(({ handle }) => handle);

    expect(await found()).toEqual([]);
    given(await alice("/sharing/open"));
    expect(await found()).toEqual(["alice-draws"]);
    given(await alice("/sharing/close"));
    expect(await found()).toEqual([]);
  });

  test("displaying a different bio keeps it open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const first = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    const second = await startBio(app, alice, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await alice("/sharing/display", { bio: first }));
    given(await alice("/sharing/open"));
    given(await alice("/sharing/display", { bio: second }));

    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: second, open: true });
  });

  test("displaying a different bio keeps the time it was opened", async () => {
    let now = new Date("2026-11-23T12:00:00Z");
    const app = await startApp(database(), { clock: () => now });
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const first = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    const second = await startBio(app, alice, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await alice("/sharing/display", { bio: first }));
    now = new Date("2026-11-23T12:05:00Z");
    given(await alice("/sharing/open"));
    now = new Date("2026-11-23T12:30:00Z");
    given(await alice("/sharing/display", { bio: second }));

    const people = given(await bob("/search", { tags: [] })).people as { handle: string; listedOn: string }[];

    expect(people.map(({ handle, listedOn }) => [handle, listedOn])).toEqual([
      ["alice-draws", "2026-11-23T12:05:00.000Z"],
    ]);
  });

  test("hide turns it off, and displaying again leaves it off until it is opened again", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));

    given(await alice("/sharing/hide"));
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
    given(await alice("/sharing/display", { bio }));
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: false });
    given(await alice("/sharing/open"));
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: true });
  });
});

describe("the public card", () => {
  test("a visitor with no session gets the handle and the displayed bio's card", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await alice("/sharing/display", { bio }));

    expectOk(await app.visitor("/cards/view", { handle: "alice-draws" }), {
      handle: "alice-draws",
      card: {
        tags: [{ tag: await app.tag("Dungeon Meshi"), name: "Dungeon Meshi", under: [] }],
        look: { template: await app.template("Classic"), layout: "Stacked", font: "Serif", palette: "Parchment" },
      },
    });
  });

  test("the card lists the bio's tags by name, each with the broader tags it lies under", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Sketch swaps", "Fern/Stark");
    given(await alice("/sharing/display", { bio }));

    const { card } = given(await app.visitor("/cards/view", { handle: "alice-draws" }));

    // The broader tags come in no promised order, so each list is sorted before it is compared.
    const withBroader = (card.tags as { name: string; under: { name: string; direct: boolean }[] }[]).map(
      ({ name, under }) => ({ name, under: under.map((broader) => [broader.name, broader.direct]).sort() }),
    );
    expect(withBroader).toEqual([
      { name: "Fern/Stark", under: [["Fern", true], ["Frieren", false], ["Stark", true]] },
      { name: "Sketch swaps", under: [["Interests", true]] },
    ]);
  });

  test("the card carries the look the owner chose for the bio", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    const sideBySide = await app.template("Side by side");
    given(await alice("/bios/look/template", { bio, template: sideBySide }));
    given(await alice("/bios/look/font", { bio, font: "Rounded" }));
    given(await alice("/sharing/display", { bio }));

    const { card } = given(await app.visitor("/cards/view", { handle: "alice-draws" }));

    expect(card.look).toEqual({ template: sideBySide, layout: "Two columns", font: "Rounded", palette: "Midnight" });
  });

  test("the public card is the same card the owner sees for that bio", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Fern/Stark", "Sketch swaps");
    given(await alice("/sharing/display", { bio }));

    const own = given(await alice("/bios/view", { bio }));
    const shown = given(await app.visitor("/cards/view", { handle: "alice-draws" }));

    expect(shown.card).toEqual(own.card);
  });

  test("someone signed in, the owner included, gets the same answer as a visitor", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    const bob = await app.person("bob");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    const asVisitor = given(await app.visitor("/cards/view", { handle: "alice-draws" }));

    expectOk(await bob("/cards/view", { handle: "alice-draws" }), asVisitor);
    expectOk(await alice("/cards/view", { handle: "alice-draws" }), asVisitor);
  });

  test("a handle nobody has answers 404 CARD_NOT_FOUND", async () => {
    const app = await startApp(database());

    expectRefused(await app.visitor("/cards/view", { handle: "nobody-here" }), CARD_NOT_FOUND);
  });

  test("a handle with nothing displayed answers exactly as a handle nobody has", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    await startBio(app, alice, "Frieren and sketch swaps", "Frieren");

    const nothingDisplayed = await app.visitor("/cards/view", { handle: "alice-draws" });
    const nobodys = await app.visitor("/cards/view", { handle: "nobody-here" });

    expectRefused(nothingDisplayed, CARD_NOT_FOUND);
    expectRefused(nobodys, CARD_NOT_FOUND);
  });

  test("text that could never be a handle answers the same 404", async () => {
    const app = await startApp(database());

    for (const handle of ["Alice Draws", "alice_draws", ""]) {
      expectRefused(await app.visitor("/cards/view", { handle }), CARD_NOT_FOUND);
    }
  });

  test("a person's other saved bios cannot be reached by any handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const displayed = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    const other = await startBio(app, alice, "Dungeon Meshi discussions", "Dungeon Meshi");
    given(await alice("/sharing/display", { bio: displayed }));

    // Her address shows the displayed bio alone.
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren"]);
    // Nothing else works as an address for the other bio: not its identity, not its name, not her username.
    for (const guess of [other, "Dungeon Meshi discussions", "dungeon-meshi-discussions", "alice"]) {
      expectRefused(await app.visitor("/cards/view", { handle: guess }), CARD_NOT_FOUND);
    }
  });

  test("the public card never contains the bio's private name or the owner's username", async () => {
    const app = await startApp(database());
    // The username and the bio's name share no word with the handle or with any tag.
    const owner = await app.person("margaret");
    given(await owner("/sharing/claim", { handle: "sketch-fan" }));
    const bio = await startBio(app, owner, "Quokka weekend plans", "Fern/Stark", "Sketch swaps");
    given(await owner("/sharing/display", { bio }));

    const text = JSON.stringify(given(await app.visitor("/cards/view", { handle: "sketch-fan" }))).toLowerCase();

    expect(text).toContain("sketch-fan");
    expect(text).toContain("fern/stark");
    expect(text).not.toContain("margaret");
    expect(text).not.toContain("quokka");
  });

  test("adding or removing a tag on the displayed bio shows on the public card at once", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    given(await alice("/bios/tags/add", { bio, tag: await app.tag("Sketch swaps") }));
    expect(await publicTags(app, "alice-draws")).toEqual(["Frieren", "Sketch swaps"]);
    given(await alice("/bios/tags/remove", { bio, tag: await app.tag("Frieren") }));
    expect(await publicTags(app, "alice-draws")).toEqual(["Sketch swaps"]);
  });

  test("changing the displayed bio's template, font, or color scheme shows on the public card at once", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    const classic = await app.template("Classic");
    const sideBySide = await app.template("Side by side");
    const look = async () => given(await app.visitor("/cards/view", { handle: "alice-draws" })).card.look;

    expect(await look()).toEqual({ template: classic, layout: "Stacked", font: "Serif", palette: "Parchment" });
    given(await alice("/bios/look/template", { bio, template: sideBySide }));
    expect(await look()).toEqual({ template: sideBySide, layout: "Two columns", font: "Sans", palette: "Midnight" });
    given(await alice("/bios/look/font", { bio, font: "Mono" }));
    expect(await look()).toEqual({ template: sideBySide, layout: "Two columns", font: "Mono", palette: "Midnight" });
    given(await alice("/bios/look/palette", { bio, palette: "Forest" }));
    expect(await look()).toEqual({ template: sideBySide, layout: "Two columns", font: "Mono", palette: "Forest" });
  });
});

describe("input shape: a request that is not understood is rejected with 400 and changes nothing", () => {
  // The reasons are the validators' own, from src/compositions/validators.ts.
  const CLAIM_NOT_UNDERSTOOD = notUnderstood("handle must be text and session must come from the cookie");
  const DISPLAY_NOT_UNDERSTOOD = notUnderstood("bio must be a bio identity and session must come from the cookie");
  const VIEW_NOT_UNDERSTOOD = notUnderstood("handle must be text");
  const TAKES_NO_INPUT = notUnderstood("session must come from the cookie");

  test("claim with an extra field claims nothing", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectRefused(await alice("/sharing/claim", { handle: "alice-draws", extra: true }), CLAIM_NOT_UNDERSTOOD);
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });

  test("claim with a handle that is not text claims nothing", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    for (const handle of [12345, null, ["alice-draws"]]) {
      expectRefused(await alice("/sharing/claim", { handle }), CLAIM_NOT_UNDERSTOOD);
    }
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });

  test("claim with no handle claims nothing", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectRefused(await alice("/sharing/claim", {}), MISSING_FIELD);
    expect(await sharing(alice)).toEqual(NOTHING_CHOSEN);
  });

  test("display with an extra field displays nothing", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");

    expectRefused(await alice("/sharing/display", { bio, extra: true }), DISPLAY_NOT_UNDERSTOOD);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
  });

  test("display with a bio that is not text displays nothing", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");

    for (const notText of [12345, null, [bio]]) {
      expectRefused(await alice("/sharing/display", { bio: notText }), DISPLAY_NOT_UNDERSTOOD);
    }
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
  });

  test("display with no bio displays nothing", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    await startBio(app, alice, "Frieren and sketch swaps", "Frieren");

    expectRefused(await alice("/sharing/display", {}), MISSING_FIELD);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
  });

  test("the public card is not answered to a request with an extra field", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await app.visitor("/cards/view", { handle: "alice-draws", extra: true }), VIEW_NOT_UNDERSTOOD);
  });

  test("the public card is not answered to a handle that is not text", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    for (const handle of [12345, null, ["alice-draws"]]) {
      expectRefused(await app.visitor("/cards/view", { handle }), VIEW_NOT_UNDERSTOOD);
    }
  });

  test("the public card is not answered to a request with no handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await app.visitor("/cards/view", {}), MISSING_FIELD);
  });

  test("status with an extra field is rejected", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");

    expectRefused(await alice("/sharing/status", { extra: true }), TAKES_NO_INPUT);
  });

  test("release with an extra field keeps the handle", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));

    expectRefused(await alice("/sharing/release", { handle: "alice-draws" }), TAKES_NO_INPUT);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: null, open: null });
  });

  test("hide with an extra field keeps the bio displayed", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await alice("/sharing/hide", { bio }), TAKES_NO_INPUT);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: false });
  });

  test("open with an extra field leaves the bio not open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));

    expectRefused(await alice("/sharing/open", { open: true }), TAKES_NO_INPUT);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: false });
  });

  test("close with an extra field leaves the bio open", async () => {
    const app = await startApp(database());
    const alice = await app.person("alice");
    given(await alice("/sharing/claim", { handle: "alice-draws" }));
    const bio = await startBio(app, alice, "Frieren and sketch swaps", "Frieren");
    given(await alice("/sharing/display", { bio }));
    given(await alice("/sharing/open"));

    expectRefused(await alice("/sharing/close", { open: false }), TAKES_NO_INPUT);
    expect(await sharing(alice)).toEqual({ handle: "alice-draws", displayed: bio, open: true });
  });
});
