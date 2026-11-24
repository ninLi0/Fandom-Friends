# Discovery

A signed-in person [searches by tag](reaction:Discovery.Searching.Search) among
the bios that are open to new friends. The answer is
[the matching people](former:Discovery.Searching.Matches), each with their
handle and card, newest listed first. A person never finds themself, and a bio
that is displayed but not open is never found.

```endpoints
Discovery.Searching.Search at /search
```

A bio must have every searched tag. It
[counts as having a tag](view:Discovery.Matching.CountsAsHaving) when one of its
own tags means the same thing, or lies under it at any depth: a bio tagged
"Fern/Stark" is found by "Frieren", and searching "Sousou no Frieren" finds what
"Frieren" finds. A bio is left out when
[it lacks one of the searched tags](view:Discovery.Matching.LacksASearchedTag).
With no tag chosen nothing is lacking, so everyone who is open to new friends
appears.

A tag that does not exist is a tag no bio has, so searching for it finds nobody.
A search may ask for at most ten tags.

```computations
searchedTags(tags: TagList) : TagList
  The tags one search asks for, each once, in the order first given. A list of tag identities, possibly empty.

searchedTagAt(tags: TagList, at: Number) : SearchedTag
  The searched tag at one position, counting from zero. found is true and tag is that tag when the list is that long; otherwise found is false. The search rule asks for every position a search may have, which is how it visits each searched tag.
```

Search filters are the searcher's own and change nothing: searching for a tag
does not add it to their bio.
