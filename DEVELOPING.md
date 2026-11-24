# Developing Fandom Friends

This is the working backbone of the alpha: the concepts, the reactions that connect them, the tag list, tests, and one page per area. Heyang's MVP editor, tag picker, and shared card design have been adapted to the alpha API. The other pages keep their starting styles so their owners can work on them independently.

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

Open http://localhost:3000. The tag list and the alpha/MVP templates load by themselves on the first start.

Before you push:

```bash
bun run test
```

```bash
bun run check
```

## What is where

| Folder | What it holds |
| --- | --- |
| `design/concepts/` | The concept specifications. The framework checks each one against its code. |
| `design/compositions/` | What each group of endpoints does, in words, with a link to every reaction. |
| `design/types.md` | Which concept's type stands for what: a bio is a draft, a person is an account. |
| `src/concepts/<Name>/` | One class per concept (stores its state in MongoDB) and its registration. |
| `src/compositions/` | The endpoints. Each one is a reaction: a request, checks, concept actions, an answer. |
| `src/seed/vocabulary.ts` | The Frieren tag list, other names, groups, templates, fonts, and color schemes. |
| `src/seed/pictures.ts` | The picture of each series and character tag, by the tag's main name: a link to an image at AniList. Nothing is copied or stored. |
| `src/web/` | The pages. `pages/` has one file per page; `card.ts` draws a bio card and `card-pictures.ts` places the pictures on it; `api.ts` is the typed client; `editor-styles.ts` holds the scoped editor and shared card/tag-picker styles, and `site-styles.ts` the top bar, sign-in page and search page styles. |
| `src/host/` | The server: HTTP, the session cookie, and the sentence shown for each refusal. |
| `src/storage/` | The MongoDB connection, and the lock that keeps two starting servers from loading the tag list twice. |
| `tests/` | `concepts/` tests each concept alone. `http/` tests the endpoints the way a browser calls them. `seed/` tests the tag list and its loader. |
| `generated/` | Written by `bun run generate`. Never edit it by hand. |

## The concepts

| Concept | What it keeps | Used for |
| --- | --- | --- |
| Authenticating | usernames and passwords | sign-in |
| Sessioning | who a browser is signed in as | sign-in |
| Drafting | a person's saved bios, by name | several bios per person |
| Describing | a bio's public display name and short note | public profile details |
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
| `/bios/view` | `bio` | `bio`, `name`, `card`, `overrides` | the bio's owner |
| `/bios/rename` | `bio`, `name` | `bio` | the bio's owner |
| `/bios/details` | `bio`, `displayName`, `note` | `bio`, `card` | the bio's owner |
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

A `card` is what a bio shows: `displayName`, `note`, `tags` (each with `name` and the broader tags it lies `under`), and `look` (`template`, `layout`, `font`, `palette`). The owner's `overrides` distinguish chosen font/palette values from a template's defaults.

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

## MVP editor migration

The editor's markup, card markup, styles, and controls follow local MVP commit `89c72bf`. Edits stay in the browser's draft and live preview until **Save bio** or **Save & display this bio**. **Save as new**, Ctrl/Cmd+S, and prompts before discarding unsaved changes are restored. The three editor layouts are Convention poster, Side by side, and Quiet notes; the fonts and palettes match that commit.

The alpha adds owner-protected storage for public display names and notes, plus a query for explicit font/palette overrides. Saved bio names stay private. Existing alpha templates and the team's tag vocabulary remain available; existing bios keep their look until their owner changes it. The alpha requires unique saved bio names, so **Save as new** gives a same-name copy a private `(copy)` suffix. Saving uses the alpha's per-action endpoints; if a request fails midway, the draft stays unsaved and another save reads the current server state before retrying.

The old SQLite data is not imported into MongoDB by this UI migration. The untracked custom-color utility is separate work and was not part of `89c72bf`.

## Deployment on 6.1040 Apps

Follow the [course deployment guide](https://61040.github.io/fa26/resources/deploying-apps/) with these settings for this repository:

| Setting | Value |
| --- | --- |
| Repository URL | `https://github.com/ninLi0/Fandom-Friends` |
| Branch | `main` |
| Runtime | Bun; `packageManager` pins the version |
| Package directories | `.` alone |
| Build script | Leave empty; this server bundles the browser code at startup |
| Start script | `start` |
| Port | `3000` |
| Health check path | `/health` |

Add MongoDB and keep the suggested variable name **`MONGODB_URI`**, which is what `src/storage/mongo.ts` reads. Set **`PUBLIC_ORIGIN`** to the app's full HTTPS address, such as `https://your-app.mit-sdg.dev`, with no trailing slash. The platform supplies `HOST`, `PORT`, `NODE_ENV`, and the database connection string. Docker and the local `.env` are not used on the platform. Commit and push the code before selecting that commit for deployment; pushing alone does not deploy it.

This app serves its pages and API from one server. The guide's two-server plain-TypeScript example does not require changing this app to run two servers.

## What is left after the alpha

- **Stars and a person's own pictures.** Both are in `user-journey.md` and neither is built. Cards show pictures already, but they come from the tag, not from the person (see `src/seed/pictures.ts`).
- **More series.** Adding one means adding its tags to `src/seed/vocabulary.ts` and its pictures to `src/seed/pictures.ts`. `tests/seed/Pictures.test.ts` fails if a picture names a tag that does not exist.
- **Reporting a card.** The description on a bio is free text and nothing filters it.
- **The tag list.** `src/seed/vocabulary.ts` needs a second pair of eyes on every name.
