import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Publishing.md" with { type: "text" };
import type { Account } from "../Authenticating/Authenticating.ts";
import type { Draft } from "../Drafting/Drafting.ts";
import {
  AlreadyListed,
  AlreadyPublished,
  HandleAlreadyClaimed,
  HandleRequired,
  HandleTaken,
  InvalidHandle,
  NoHandle,
  NotListed,
  NothingPublished,
  PublishingConcept,
  StillPublished,
} from "./Publishing.ts";

/** Each account's handle and its one public bio, as `design/types.md` binds it. A bio is a draft. */
export class Publishing extends PublishingConcept<Account, Draft> {}

export const publishing = registerConcept({
  class: Publishing,
  spec,
  refusals: {
    HANDLE_ALREADY_CLAIMED: HandleAlreadyClaimed,
    INVALID_HANDLE: InvalidHandle,
    HANDLE_TAKEN: HandleTaken,
    HANDLE_REQUIRED: HandleRequired,
    ALREADY_PUBLISHED: AlreadyPublished,
    NOTHING_PUBLISHED: NothingPublished,
    ALREADY_LISTED: AlreadyListed,
    NOT_LISTED: NotListed,
    NO_HANDLE: NoHandle,
    STILL_PUBLISHED: StillPublished,
  },
});
