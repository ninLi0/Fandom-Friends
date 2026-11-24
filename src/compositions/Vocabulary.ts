/**
 * The shared vocabulary every page reads: the tags a person can pick and the templates a bio can use.
 *
 * Both lists are kept by the team (see src/seed), so there is nothing private in them and no session is asked for.
 */
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { noInput, suggestInput, tagsOutput, templatesOutput } from "./validators.ts";

const { Synonymizing, Tagging, Templating } = concepts;

/**
 * The tags whose name contains the text, each with the main tag it stands for.
 * For a main tag, `main` is the tag itself.
 */
const MatchingTags = former("the tags matching (text)", ({ text }, { tag, name, main, mainName }) =>
  each(Tagging._suggest({ text }).is({ tag, name }))
    .where(
      Synonymizing._canonical({ item: tag }).is({ canonical: main }),
      Tagging._get({ tag: main }).is({ name: mainName }),
    )
    .form({ tag, name, main, mainName }),
);

const SuggestTags = endpoint(
  "/tags/suggest",
  ({ text }) => receive({ text }).then(respond({ tags: MatchingTags({ text }) })),
  { input: { required: ["text"] }, validators: { input: suggestInput, output: tagsOutput } },
);

/** Every template, with the one a new bio shows marked as the default. */
const AllTemplates = former(
  "the templates",
  (_input, { template, name, layout, font, palette, isDefault }) =>
    each(Templating._templates({}).is({ template, name, layout, font, palette, default: isDefault })).form({
      template,
      name,
      layout,
      font,
      palette,
      default: isDefault,
    }),
);

const ListTemplates = endpoint(
  "/templates/list",
  () => receive({}).then(respond({ templates: AllTemplates({}) })),
  { input: { required: [] }, validators: { input: noInput, output: templatesOutput } },
);

export const composition = {
  Tags: { MatchingTags, SuggestTags },
  Templates: { AllTemplates, ListTemplates },
};
