import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { searchedTagAt, searchedTags } from "./computations.ts";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { drafting } from "./concepts/Drafting/registry.ts";
import { describing } from "./concepts/Describing/registry.ts";
import { grouping } from "./concepts/Grouping/registry.ts";
import { publishing } from "./concepts/Publishing/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";
import { synonymizing } from "./concepts/Synonymizing/registry.ts";
import { tagging } from "./concepts/Tagging/registry.ts";
import { templating } from "./concepts/Templating/registry.ts";

/**
 * Every concept the application uses, by instance name. To add a concept: write its specification under
 * design/concepts/, its class and registry under src/concepts/, list it here (twice), declare it in
 * design/types.md, construct it in src/assembly.ts, and give its refusals a category in src/host/http-policy.ts.
 */
export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  Sessioning: sessioning,
  Drafting: drafting,
  Describing: describing,
  Tagging: tagging,
  Synonymizing: synonymizing,
  Grouping: grouping,
  Templating: templating,
  Publishing: publishing,
}, { searchedTagAt, searchedTags });

export const { concepts, computations } = applicationConceptSet;

/** The same concepts as a list, for code that reads every specification (the refusal sentences, for one). */
export const registrations = [
  authenticating,
  sessioning,
  drafting,
  describing,
  tagging,
  synonymizing,
  grouping,
  templating,
  publishing,
] as const;
