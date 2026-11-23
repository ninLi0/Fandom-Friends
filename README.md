# Fandom Friends

6.1040 Fall 2026 team project.

Fandom Friends helps people in online fandoms introduce themselves with a bio card built from tags, find fans who share their specific interests, and connect only when both sides are interested.

## Run the MVP

Install **Node.js 22.18 or newer**, then run:

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). `npm run dev` compiles TypeScript and restarts the server when the code changes. Refresh the browser to see frontend changes.

For a normal build and run:

```sh
npm run build
npm start
```

Node runs the server; TypeScript checks the code and compiles it to JavaScript; npm runs these project commands and installs the compiler. There are no runtime packages or external services to configure. Node 22 may print an experimental SQLite warning; SQLite is included in Node.

Accounts, sessions, and bios are stored in `data/fandom-friends.sqlite`, which is excluded from Git. The database is created and the Frieren catalog is loaded on first startup. Restarting the server preserves your data. Back up the entire `data/` directory with the server stopped.

Optional shell settings are listed in [.env.example](.env.example). The app does not load `.env` files automatically. For example, `PORT=3001 npm start` changes the local port. To host it, use a persistent writable disk, set `HOST=0.0.0.0`, put the server behind HTTPS, and set `SECURE_COOKIES=true`. This repository does not include a cloud deployment.

## What the alpha includes

- Registration for adults 18+, sign-in, and sign-out. Login names are private; public handles are separate and stable.
- Up to 20 named, independently saved bios with a display name, optional personal note, and grouped Frieren tags. Alternate names resolve to canonical tags.
- Three layouts, three font options, three palettes, and a live preview. Font and palette overrides carry across layout changes; reset restores template defaults.
- One public bio per account at `/u/your-handle`. Displaying another saved bio replaces it at the same address. Saved edits to a public bio update that public card; edits remain private until saved.
- Explicit **Open to New Friends** discovery opt-in. Unlisting preserves the public link. Unpublishing removes the public card and listing while preserving saved bios and the handle.
- Signed-in discovery with synonym-aware, hierarchical tag search. Every selected tag must match; a pairing counts toward its characters and fandom. Results exclude yourself and appear newest listed first. Search filters never change your bio.
- Owner-only editing and deletion, accessible text cards, and responsive layouts. Deleting a public bio also removes its public card and listing.

Stars, pictures, PNG export, For You, Pass, mutual interest/matching, account deletion, in-app chat, and reporting are outside this alpha. Contact links are also omitted. The current app supports introductions and discovery; the mutual connection flow in the product vision is later work. There are no demonstration accounts or fabricated discovery results.

## Check the implementation

```sh
npm run check
npm test
```

The tests use temporary or in-memory databases. They cover all five concepts, ownership and private-data boundaries, authentication and session expiry, public-card switching and unpublishing, synonym and multi-tag hierarchy search, validation, and persistence after a server restart. HTTP tests need permission to bind to a local port when run in a restricted environment.

To try the full flow manually:

1. Register, add a pairing such as **Fern × Stark** plus **Sketch swaps**, and customize the card.
2. Save it, claim a handle, and choose **Display this bio**. Open its link in a signed-out window.
3. Save another bio. Verify the first remains public until you display the second.
4. Enable **Open to New Friends**. Sign into a second account in a separate browser profile and search **Frieren** plus **Fan art**; the first card matches through its more specific tags.
5. Disable discovery and verify the public link still works. Unpublish and verify the link becomes unavailable.

## Code map

- `src/concepts/`: independent SQLite-backed Tagging, Synonymizing, Grouping, Templating, and Publishing implementations.
- `src/catalog.ts`: manually curated Frieren tags, aliases, parent relationships, and template defaults; idempotent seed function.
- `src/server.ts`: request handling, ownership checks, concept coordination, public projections, search, and static-file serving.
- `src/auth.ts`: salted password hashing and expiring, revocable sessions. Cookies are HttpOnly and SameSite; stored session tokens are hashed.
- `src/client/`: TypeScript interface, shared card renderer, and API client. No frontend framework is required.
- `public/`: HTML shell, responsive styles, and favicon.
- `tests/`: concept and HTTP integration tests.

The design references Concept Box authentication, but no Concept Box implementation was supplied in this repository. This alpha supplies self-contained authentication with Node’s built-in cryptography instead.

## Project documents

- [F2: Problem framing and ethical analysis](problem-framing.md)
- [F3: Problem framing](problem-framing-f3.md)
- [F3: User journey](user-journey.md)
- [F3: Concept design](concept-design.md)
- [F3: Development plan](development-plan.md)
- [F3: Visual design study](fandom-friends-design-study.pptx)
- [F3: Design summary](design-summary.md)
- [Team](team.md): Eric Ni, Samantha Shih, Heyang Ni, Katherine Liu
