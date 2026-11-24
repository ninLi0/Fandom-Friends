# Developing Fandom Friends

This is the working backbone of the alpha: the concepts, the reactions that connect them, the tag list, tests, and one plain page per area. Everything runs end to end. The pages are unstyled on purpose so each of us can take one and make it real.

## Run it

You need [Bun](https://bun.sh) 1.4.2 and Docker Desktop (for MongoDB).

```bash
bun install
```

```bash
bun run db:up
```

```bash
bun run dev
```

Open http://localhost:3000. The tag list and the three templates load by themselves on the first start.

Before you push:

```bash
bun test
```

```bash
bun run check
```

## What is where

| Folder | What it holds |
| --- | --- |
| `design/concepts/` | The eight concept specifications. The framework checks each one against its code. |
| `design/compositions/` | What each group of endpoints does, in words, with a link to every reaction. |
| `design/types.md` | Which concept's type stands for what: a bio is a draft, a person is an account. |
| `src/concepts/<Name>/` | One class per concept (stores its state in MongoDB) and its registration. |
| `src/compositions/` | The endpoints. Each one is a reaction: a request, checks, concept actions, an answer. |
| `src/seed/vocabulary.ts` | The Frieren tag list, other names, groups, templates, fonts, and color schemes. |
| `src/web/` | The pages. `pages/` has one file per page; `card.ts` draws a bio card; `api.ts` is the typed client. |
| `src/host/` | The server: HTTP, the session cookie, and the sentence shown for each refusal. |
| `src/storage/` | The MongoDB connection, and the lock that keeps two starting servers from loading the tag list twice. |
| `tests/` | `concepts/` tests each concept alone. `http/` tests the endpoints the way a browser calls them. `seed/` tests the tag list and its loader. |
| `generated/` | Written by `bun run generate`. Never edit it by hand. |

## The eight concepts

| Concept | What it keeps | Used for |
| --- | --- | --- |
| Authenticating | usernames and passwords | sign-in |
| Sessioning | who a browser is signed in as | sign-in |
| Drafting | a person's saved bios, by name | several bios per person |
| Tagging | the tag list, and which bio has which tag | a bio's tags |
| Synonymizing | which tag names mean the same tag | "Sousou no Frieren" = "Frieren" |
| Grouping | which tag lies under which | "Fern/Stark" counts as "Frieren" |
| Templating | templates, and each bio's template, font, and color scheme | a bio's look |
| Publishing | handles, the one displayed bio, and Open to New Friends | sharing and search |

## The API

Every call is a `POST` under `/api` with a JSON body. The session is a cookie the browser sends by itself.

| Path | Send | Answers | Who |
| --- | --- | --- | --- |
| `/auth/register`, `/auth/sign-in` | `username`, `password` | `username` | anyone |
| `/auth/current` | | `username` | signed in |
| `/auth/sign-out` | | `signedOut` | signed in |
| `/bios/list` | | `bios`: each `bio`, `name` | signed in |
| `/bios/start` | `name` | `bio` | signed in |
| `/bios/view` | `bio` | `bio`, `name`, `card` | the bio's owner |
| `/bios/rename` | `bio`, `name` | `bio` | the bio's owner |
| `/bios/discard` | `bio` | `bio` | the bio's owner |
| `/bios/tags/add`, `/bios/tags/remove` | `bio`, `tag` | `bio`, `card` | the bio's owner |
| `/bios/look/template` | `bio`, `template` | `bio`, `card` | the bio's owner |
| `/bios/look/font` | `bio`, `font` | `bio`, `card` | the bio's owner |
| `/bios/look/palette` | `bio`, `palette` | `bio`, `card` | the bio's owner |
| `/bios/look/reset` | `bio` | `bio`, `card` | the bio's owner |
| `/sharing/status` | | `sharing`: `handle`, `displayed`, `open` | signed in |
| `/sharing/claim` | `handle` | `handle` | signed in |
| `/sharing/release` | | `released` | signed in |
| `/sharing/display` | `bio` | `bio` | the bio's owner |
| `/sharing/hide` | | `bio` | signed in |
| `/sharing/open`, `/sharing/close` | | `open` | signed in |
| `/cards/view` | `handle` | `handle`, `card` | anyone |
| `/search` | `tags` (a list, may be empty) | `people`: each `handle`, `listedOn`, `card` | signed in |
| `/tags/suggest` | `text` | `tags`: each `tag`, `name`, `main`, `mainName` | anyone |
| `/templates/list` | | `templates` | anyone |

A `card` is what a bio shows: `tags` (each with `name` and the broader tags it lies `under`) and `look` (`template`, `layout`, `font`, `palette`).

A refused request answers with a status of 400, 401, 404, or 409 and a body like this. Show `detail` to the person as it is.

```json
{ "error": "CONFLICT", "code": "HANDLE_REQUIRED", "detail": "Claim a handle before you display a bio." }
```

## Calling it from a page

```ts
import { api, reason, refused } from "../api.ts";

const result = await api.bios.tags.add({ bio, tag });
if (refused(result)) return say(reason(result));
draw(result.card);
```

The call names follow the paths, and TypeScript knows every input and answer.

## Changing things

- **A page:** edit its file in `src/web/pages/`, save, and reload the browser.
- **A tag, another name, or a group:** edit `src/seed/vocabulary.ts` and restart. The loader only adds; it never renames or removes. To rename or remove something already loaded, empty your local database with `docker compose down -v`, then `bun run db:up`. A deployed database has to be fixed by hand.
- **An endpoint:** edit its file in `src/compositions/`, say what it does in the matching file in `design/compositions/`, then run `bun run generate` and `bun run check`.
- **A refusal message:** `applicationSentences` in `src/host/http-policy.ts`.

## What is left for the alpha

- **The pages.** Each page works but is plain. They need real interaction and visual design. The owners are the ones in `development-plan.md`:

  | Piece | Files | Owner |
  | --- | --- | --- |
  | Bio editor with live preview | `src/web/pages/editor.ts`, `src/web/tag-picker.ts`, `src/web/card.ts` | Heyang |
  | Public bio page, search page | `src/web/pages/public-card.ts`, `src/web/pages/search.ts` | Katherine |
  | Sign-in page, visual design, deployment | `src/web/pages/sign-in.ts`, the CSS in `src/web/index.html` | Samantha |
  | Tag list, search rule | `src/seed/vocabulary.ts`, `src/compositions/Discovery.ts` | Eric |

- **The card's look.** The three layouts, four fonts, and four color schemes are a few lines of CSS at the end of `src/web/index.html`.
- **Deploying.** On mit-sdg.dev: install `bun install`, build `bun run build`, start `bun run start`, health check `/health`, port 3000, add MongoDB, and set `PUBLIC_ORIGIN` to the app's https address. Without `PUBLIC_ORIGIN` the app starts but refuses every request from the browser.
- **The tag list.** `src/seed/vocabulary.ts` needs a second pair of eyes on every name.
- **The alpha's other deliverables.** The narrated screen recording linked in the README, the updated designs, and the updated development plan.
