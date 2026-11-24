import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Synonymizing.md" with { type: "text" };
import type { Tag } from "../Tagging/Tagging.ts";
import {
  SynonymAlreadyLinked,
  SynonymCanonicalLinked,
  SynonymIsCanonical,
  SynonymNotLinked,
  SynonymOfItself,
  SynonymizingConcept,
} from "./Synonymizing.ts";

/** Tags that mean the same tag, as `design/types.md` binds it. */
export class Synonymizing extends SynonymizingConcept<Tag> {}

export const synonymizing = registerConcept({
  class: Synonymizing,
  spec,
  refusals: {
    SYNONYM_OF_ITSELF: SynonymOfItself,
    SYNONYM_ALREADY_LINKED: SynonymAlreadyLinked,
    SYNONYM_CANONICAL_LINKED: SynonymCanonicalLinked,
    SYNONYM_IS_CANONICAL: SynonymIsCanonical,
    SYNONYM_NOT_LINKED: SynonymNotLinked,
  },
});
