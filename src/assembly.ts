import { assemble, type ConceptImplementation } from "@mit-sdg/sync-engine/assembly";
import type { ExecutionLimits } from "@mit-sdg/sync-engine/boundary";
import type { Db } from "mongodb";
import { composition as Bios } from "./compositions/Bios.ts";
import { composition as Discovery } from "./compositions/Discovery.ts";
import { composition as Sessions } from "./compositions/Sessions.ts";
import { composition as Sharing } from "./compositions/Sharing.ts";
import { composition as Vocabulary } from "./compositions/Vocabulary.ts";
import { applicationConceptSet } from "./concepts.ts";
import { AuthenticatingConcept, type PasswordHashing } from "./concepts/Authenticating/Authenticating.ts";
import { Drafting } from "./concepts/Drafting/registry.ts";
import { Grouping } from "./concepts/Grouping/registry.ts";
import { Publishing } from "./concepts/Publishing/registry.ts";
import { Sessioning } from "./concepts/Sessioning/registry.ts";
import { Synonymizing } from "./concepts/Synonymizing/registry.ts";
import { Tagging } from "./concepts/Tagging/registry.ts";
import { Templating } from "./concepts/Templating/registry.ts";

export const executionLimits: ExecutionLimits = {
  maxActiveRootFlows: 64,
  maxPendingRequests: 64,
  maxActionsPerFlow: 200,
  maxFiringsPerFlow: 400,
  maxRowsPerEvaluation: 20_000,
  maxRequestDurationMs: 10_000,
};

export interface Instances {
  Authenticating: ConceptImplementation<typeof AuthenticatingConcept>;
  Sessioning: ConceptImplementation<typeof Sessioning>;
  Drafting: ConceptImplementation<typeof Drafting>;
  Tagging: ConceptImplementation<typeof Tagging>;
  Synonymizing: ConceptImplementation<typeof Synonymizing>;
  Grouping: ConceptImplementation<typeof Grouping>;
  Templating: ConceptImplementation<typeof Templating>;
  Publishing: ConceptImplementation<typeof Publishing>;
}

/** Builds every concept on one database. Each concept keeps its own collections, named after the instance. */
export function createInstances(
  database: Db,
  clock: () => Date = () => new Date(),
  { passwordHashing }: { passwordHashing?: PasswordHashing } = {},
) {
  return {
    Authenticating: new AuthenticatingConcept(database, "Authenticating", passwordHashing),
    Sessioning: new Sessioning(database, "Sessioning", clock),
    Drafting: new Drafting(database, "Drafting"),
    Tagging: new Tagging(database, "Tagging"),
    Synonymizing: new Synonymizing(database, "Synonymizing"),
    Grouping: new Grouping(database, "Grouping"),
    Templating: new Templating(database, "Templating"),
    Publishing: new Publishing(database, "Publishing", clock),
  } satisfies Instances;
}

export function assembleApplication(instances: Instances, clock: () => Date = () => new Date()) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances,
    composition: { Sessions, Bios, Sharing, Vocabulary, Discovery },
    // One request reuses what it has already read; every new request starts from fresh reads.
    queryCache: "memoize",
    executionLimits,
    clock,
  });
}
