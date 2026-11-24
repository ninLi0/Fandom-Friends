import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Tagging.md" with { type: "text" };
import type { Draft } from "../Drafting/Drafting.ts";
import { InvalidTagName, TagAlreadyAdded, TagNotAdded, TagNotFound, TaggingConcept } from "./Tagging.ts";

/** Tags on saved bios, as `design/types.md` binds it. */
export class Tagging extends TaggingConcept<Draft> {}

export const tagging = registerConcept({
  class: Tagging,
  spec,
  refusals: {
    INVALID_TAG_NAME: InvalidTagName,
    TAG_NOT_FOUND: TagNotFound,
    TAG_ALREADY_ADDED: TagAlreadyAdded,
    TAG_NOT_ADDED: TagNotAdded,
  },
});
