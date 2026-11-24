/** The sign-in page: register, or sign in to an existing account. */
import { api, reason, refused } from "../api.ts";
import { h } from "../dom.ts";
import { renderCard } from "../mvp-card.ts";
import type { Catalog, Tag } from "../mvp-types.ts";
import type { Page } from "../client.ts";

/** A made-up card, so the first screen shows what the product makes. Its text is fixed here, never a person's. */
function sampleCard(): HTMLElement {
  const tag = (name: string, category: Tag["category"], parents: string[] = []): Tag => ({ id: name, name, category, aliases: [], parents });
  const catalog: Catalog = {
    tags: [tag("Frieren", "fandom"), tag("Fern", "character", ["Frieren"]), tag("Stark", "character", ["Frieren"]), tag("Fern/Stark", "pairing", ["Fern", "Stark"]), tag("Sketch swaps", "interest")],
    templates: [], fonts: [], palettes: [],
  };
  const sample = h("div", { className: "sign-in-sample" }, h("p", { textContent: "A bio looks like this" }));
  const holder = h("div");
  holder.innerHTML = renderCard({
    displayName: "Mika", note: "Rewatching with tea. Always up for a sketch swap.", handle: "mika",
    tagIds: catalog.tags.map((item) => item.id),
    look: { template: "", layout: "poster", font: "Sans", palette: "Ocean" },
  }, catalog);
  sample.append(...holder.children);
  return sample;
}

export const signInPage: Page = ({ say, signedIn }) => {
  const username = h("input", { id: "username", name: "username", autocomplete: "username", required: true });
  const password = h("input", { id: "password", name: "password", type: "password", autocomplete: "current-password", required: true });
  const form = h(
    "form",
    {},
    h("label", { htmlFor: "username", textContent: "Username" }),
    username,
    h("p", { className: "help", textContent: "3 to 32 letters, numbers, underscores, or hyphens." }),
    h("label", { htmlFor: "password", textContent: "Password" }),
    password,
    h("p", { className: "help", textContent: "8 to 128 characters." }),
    h(
      "div",
      { className: "actions" },
      h("button", { type: "submit", value: "sign-in", textContent: "Sign in", className: "site-button primary" }),
      h("button", { type: "submit", value: "register", textContent: "Create account", className: "site-button secondary" }),
    ),
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const credentials = { username: username.value, password: password.value };
    const registering = (event.submitter as HTMLButtonElement | null)?.value === "register";
    const result = registering ? await api.auth.register(credentials) : await api.auth["sign-in"](credentials);
    if (refused(result)) return say(reason(result));
    signedIn(result.username);
  });

  return h(
    "section",
    { className: "sign-in-page" },
    h(
      "div",
      { className: "sign-in-panel" },
      h("h1", { textContent: "Fandom Friends" }),
      h("p", { className: "pitch", textContent: "Make a bio from the fandoms you love, share it as a link, and find people who love the same things." }),
      form,
    ),
    sampleCard(),
  );
};
