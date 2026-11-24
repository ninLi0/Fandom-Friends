# Vocabulary

The tags and the templates are one shared list that the team keeps. People pick
from it; they do not add to it. Nothing in it is private, so these two reads ask
for no session.

The editor and the search box both
[suggest tags as a person types](reaction:Vocabulary.Tags.SuggestTags).
[Each suggestion](former:Vocabulary.Tags.MatchingTags) carries the main tag it
stands for, so a page can show "Sousou no Frieren (Frieren)". An empty text
answers every tag.

```endpoints
Vocabulary.Tags.SuggestTags at /tags/suggest
```

The editor [lists the templates](reaction:Vocabulary.Templates.ListTemplates):
[each with its layout, font, and color scheme](former:Vocabulary.Templates.AllTemplates),
and the default marked.

```endpoints
Vocabulary.Templates.ListTemplates at /templates/list
```
