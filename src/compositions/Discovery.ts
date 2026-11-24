/**
 * Discovery: a signed-in person searches, by tag, the bios that are open to new friends.
 *
 * A bio must count as having every searched tag. It counts as having a tag when one of its own tags means
 * the same thing, or lies under it: a bio tagged "Fern/Stark" is found by "Frieren". With no tag chosen,
 * everyone who is open to new friends appears. The searcher's own bio is never among the results.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, each, former, no, view, where } from "@mit-sdg/sync-engine/language";
import { mostSearchedTags } from "../computations.ts";
import { computations, concepts } from "../concepts.ts";
import { Card } from "./Bios.ts";
import { searchInput, searchOutput } from "./validators.ts";

const { Grouping, Publishing, Sessioning, Synonymizing, Tagging } = concepts;

/**
 * The main tags a bio counts as having. Either one of its tags means that main tag, or one of its tags
 * (under any of its names) lies below a tag that means it.
 */
export const CountsAsHaving = view(
  "(bio) counts as having (main)",
  ({ bio }, { main }, { worded, wanted, broader }) => [
    where(
      Tagging._tagsOf({ item: bio }).is({ tag: worded }),
      Synonymizing._canonical({ item: worded }).is({ canonical: main }),
    ),
    where(
      Tagging._tagsOf({ item: bio }).is({ tag: worded }),
      Synonymizing._same({ item: worded }).is({ other: wanted }),
      Grouping._above({ item: wanted }).is({ broader }),
      Synonymizing._canonical({ item: broader }).is({ canonical: main }),
    ),
  ],
);

/**
 * Holds when some searched tag is one the bio does not count as having.
 *
 * A reaction cannot loop over a list, so this asks for the searched tag at each position a search may have.
 * A tag that does not exist is a tag no bio has, so searching for it finds nobody.
 */
export const LacksASearchedTag = view(
  "(bio) lacks one of (tags)",
  ({ bio, tags }, _outputs, { tag, main }) =>
    Array.from({ length: mostSearchedTags }, (_unused, at) =>
      where(
        compute(computations.searchedTagAt, { tags, at }, { found: true, tag }),
        Synonymizing._canonical({ item: tag }).is({ canonical: main }),
        no(CountsAsHaving({ bio }).is({ main })),
      ),
    ),
).holds();

/** The people open to new friends whose displayed bio has every searched tag, newest listed first. */
const Matches = former(
  "the people open to new friends matching (tags) for (viewer)",
  ({ viewer, tags }, { person, bio, listedOn, handle }) =>
    each(Publishing._listed({}).is({ publisher: person, item: bio, listedOn }))
      .where(
        Publishing._handle({ user: person }).is({ handle }),
        no(Publishing._publisherOf({ item: bio }).is({ publisher: viewer })),
        no(LacksASearchedTag({ bio, tags })),
      )
      .form({ handle, listedOn, card: Card({ bio }) }),
);

/** The search waits for the session to resolve, then reads the request's tags once each. */
const Search = endpoint(
  "/search",
  ({ session, tags, viewer, wanted }) =>
    receive({ session, tags })
      .then(Sessioning.use({ session }).responds({ subject: viewer }))
      .afterFlowSettles()
      .where(compute(computations.searchedTags, { tags }, wanted))
      .then(respond({ people: Matches({ viewer, tags: wanted }) })),
  { input: { required: ["session", "tags"] }, validators: { input: searchInput, output: searchOutput } },
);

export const composition = {
  Matching: { CountsAsHaving, LacksASearchedTag },
  Searching: { Matches, Search },
};
