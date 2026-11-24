# Fandom Friends

6.1040 Fall 2026 team project.

Fandom Friends helps people in online fandoms introduce themselves with a bio card built from tags and find fans who share their specific interests. Connecting only when both sides are interested is planned for the beta.

## The alpha (F4)

- **Updated designs:** [Concept design](concept-design.md), [Design summary](design-summary.md) and [User journey](user-journey.md), updated from F3.
- **Updated development plan:** [Development plan](development-plan.md), with progress at the alpha and what remains.
- **Deployed app:** https://fandom-friends.mit-sdg.dev
- **Screen recording:** https://youtu.be/t7EpGaloGN4, narrated.

## Run it

You need [Bun](https://bun.sh) 1.4.2, and Docker with Docker Compose to run MongoDB.

```bash
bun install
bun run db:up
bun run dev
```

Open http://localhost:3000. `bun run test` runs the tests. [DEVELOPING.md](DEVELOPING.md) has the details.

## Project documents

- [F2: Problem framing and ethical analysis](problem-framing.md)
- [F3: Problem framing](problem-framing-f3.md)
- [F3: User journey](user-journey.md)
- [F3 and F4: Concept design](concept-design.md), updated for the alpha. The exact specifications are in [design/concepts](design/concepts) and the reactions in [design/compositions](design/compositions).
- [F3 and F4: Development plan](development-plan.md), with progress at the alpha
- [F3: Visual design study](fandom-friends-design-study.pptx)
- [F3 and F4: Design summary](design-summary.md), with the alpha's scope settled
- [Team](team.md): Eric Ni, Samantha Shih, Heyang Ni, Katherine Liu
