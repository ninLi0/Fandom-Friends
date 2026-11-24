import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Describing.md" with { type: "text" };
import type { Draft } from "../Drafting/Drafting.ts";
import { DescribingConcept, InvalidDescriptionName, InvalidDescriptionText } from "./Describing.ts";

/** Public details of saved bios, keyed by the same draft as their tags and look. */
export class Describing extends DescribingConcept<Draft> {}

export const describing = registerConcept({
  class: Describing,
  spec,
  refusals: {
    INVALID_DESCRIPTION_NAME: InvalidDescriptionName,
    INVALID_DESCRIPTION_TEXT: InvalidDescriptionText,
  },
});
