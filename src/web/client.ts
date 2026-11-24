/**
 * The browser's entry point: it decides which page to show for the address and draws the bar above it.
 *
 * The pages live in ./pages, one file each. They are plain and unstyled on purpose: each works end to end
 * against the real API, so a teammate can restyle or rewrite one page without touching the others.
 * Moving between pages never reloads the browser.
 */
import { api, reason, refused } from "./api.ts";
import { button, fill, h } from "./dom.ts";
import { editorPage } from "./pages/editor.ts";
import { publicCardPage } from "./pages/public-card.ts";
import { searchPage } from "./pages/search.ts";
import { signInPage } from "./pages/sign-in.ts";

/** What every page is given. */
export interface PageContext {
  /** Shows one message to the person, such as why a request was refused. */
  say(message: string): void;
  /** Goes to another address in the app without reloading. */
  go(path: string): void;
  /** Tells the app that the person has just signed in. */
  signedIn(username: string): void;
}

/** A page builds its element once; it redraws inside that element as things change. */
export type Page = (context: PageContext) => HTMLElement;

const bar = document.querySelector<HTMLElement>("#bar")!;
const status = document.querySelector<HTMLElement>("#status")!;
const view = document.querySelector<HTMLElement>("#view")!;

/** The signed-in person's username, or null. Undefined until the first check answers. */
let username: string | null | undefined;

function say(message: string) {
  status.textContent = message;
}

function go(path: string) {
  if (path !== location.pathname) history.pushState(null, "", path);
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
            const result = await api.auth["sign-out"]({});
            if (refused(result) && result.error !== "UNAUTHORIZED") return say(reason(result));
            username = null;
            go("/");
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
  say("");
  drawBar();
  fill(view, pageFor(location.pathname)({ say, go, signedIn }));
}

addEventListener("popstate", show);

const current = await api.auth.current({});
username = refused(current) ? null : current.username;
show();
