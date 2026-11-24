/**
 * Sharing: the handle a person is reached by, which one bio is public, and whether it is open to new friends.
 *
 * Publishing holds all three facts. A person changes only their own: every endpoint here acts for the person
 * the session resolves to, and displaying a bio also checks that the bio is one of theirs.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { former, no, view, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { Card, OwnBio } from "./Bios.ts";
import {
  bioOnlyInput,
  bioOutput,
  claimInput,
  handleInput,
  handleOutput,
  openOutput,
  publicCardOutput,
  releasedOutput,
  sessionOnlyInput,
  sharingOutput,
} from "./validators.ts";

const { Publishing, Sessioning } = concepts;

/** The bio that a handle's address shows. A handle with nothing displayed shows no bio. */
export const PublicBio = view("the bio shown at (handle)", ({ handle }, { bio }, { person }) =>
  where(
    Publishing._byHandle({ handle }).is({ user: person }),
    Publishing._published({ publisher: person }).is({ item: bio }),
  ),
).optional();

/** A person's handle, displayed bio, and whether it is open to new friends; each is blank until chosen. */
const SharingStatus = former("how (user) is sharing", ({ user }, { handle, bio, open }) =>
  where(
    whether(Publishing._handle({ user }).is({ handle })),
    whether(Publishing._published({ publisher: user }).is({ item: bio, listed: open })),
  ).form({ handle, displayed: bio, open }),
);

const Status = endpoint(
  "/sharing/status",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ sharing: SharingStatus({ user }) })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: sharingOutput } },
);

const ClaimHandle = endpoint(
  "/sharing/claim",
  ({ session, handle, user }) =>
    receive({ session, handle })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Publishing.claim({ user, handle }).responds({}))
      .then(respond({ handle })),
  { input: { required: ["session", "handle"] }, validators: { input: claimInput, output: handleOutput } },
);

const ReleaseHandle = endpoint(
  "/sharing/release",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Publishing.release({ user }).responds({}))
      .then(respond({ released: true })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: releasedOutput } },
);

/** "Display This Bio": this bio becomes the person's one public bio, in place of any other. */
const DisplayBio = endpoint(
  "/sharing/display",
  ({ session, bio, user }) =>
    receive({ session, bio })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(OwnBio({ user, bio }))
          .then(Publishing.publish({ publisher: user, item: bio }).responds({}))
          .then(respond({ bio }))
          .named("own-bio"),
        where(no(OwnBio({ user, bio })))
          .then(respond({ error: "BIO_NOT_FOUND" }))
          .named("not-own-bio"),
      ),
  { input: { required: ["session", "bio"] }, validators: { input: bioOnlyInput, output: bioOutput } },
);

/** Stops showing any bio. The handle stays the person's. */
const HideBio = endpoint(
  "/sharing/hide",
  ({ session, user, bio }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Publishing.unpublish({ publisher: user }).responds({ item: bio }))
      .then(respond({ bio })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: bioOutput } },
);

/** Turns on Open to New Friends: the displayed bio can be found by search. */
const OpenToNewFriends = endpoint(
  "/sharing/open",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Publishing.list({ publisher: user }).responds({}))
      .then(respond({ open: true })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: openOutput } },
);

/** Turns off Open to New Friends. The bio's address still works. */
const CloseToNewFriends = endpoint(
  "/sharing/close",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Publishing.unlist({ publisher: user }).responds({}))
      .then(respond({ open: false })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: openOutput } },
);

/** Anyone with the address may open a displayed bio; no session is asked for. */
const ViewCard = endpoint(
  "/cards/view",
  ({ handle, bio }) =>
    receive({ handle }).then(
      where(PublicBio({ handle }).is({ bio }))
        .then(respond({ handle, card: Card({ bio }) }))
        .named("displayed"),
      where(no(PublicBio({ handle })))
        .then(respond({ error: "CARD_NOT_FOUND" }))
        .named("nothing-displayed"),
    ),
  { input: { required: ["handle"] }, validators: { input: handleInput, output: publicCardOutput } },
);

export const composition = {
  Handles: { ClaimHandle, ReleaseHandle },
  Displaying: { SharingStatus, Status, DisplayBio, HideBio },
  Listing: { OpenToNewFriends, CloseToNewFriends },
  PublicCards: { PublicBio, ViewCard },
};
