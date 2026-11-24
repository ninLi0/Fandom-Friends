/** The sign-in page: register, or sign in to an existing account. */
import { api, reason, refused } from "../api.ts";
import { h } from "../dom.ts";
import type { Page } from "../client.ts";

export const signInPage: Page = ({ say, signedIn }) => {
  const username = h("input", { id: "username", name: "username", autocomplete: "username", required: true });
  const password = h("input", { id: "password", name: "password", type: "password", autocomplete: "current-password", required: true });
  const form = h(
    "form",
    { className: "stack" },
    h("label", { htmlFor: "username", textContent: "Username" }),
    username,
    h("p", { className: "quiet", textContent: "3 to 32 letters, numbers, underscores, or hyphens." }),
    h("label", { htmlFor: "password", textContent: "Password" }),
    password,
    h("p", { className: "quiet", textContent: "8 to 128 characters." }),
    h(
      "div",
      { className: "row" },
      h("button", { type: "submit", value: "sign-in", textContent: "Sign in" }),
      h("button", { type: "submit", value: "register", textContent: "Create account" }),
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
    {},
    h("h1", { textContent: "Fandom Friends" }),
    h("p", { textContent: "Make a bio from the fandoms you love, share it as a link, and find people who love the same things." }),
    form,
  );
};
