/**
 * The browser's entry point: it decides which page to show for the address and draws the bar above it.
 *
 * The pages live in ./pages, one file each. Each works end to end against the real API,
 * so a teammate can restyle or rewrite one page without touching the others.
 * Moving between pages never reloads the browser.
 */
import { api, reason, refused } from "./api.ts";
import { button, fill, h } from "./dom.ts";
import { editorStyles } from "./editor-styles.ts";
import { editorPage } from "./pages/editor.ts";
import { publicCardPage } from "./pages/public-card.ts";
import { searchPage } from "./pages/search.ts";
import { signInPage } from "./pages/sign-in.ts";

/** What every page is given. */
export interface PageContext {
  /** The signed-in name, used as the editor's initial display name. */
  username?: string;
  /** Shows one message to the person, such as why a request was refused. */
  say(message: string): void;
  /** Goes to another address in the app without reloading. */
  go(path: string): void;
  /** Tells the app that the person has just signed in. */
  signedIn(username: string): void;
  /** Checks unsaved work before navigation or sign-out. */
  beforeLeave(check: () => boolean): void;
  /** Disposes page listeners when another page is shown. */
  onLeave(cleanup: () => void): void;
}

/** A page builds its element once; it redraws inside that element as things change. */
export type Page = (context: PageContext) => HTMLElement;

const bar = document.querySelector<HTMLElement>("#bar")!;
const status = document.querySelector<HTMLElement>("#status")!;
const view = document.querySelector<HTMLElement>("#view")!;

// Keep Heyang's editor/card styles together without changing another page's stylesheet.
document.head.append(h("style", { textContent: editorStyles }));

/** The signed-in person's username, or null. Undefined until the first check answers. */
let username: string | null | undefined;
let mayLeave = () => true;
let cleanups: (() => void)[] = [];
let historyPosition = typeof history.state?.ffPosition === "number" ? history.state.ffPosition as number : 0;
let restoringHistory = false;
let signingOut = false;
history.replaceState({ ...history.state, ffPosition: historyPosition }, "", location.href);

function say(message: string) {
  status.textContent = message;
}

function go(path: string) {
  if (signingOut || !mayLeave()) return;
  navigate(path);
}

function navigate(path: string) {
  if (path !== location.pathname) {
    historyPosition += 1;
    history.pushState({ ffPosition: historyPosition }, "", path);
  }
  show();
}

function signedIn(name: string) {
  username = name;
  show();
}

function link(label: string, path: string) {
  const anchor = h("a", { href: path, textContent: label });
  if (location.pathname === path) anchor.setAttribute("aria-current", "page");
  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    go(path);
  });
  return anchor;
}

function drawBar() {
  fill(
    bar,
    link("My bios", "/"),
    link("Find friends", "/search"),
    username
      ? h(
          "span",
          { className: "account" },
          `Signed in as ${username} `,
          button("Sign out", async () => {
            if (signingOut || !mayLeave()) return;
            signingOut = true;
            view.inert = true;
            bar.inert = true;
            try {
              const result = await api.auth["sign-out"]({});
              if (refused(result) && result.error !== "UNAUTHORIZED") return say(reason(result));
              username = null;
              navigate("/");
            } finally {
              signingOut = false;
              view.inert = false;
              bar.inert = false;
            }
          }),
        )
      : null,
  );
}

/** Picks the page for the current address. A public bio needs no sign-in; everything else does. */
function pageFor(path: string): Page {
  const handle = /^\/u\/([^/]+)\/?$/.exec(path)?.[1];
  if (handle !== undefined) return publicCardPage(decodeURIComponent(handle));
  if (!username) return signInPage;
  return path === "/search" ? searchPage : editorPage;
}

function show() {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  mayLeave = () => true;
  say("");
  drawBar();
  fill(view, pageFor(location.pathname)({
    say, go, signedIn, username: username ?? undefined,
    beforeLeave: (check) => { mayLeave = check; },
    onLeave: (cleanup) => { cleanups.push(cleanup); },
  }));
}

addEventListener("popstate", (event: PopStateEvent) => {
  if (restoringHistory) { restoringHistory = false; return; }
  const nextPosition = typeof event.state?.ffPosition === "number" ? event.state.ffPosition as number : historyPosition - 1;
  if (signingOut || !mayLeave()) {
    restoringHistory = true;
    history.go(historyPosition - nextPosition);
    return;
  }
  historyPosition = nextPosition;
  show();
});

const current = await api.auth.current({});
username = refused(current) ? null : current.username;
show();
