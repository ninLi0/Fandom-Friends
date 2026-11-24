/**
 * Loads the starter vocabulary into the concepts. Safe to run on every startup: it adds what is missing and
 * changes nothing that is already there, so tags a person already put on a bio keep their identity.
 */
import type { Instances } from "../assembly.ts";
import type { Tag } from "../concepts/Tagging/Tagging.ts";
import { tags as starterTags, templates as starterTemplates, type SeedTag, type SeedTemplate } from "./vocabulary.ts";

/** The four concepts that hold the vocabulary, as src/assembly.ts builds them. */
export type VocabularyConcepts = Pick<Instances, "Tagging" | "Synonymizing" | "Grouping" | "Templating">;

export interface SeedReport {
  readonly tagsDefined: number;
  readonly namesLinked: number;
  readonly placementsMade: number;
  readonly templatesDefined: number;
}

/** Every name the list uses, main or not. A repeated name would make "the tag called X" ambiguous. */
function everyName(tags: readonly SeedTag[]): string[] {
  return tags.flatMap(({ name, alsoCalled = [] }) => [name, ...alsoCalled]);
}

/** The rule Tagging and Templating hold every name to. */
const acceptable = (text: string): boolean => text.trim().length > 0 && text.length <= 64;

/** The first value that comes up a second time, if any. */
const firstRepeated = (values: readonly string[]): string | undefined =>
  values.find((value, index) => values.indexOf(value) !== index);

/** True when following `under` upward from a tag leads back to it. */
function liesUnderItself(tags: readonly SeedTag[], start: string): boolean {
  const reached = new Set<string>();
  const waiting = [start];
  while (waiting.length > 0) {
    const current = waiting.pop();
    for (const parent of tags.find(({ name }) => name === current)?.under ?? []) {
      if (parent === start) return true;
      if (reached.has(parent)) continue;
      reached.add(parent);
      waiting.push(parent);
    }
  }
  return false;
}

/**
 * Finds every fault a concept would refuse, before anything is saved. A list that failed halfway would leave
 * its first half in the database, and the loader never removes what it added.
 */
function checkList(tags: readonly SeedTag[], templates: readonly SeedTemplate[]): void {
  const names = everyName(tags);
  const unacceptable = names.find((name) => !acceptable(name));
  if (unacceptable !== undefined) {
    throw new Error(`The tag name "${unacceptable}" is blank or longer than 64 characters.`);
  }
  const repeated = firstRepeated(names);
  if (repeated !== undefined) throw new Error(`The tag list uses the name "${repeated}" twice.`);

  const mains = new Set(tags.map(({ name }) => name));
  for (const { name, under = [] } of tags) {
    const missing = under.find((parent) => !mains.has(parent));
    if (missing !== undefined) throw new Error(`"${name}" is placed under "${missing}", which is not a main tag in the list.`);
    const twice = firstRepeated(under);
    if (twice !== undefined) throw new Error(`"${name}" is placed under "${twice}" twice.`);
  }
  const looped = tags.find(({ name }) => liesUnderItself(tags, name));
  if (looped !== undefined) throw new Error(`"${looped.name}" lies under itself.`);

  for (const { name, layout, font, palette } of templates) {
    const parts = { name, layout, font, palette };
    const bad = (Object.keys(parts) as (keyof typeof parts)[]).find((part) => !acceptable(parts[part]));
    if (bad !== undefined) {
      throw new Error(`The ${bad} "${parts[bad]}" of a template is blank or longer than 64 characters.`);
    }
  }
  const repeatedTemplate = firstRepeated(templates.map(({ name }) => name));
  if (repeatedTemplate !== undefined) throw new Error(`The template list uses the name "${repeatedTemplate}" twice.`);
  if (templates.filter((template) => template.default).length !== 1) {
    throw new Error("Exactly one template must be the default.");
  }
}

export async function seedVocabulary(
  { Tagging, Synonymizing, Grouping, Templating }: VocabularyConcepts,
  tags: readonly SeedTag[] = starterTags,
  templates: readonly SeedTemplate[] = starterTemplates,
): Promise<SeedReport> {
  checkList(tags, templates);
  const report = { tagsDefined: 0, namesLinked: 0, placementsMade: 0, templatesDefined: 0 };

  // Tags, by exact name. A name already in use keeps the tag it has.
  const byName = new Map<string, Tag>();
  for (const { tag, name } of await Tagging._suggest({ text: "" })) {
    if (!byName.has(name)) byName.set(name, tag);
  }
  for (const name of everyName(tags)) {
    if (byName.has(name)) continue;
    byName.set(name, (await Tagging.define({ name })).tag);
    report.tagsDefined += 1;
  }
  const tagCalled = (name: string): Tag => byName.get(name)!;

  // Other names point at their main tag. A name that already points somewhere is left alone.
  for (const { name, alsoCalled = [] } of tags) {
    for (const other of alsoCalled) {
      const item = tagCalled(other);
      const { canonical } = await Synonymizing._canonical({ item });
      if (canonical !== item) continue;
      await Synonymizing.link({ item, canonical: tagCalled(name) });
      report.namesLinked += 1;
    }
  }

  // Each tag lies under its broader tags.
  for (const { name, under = [] } of tags) {
    const item = tagCalled(name);
    const placed = new Set((await Grouping._above({ item })).filter(({ direct }) => direct).map(({ broader }) => broader));
    for (const parentName of under) {
      const parent = tagCalled(parentName);
      if (placed.has(parent)) continue;
      await Grouping.place({ item, parent });
      report.placementsMade += 1;
    }
  }

  // Templates, by name. The default is set only when there is none, so a later choice by the team stays.
  const existing = await Templating._templates({});
  const templateByName = new Map(existing.map(({ name, template }) => [name, template]));
  for (const { name, layout, font, palette } of templates) {
    if (templateByName.has(name)) continue;
    templateByName.set(name, (await Templating.define({ name, layout, font, palette })).template);
    report.templatesDefined += 1;
  }
  if (!existing.some((template) => template.default)) {
    const chosen = templates.find((template) => template.default)!;
    await Templating.makeDefault({ template: templateByName.get(chosen.name)! });
  }

  return report;
}
