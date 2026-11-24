import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Templating.md" with { type: "text" };
import type { Draft } from "../Drafting/Drafting.ts";
import {
  InvalidLookFont,
  InvalidLookLayout,
  InvalidLookPalette,
  InvalidTemplateName,
  LookNotCustomized,
  LookNotSet,
  TemplateAlreadyApplied,
  TemplateAlreadyDefault,
  TemplateInUse,
  TemplateIsDefault,
  TemplateNameTaken,
  TemplateNotFound,
  TemplatingConcept,
} from "./Templating.ts";

/** Looks of saved bios, as `design/types.md` binds it. */
export class Templating extends TemplatingConcept<Draft> {}

export const templating = registerConcept({
  class: Templating,
  spec,
  refusals: {
    INVALID_TEMPLATE_NAME: InvalidTemplateName,
    INVALID_LOOK_LAYOUT: InvalidLookLayout,
    INVALID_LOOK_FONT: InvalidLookFont,
    INVALID_LOOK_PALETTE: InvalidLookPalette,
    TEMPLATE_NAME_TAKEN: TemplateNameTaken,
    TEMPLATE_NOT_FOUND: TemplateNotFound,
    TEMPLATE_ALREADY_DEFAULT: TemplateAlreadyDefault,
    TEMPLATE_IS_DEFAULT: TemplateIsDefault,
    TEMPLATE_IN_USE: TemplateInUse,
    TEMPLATE_ALREADY_APPLIED: TemplateAlreadyApplied,
    LOOK_NOT_CUSTOMIZED: LookNotCustomized,
    LOOK_NOT_SET: LookNotSet,
  },
});
