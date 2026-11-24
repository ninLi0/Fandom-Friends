import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Drafting.md" with { type: "text" };
import type { Account } from "../Authenticating/Authenticating.ts";
import { DraftNameTaken, DraftNotFound, DraftingConcept, InvalidDraftName } from "./Drafting.ts";

/** Drafts owned by an account, as `design/types.md` binds it. A draft is a saved bio. */
export class Drafting extends DraftingConcept<Account> {}

export const drafting = registerConcept({
  class: Drafting,
  spec,
  refusals: {
    INVALID_DRAFT_NAME: InvalidDraftName,
    DRAFT_NAME_TAKEN: DraftNameTaken,
    DRAFT_NOT_FOUND: DraftNotFound,
  },
});
