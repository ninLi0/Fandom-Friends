/**
 * Saved bios: keeping several, tagging them, and choosing how each one looks.
 *
 * A bio is a Drafting draft. Its public details, tags, and look live in Describing, Tagging, and Templating,
 * each keyed by the draft.
 * Every endpoint that reads or changes one bio first resolves the session to a person and then checks that
 * the bio is one of that person's saved bios, so nobody can touch a bio by guessing its identity.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, view, when, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { fonts, palettes } from "../seed/offered.ts";
import {
  bioCardOutput,
  bioDetailsInput,
  bioNameInput,
  bioOnlyInput,
  bioOutput,
  bioRenameInput,
  bioChoiceInput,
  bioTagInput,
  bioTemplateInput,
  ownBioOutput,
  savedBiosOutput,
  sessionOnlyInput,
} from "./validators.ts";

const { Describing, Drafting, Grouping, Publishing, Sessioning, Synonymizing, Tagging, Templating } = concepts;

/** Holds when the bio is one of the person's saved bios. An unknown bio is nobody's. */
export const OwnBio = view("(bio) is one of (user)'s saved bios", ({ user, bio }, _outputs, _bindings) =>
  where(Drafting._owner({ draft: bio }).is({ owner: user })),
).holds();

/**
 * What a bio shows: its public details, tags with their broader tags, and the look in effect.
 * The owner's preview, the public page, and a search result all show this same card.
 */
export const Card = former(
  "the card of (bio)",
  ({ bio }, { displayName, note, tag, name, broader, direct, broaderName, template, layout, font, palette }) =>
    where(
      Describing._get({ item: bio }).is({ name: displayName, text: note }),
      whether(Templating._look({ item: bio }).is({ template, layout, font, palette })),
    ).form({
      displayName,
      note,
      tags: each(Tagging._tagsOf({ item: bio }).is({ tag, name })).form({
        tag,
        name,
        under: each(Grouping._above({ item: tag }).is({ broader, direct }))
          .where(Tagging._get({ tag: broader }).is({ name: broaderName }))
          .form({ tag: broader, name: broaderName, direct }),
      }),
      look: form({ template, layout, font, palette }),
    }),
);

/** The person's saved bios, in name order. */
const SavedBios = former("the saved bios of (user)", ({ user }, { bio, name }) =>
  each(Drafting._draftsOf({ owner: user }).is({ draft: bio, name })).form({ bio, name }),
);

/** The owner's explicit choices, distinct from the defaults visible on the card. */
const LookOverrides = former("the font and palette overrides of (bio)", ({ bio }, { font, palette }) =>
  where(Templating._overrides({ item: bio }).is({ font, palette })).form({ font, palette }),
);

const ListBios = endpoint(
  "/bios/list",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ bios: SavedBios({ user }) })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: savedBiosOutput } },
);

const StartBio = endpoint(
  "/bios/start",
  ({ session, name, user, bio }) =>
    receive({ session, name })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Drafting.start({ owner: user, name }).responds({ draft: bio }))
      .then(respond({ bio })),
  { input: { required: ["session", "name"] }, validators: { input: bioNameInput, output: bioOutput } },
);

const ViewBio = endpoint(
  "/bios/view",
  ({ session, bio, user, name }) =>
    receive({ session, bio })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }), Drafting._get({ draft: bio }).is({ name }))
          .then(respond({ bio, name, card: Card({ bio }), overrides: LookOverrides({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio"] }, validators: { input: bioOnlyInput, output: ownBioOutput } },
);

const RenameBio = endpoint(
  "/bios/rename",
  ({ session, bio, name, user }) =>
    receive({ session, bio, name })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Drafting.rename({ draft: bio, name }).responds({}))
          .then(respond({ bio }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio", "name"] }, validators: { input: bioRenameInput, output: bioOutput } },
);

const SetBioDetails = endpoint(
  "/bios/details",
  ({ session, bio, displayName, note, user }) =>
    receive({ session, bio, displayName, note })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Describing.set({ item: bio, name: displayName, text: note }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  {
    input: { required: ["session", "bio", "displayName", "note"] },
    validators: { input: bioDetailsInput, output: bioCardOutput },
  },
);

/**
 * A discarded bio must not stay public, so the displayed bio is taken down first and discarded second, and the
 * answer comes only after both. Its details, tags, and look are cleared by the reactions below.
 *
 * The displayed check asks who displays this bio, with the bio as the query's input. Asking what the person
 * displays, with the bio as an output, would match whatever bio they display: taking a bio down needs only the
 * person, so that step would not read the bio from the request, and the name would be a new one.
 */
const DiscardBio = endpoint(
  "/bios/discard",
  ({ session, bio, user }) =>
    receive({ session, bio })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }), Publishing._publisherOf({ item: bio }).is({ publisher: user }))
          .then(Publishing.unpublish({ publisher: user }).responds({}))
          .then(Drafting.discard({ draft: bio }).responds({}))
          .then(respond({ bio }))
          .named("displayed-bio"),
        where(OwnBio({ user, bio }), no(Publishing._publisherOf({ item: bio }).is({ publisher: user })))
          .then(Drafting.discard({ draft: bio }).responds({}))
          .then(respond({ bio }))
          .named("undisplayed-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio"] }, validators: { input: bioOnlyInput, output: bioOutput } },
);

/** A discarded bio keeps no tags. */
const DiscardedBioLosesItsTags = reaction(({ bio, tag }) =>
  when(Drafting.discard({ draft: bio }).responds({}))
    .where(Tagging._tagsOf({ item: bio }).is({ tag }))
    .then(Tagging.remove({ item: bio, tag })),
);

/** A discarded bio keeps no look. */
const DiscardedBioLosesItsLook = reaction(({ bio }) =>
  when(Drafting.discard({ draft: bio }).responds({}))
    .where(Templating._styled({ item: bio }).is({ styled: true }))
    .then(Templating.remove({ item: bio })),
);

/** Cleanup also works for a legacy bio that never received public details. */
const DiscardedBioLosesItsDetails = reaction(({ bio }) =>
  when(Drafting.discard({ draft: bio }).responds({}))
    .then(Describing.remove({ item: bio })),
);

/**
 * Adding a tag adds the main tag it stands for, so "Sousou no Frieren" adds "Frieren".
 * A tag with no main tag stands for itself.
 */
const AddTag = endpoint(
  "/bios/tags/add",
  ({ session, bio, tag, user, main }) =>
    receive({ session, bio, tag })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }), Synonymizing._canonical({ item: tag }).is({ canonical: main }))
          .then(Tagging.add({ item: bio, tag: main }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio", "tag"] }, validators: { input: bioTagInput, output: bioCardOutput } },
);

const RemoveTag = endpoint(
  "/bios/tags/remove",
  ({ session, bio, tag, user, main }) =>
    receive({ session, bio, tag })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }), Synonymizing._canonical({ item: tag }).is({ canonical: main }))
          .then(Tagging.remove({ item: bio, tag: main }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio", "tag"] }, validators: { input: bioTagInput, output: bioCardOutput } },
);

const ChooseTemplate = endpoint(
  "/bios/look/template",
  ({ session, bio, template, user }) =>
    receive({ session, bio, template })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Templating.apply({ item: bio, template }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  {
    input: { required: ["session", "bio", "template"] },
    validators: { input: bioTemplateInput, output: bioCardOutput },
  },
);

const ChooseFont = endpoint(
  "/bios/look/font",
  ({ session, bio, font, user }) =>
    receive({ session, bio, font })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Templating.setFont({ item: bio, font }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  {
    input: { required: ["session", "bio", "font"] },
    validators: { input: bioChoiceInput("font", fonts), output: bioCardOutput },
  },
);

const ChoosePalette = endpoint(
  "/bios/look/palette",
  ({ session, bio, palette, user }) =>
    receive({ session, bio, palette })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Templating.setPalette({ item: bio, palette }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  {
    input: { required: ["session", "bio", "palette"] },
    validators: { input: bioChoiceInput("palette", palettes), output: bioCardOutput },
  },
);

/** Goes back to the template's own font and palette. */
const ResetLook = endpoint(
  "/bios/look/reset",
  ({ session, bio, user }) =>
    receive({ session, bio })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Templating.reset({ item: bio }).responds({}))
          .then(respond({ bio, card: Card({ bio }) }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio"] }, validators: { input: bioOnlyInput, output: bioCardOutput } },
);

export const composition = {
  Keeping: { OwnBio, Card, SavedBios, LookOverrides, ListBios, StartBio, ViewBio, RenameBio, SetBioDetails },
  Discarding: { DiscardBio, DiscardedBioLosesItsTags, DiscardedBioLosesItsLook, DiscardedBioLosesItsDetails },
  Tagging: { AddTag, RemoveTag },
  Styling: { ChooseTemplate, ChooseFont, ChoosePalette, ResetLook },
};
