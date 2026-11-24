import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Grouping.md" with { type: "text" };
import type { Tag } from "../Tagging/Tagging.ts";
import { GroupAlreadyPlaced, GroupCycle, GroupNotPlaced, GroupSameItem, GroupingConcept } from "./Grouping.ts";

/** Tags placed under broader tags, as `design/types.md` binds it. */
export class Grouping extends GroupingConcept<Tag> {}

export const grouping = registerConcept({
  class: Grouping,
  spec,
  refusals: {
    GROUP_SAME_ITEM: GroupSameItem,
    GROUP_ALREADY_PLACED: GroupAlreadyPlaced,
    GROUP_CYCLE: GroupCycle,
    GROUP_NOT_PLACED: GroupNotPlaced,
  },
});
