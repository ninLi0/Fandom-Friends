# Third-party material

Two parts of this project started from other people's code. Everything else was written for Fandom Friends.

## ConceptBox (MIT License)

The Sessioning concept comes from [MIT SDG's ConceptBox](https://github.com/mit-sdg/conceptbox). Copyright (c) 2026 Eagon Meng. The full notice is in [licenses/ConceptBox.txt](licenses/ConceptBox.txt).

| Local file | Changes |
| --- | --- |
| `design/concepts/Sessioning.md` | None. |
| `src/concepts/Sessioning/Sessioning.ts` | None, apart from one comment line naming its origin. |
| `src/concepts/Sessioning/registry.ts` | New: registers the concept with an account as its subject. |

## Sync Engine examples (Apache License 2.0)

Sign-in started from the message-board example shipped inside `@mit-sdg/sync-engine` 1.2.0. Copyright 2026 Barish Namazov and Eagon Meng. The license is in [licenses/sync-engine-LICENSE.txt](licenses/sync-engine-LICENSE.txt) and its notice file in [licenses/sync-engine-NOTICE.txt](licenses/sync-engine-NOTICE.txt).

| Local file | Changes |
| --- | --- |
| `design/concepts/Authenticating.md` | Reworded; same actions, query, and refusals. |
| `src/concepts/Authenticating/Authenticating.ts` | Stores accounts in MongoDB instead of memory, handles two registrations of one username at the same moment, and lets a test lower the cost of password hashing. |
| `src/concepts/Authenticating/registry.ts` | Imports the specification from this project's design folder. |
| `src/compositions/Sessions.ts`, `design/compositions/Sessions.md` | Uses this project's Sessioning (`start`, `use`, `end`) and answers with a username. |
| `src/compositions/validators.ts` | Keeps the helper functions and the four sign-in validators; every other validator is new. |
| `src/host/http-policy.ts` | Keeps the shape of the cookie policy; the refusal table and sentences are new. |

The framework itself (`@mit-sdg/sync-engine`, `@mit-sdg/sync-engine-http`) and the MongoDB driver are ordinary dependencies listed in `package.json`.
