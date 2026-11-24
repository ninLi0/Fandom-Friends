import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Sessioning.md" with { type: "text" };
import type { Account } from "../Authenticating/Authenticating.ts";
import { NotSignedIn, SessioningConcept } from "./Sessioning.ts";

/** Sessions whose subject is an account, as `design/types.md` binds it. */
export class Sessioning extends SessioningConcept<Account> {}

export const sessioning = registerConcept({
  class: Sessioning,
  spec,
  refusals: { NOT_SIGNED_IN: NotSignedIn },
});
