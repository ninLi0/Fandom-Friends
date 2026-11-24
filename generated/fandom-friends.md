<!-- Generated from the Fandom Friends assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.2.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.2.0. -->

# Fandom Friends — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_USERNAME`: A username must contain 3 to 32 letters, numbers, underscores, or hyphens.
  - Refuses `WEAK_PASSWORD`: A password must contain 8 to 128 characters.
  - Refuses `USERNAME_TAKEN`: That username is already registered.
- `authenticate(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Queries

- `_registered(username: String) : one (registered: Flag)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [Fandom Friends application types](../design/types.md), line 18.

### Describing

Defined in [Describing](../design/concepts/Describing.md), line 1.

#### Actions

- `set(item: Item, name: String, text: String) : returns (item: Item)`
  - Refuses `INVALID_DESCRIPTION_NAME`: A display name must not be blank and must be at most 60 characters.
  - Refuses `INVALID_DESCRIPTION_TEXT`: A description must be at most 280 characters.
- `remove(item: Item) : returns (item: Item)`

#### Queries

- `_get(item: Item) : one (name: String, text: String)`

#### Instances

- `Describing` — instance of `Describing` — [Fandom Friends application types](../design/types.md), line 26.
  - `Item` is `Drafting.Draft` — [Fandom Friends application types](../design/types.md), line 27.

### Drafting

Defined in [Drafting](../design/concepts/Drafting.md), line 1.

#### Actions

- `start(owner: User, name: String) : returns (draft: Draft)`
  - Refuses `INVALID_DRAFT_NAME`: A draft name must not be blank and must be at most 80 characters.
  - Refuses `DRAFT_NAME_TAKEN`: The owner already has a draft with this name.
- `rename(draft: Draft, name: String) : returns (draft: Draft)`
  - Refuses `DRAFT_NOT_FOUND`: There is no such draft.
  - Refuses `INVALID_DRAFT_NAME`: A draft name must not be blank and must be at most 80 characters.
  - Refuses `DRAFT_NAME_TAKEN`: The owner already has a draft with this name.
- `discard(draft: Draft) : returns (draft: Draft)`
  - Refuses `DRAFT_NOT_FOUND`: There is no such draft.

#### Queries

- `_draftsOf(owner: User) : many (draft: Draft, name: String)`
- `_owner(draft: Draft) : optional (owner: User)`
- `_get(draft: Draft) : optional (owner: User, name: String)`

#### Instances

- `Drafting` — instance of `Drafting` — [Fandom Friends application types](../design/types.md), line 23.
  - `User` is `Authenticating.Account` — [Fandom Friends application types](../design/types.md), line 24.

### Grouping

Defined in [Grouping](../design/concepts/Grouping.md), line 1.

#### Actions

- `place(item: Item, parent: Item) : returns (item: Item, parent: Item)`
  - Refuses `GROUP_SAME_ITEM`: An item cannot be placed under itself.
  - Refuses `GROUP_ALREADY_PLACED`: The item is already placed under this parent.
  - Refuses `GROUP_CYCLE`: The item cannot be placed under a parent that already lies under it.
- `remove(item: Item, parent: Item) : returns (item: Item, parent: Item)`
  - Refuses `GROUP_NOT_PLACED`: The item is not placed under this parent.

#### Queries

- `_under(item: Item) : many (member: Item, direct: Flag)`
- `_above(item: Item) : many (broader: Item, direct: Flag)`
- `_top() : many (item: Item)`

#### Instances

- `Grouping` — instance of `Grouping` — [Fandom Friends application types](../design/types.md), line 35.
  - `Item` is `Tagging.Tag` — [Fandom Friends application types](../design/types.md), line 36.

### Publishing

Defined in [Publishing](../design/concepts/Publishing.md), line 1.

#### Actions

- `claim(user: User, handle: String) : returns (user: User, handle: String)`
  - Refuses `HANDLE_ALREADY_CLAIMED`: You already have a handle.
  - Refuses `INVALID_HANDLE`: A handle must be 3 to 30 lowercase letters, digits, or hyphens.
  - Refuses `HANDLE_TAKEN`: That handle is already taken.
- `publish(publisher: User, item: Item) : returns (publisher: User, item: Item)`
  - Refuses `HANDLE_REQUIRED`: You need a handle before you can publish.
  - Refuses `ALREADY_PUBLISHED`: That item is already published.
- `list(publisher: User) : returns (publisher: User)`
  - Refuses `NOTHING_PUBLISHED`: You have not published anything.
  - Refuses `ALREADY_LISTED`: Your published item is already listed.
- `unlist(publisher: User) : returns (publisher: User)`
  - Refuses `NOT_LISTED`: You have nothing listed.
- `unpublish(publisher: User) : returns (publisher: User, item: Item)`
  - Refuses `NOTHING_PUBLISHED`: You have not published anything.
- `release(user: User) : returns (user: User)`
  - Refuses `NO_HANDLE`: You do not have a handle.
  - Refuses `STILL_PUBLISHED`: Unpublish your item before you release your handle.

#### Queries

- `_byHandle(handle: String) : optional (user: User)`
- `_handle(user: User) : optional (handle: String)`
- `_published(publisher: User) : optional (item: Item, listed: Flag)`
- `_publisherOf(item: Item) : optional (publisher: User)`
- `_listed() : many (publisher: User, item: Item, listedOn: DateTime)`

#### Instances

- `Publishing` — instance of `Publishing` — [Fandom Friends application types](../design/types.md), line 41.
  - `Item` is `Drafting.Draft` — [Fandom Friends application types](../design/types.md), line 43.
  - `User` is `Authenticating.Account` — [Fandom Friends application types](../design/types.md), line 42.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `Sessioning` — instance of `Sessioning` — [Fandom Friends application types](../design/types.md), line 20.
  - `Subject` is `Authenticating.Account` — [Fandom Friends application types](../design/types.md), line 21.

### Synonymizing

Defined in [Synonymizing](../design/concepts/Synonymizing.md), line 1.

#### Actions

- `link(item: Item, canonical: Item) : returns (item: Item, canonical: Item)`
  - Refuses `SYNONYM_OF_ITSELF`: An item cannot be its own canonical item.
  - Refuses `SYNONYM_ALREADY_LINKED`: The item already has a canonical item.
  - Refuses `SYNONYM_CANONICAL_LINKED`: The canonical item has a canonical item of its own.
  - Refuses `SYNONYM_IS_CANONICAL`: The item is the canonical item of another item.
- `unlink(item: Item) : returns (item: Item)`
  - Refuses `SYNONYM_NOT_LINKED`: The item has no canonical item.

#### Queries

- `_same(item: Item) : many (other: Item)`
- `_canonical(item: Item) : one (canonical: Item)`

#### Instances

- `Synonymizing` — instance of `Synonymizing` — [Fandom Friends application types](../design/types.md), line 32.
  - `Item` is `Tagging.Tag` — [Fandom Friends application types](../design/types.md), line 33.

### Tagging

Defined in [Tagging](../design/concepts/Tagging.md), line 1.

#### Actions

- `define(name: String) : returns (tag: Tag)`
  - Refuses `INVALID_TAG_NAME`: A tag name must not be blank and must be at most 64 characters.
- `rename(tag: Tag, name: String) : returns (tag: Tag)`
  - Refuses `TAG_NOT_FOUND`: There is no such tag.
  - Refuses `INVALID_TAG_NAME`: A tag name must not be blank and must be at most 64 characters.
- `retire(tag: Tag) : returns (tag: Tag)`
  - Refuses `TAG_NOT_FOUND`: There is no such tag.
- `add(item: Item, tag: Tag) : returns (item: Item, tag: Tag)`
  - Refuses `TAG_NOT_FOUND`: There is no such tag.
  - Refuses `TAG_ALREADY_ADDED`: The item already has this tag.
- `remove(item: Item, tag: Tag) : returns (item: Item, tag: Tag)`
  - Refuses `TAG_NOT_ADDED`: The item does not have this tag.

#### Queries

- `_suggest(text: String) : many (tag: Tag, name: String)`
- `_get(tag: Tag) : optional (name: String)`
- `_tagsOf(item: Item) : many (tag: Tag, name: String)`
- `_itemsWith(tag: Tag) : many (item: Item)`

#### Instances

- `Tagging` — instance of `Tagging` — [Fandom Friends application types](../design/types.md), line 29.
  - `Item` is `Drafting.Draft` — [Fandom Friends application types](../design/types.md), line 30.

### Templating

Defined in [Templating](../design/concepts/Templating.md), line 1.

#### Actions

- `define(name: String, layout: String, font: String, palette: String) : returns (template: Template)`
  - Refuses `INVALID_TEMPLATE_NAME`: A template name must not be blank and must be at most 64 characters.
  - Refuses `INVALID_LOOK_LAYOUT`: A layout must not be blank and must be at most 64 characters.
  - Refuses `INVALID_LOOK_FONT`: A font must not be blank and must be at most 64 characters.
  - Refuses `INVALID_LOOK_PALETTE`: A palette must not be blank and must be at most 64 characters.
  - Refuses `TEMPLATE_NAME_TAKEN`: Another template already has that name.
- `revise(template: Template, font: String, palette: String) : returns (template: Template)`
  - Refuses `TEMPLATE_NOT_FOUND`: There is no such template.
  - Refuses `INVALID_LOOK_FONT`: A font must not be blank and must be at most 64 characters.
  - Refuses `INVALID_LOOK_PALETTE`: A palette must not be blank and must be at most 64 characters.
- `makeDefault(template: Template) : returns (template: Template)`
  - Refuses `TEMPLATE_NOT_FOUND`: There is no such template.
  - Refuses `TEMPLATE_ALREADY_DEFAULT`: That template is already the default.
- `retire(template: Template) : returns (template: Template)`
  - Refuses `TEMPLATE_NOT_FOUND`: There is no such template.
  - Refuses `TEMPLATE_IS_DEFAULT`: The default template cannot be retired.
  - Refuses `TEMPLATE_IN_USE`: A template that an item uses cannot be retired.
- `apply(item: Item, template: Template) : returns (item: Item, template: Template)`
  - Refuses `TEMPLATE_NOT_FOUND`: There is no such template.
  - Refuses `TEMPLATE_ALREADY_APPLIED`: The item already has this template.
- `setFont(item: Item, font: String) : returns (item: Item)`
  - Refuses `INVALID_LOOK_FONT`: A font must not be blank and must be at most 64 characters.
- `setPalette(item: Item, palette: String) : returns (item: Item)`
  - Refuses `INVALID_LOOK_PALETTE`: A palette must not be blank and must be at most 64 characters.
- `reset(item: Item) : returns (item: Item)`
  - Refuses `LOOK_NOT_CUSTOMIZED`: The item has no font or palette of its own.
- `remove(item: Item) : returns (item: Item)`
  - Refuses `LOOK_NOT_SET`: The item has no template, font, or palette.

#### Queries

- `_templates() : many (template: Template, name: String, layout: String, font: String, palette: String, default: Flag)`
- `_look(item: Item) : optional (template: Template, layout: String, font: String, palette: String)`
- `_styled(item: Item) : one (styled: Flag)`
- `_overrides(item: Item) : one (font: String | null, palette: String | null)`

#### Instances

- `Templating` — instance of `Templating` — [Fandom Friends application types](../design/types.md), line 38.
  - `Item` is `Drafting.Draft` — [Fandom Friends application types](../design/types.md), line 39.

## Computations

- `searchedTagAt(tags: TagList, at: Number) : SearchedTag` — [Discovery](../design/compositions/Discovery.md), line 29.
- `searchedTags(tags: TagList) : TagList` — [Discovery](../design/compositions/Discovery.md), line 26.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (bio) counts as having (main)

Authored path: `Discovery.Matching.CountsAsHaving`.
- Covered by [Discovery](../design/compositions/Discovery.md), line 14.

```view
(bio) counts as having (main) — inputs (bio); outputs (main); bindings (worded, wanted, broader) — answers any number of (main)
  where
    Tagging._tagsOf (item: bio) has (tag: worded)
    Synonymizing._canonical (item: worded) has (canonical: main)
  where
    Tagging._tagsOf (item: bio) has (tag: worded)
    Synonymizing._same (item: worded) has (other: wanted)
    Grouping._above (item: wanted) has (broader)
    Synonymizing._canonical (item: broader) has (canonical: main)
```

### (bio) is one of (user)'s saved bios

Authored path: `Bios.Keeping.OwnBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 7.

```view
(bio) is one of (user)'s saved bios — inputs (user, bio); outputs (); bindings ()
  where Drafting._owner (draft: bio) has (owner: user)
```

### (bio) lacks one of (tags)

Authored path: `Discovery.Matching.LacksASearchedTag`.
- Covered by [Discovery](../design/compositions/Discovery.md), line 18.

```view
(bio) lacks one of (tags) — inputs (bio, tags); outputs (); bindings (tag, main)
  where
    (found: true, tag) is searchedTagAt (at: 0, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 1, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 2, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 3, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 4, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 5, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 6, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 7, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 8, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
  where
    (found: true, tag) is searchedTagAt (at: 9, tags)
    Synonymizing._canonical (item: tag) has (canonical: main)
    no view "(bio) counts as having (main)" with (bio) has (main)
```

### the bio shown at (handle)

Authored path: `Sharing.PublicCards.PublicBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 42.

```view
the bio shown at (handle) — inputs (handle); outputs (bio); bindings (person) — answers at most one (bio)
  where
    Publishing._byHandle (handle) has (user: person)
    Publishing._published (publisher: person) has (item: bio)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### how (user) is sharing

Authored path: `Sharing.Displaying.SharingStatus`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 22.

```former
Former "how (user) is sharing" — inputs (user); bindings (handle, bio, open); promises exactly one record — forms:
  a record of
    where whether Publishing._handle (user) has (handle)
    where whether Publishing._published (publisher: user) has (item: bio, listed: open)
    displayed: bio
    handle
    open
```

### the card of (bio)

Authored path: `Bios.Keeping.Card`.
- Covered by [Bios](../design/compositions/Bios.md), line 16.

```former
Former "the card of (bio)" — inputs (bio); bindings (displayName, note, tag, name, broader, direct, broaderName, template, layout, font, palette); promises exactly one record — forms:
  a record of
    where Describing._get (item: bio) has (name: displayName, text: note)
    where whether Templating._look (item: bio) has (font, layout, palette, template)
    displayName
    look: a record of
      font
      layout
      palette
      template
    note
    tags: each Tagging._tagsOf (item: bio) has (name, tag)
      form a record of
        name
        tag
        under: each Grouping._above (item: tag) has (broader, direct)
          where Tagging._get (tag: broader) has (name: broaderName)
          form a record of
            direct
            name: broaderName
            tag: broader
```

### the font and palette overrides of (bio)

Authored path: `Bios.Keeping.LookOverrides`.
- Covered by [Bios](../design/compositions/Bios.md), line 20.

```former
Former "the font and palette overrides of (bio)" — inputs (bio); bindings (font, palette); promises exactly one record — forms:
  a record of
    where Templating._overrides (item: bio) has (font, palette)
    font
    palette
```

### the people open to new friends matching (tags) for (viewer)

Authored path: `Discovery.Searching.Matches`.
- Covered by [Discovery](../design/compositions/Discovery.md), line 5.

```former
Former "the people open to new friends matching (tags) for (viewer)" — inputs (viewer, tags); bindings (person, bio, listedOn, handle); promises exactly one record — forms:
  each Publishing._listed () has (item: bio, listedOn, publisher: person)
    where Publishing._handle (user: person) has (handle)
    where no Publishing._publisherOf (item: bio) has (publisher: viewer)
    where no view "(bio) lacks one of (tags)" with (bio, tags)
    form a record of
      card: former "the card of (bio)" with (bio)
      handle
      listedOn
```

### the saved bios of (user)

Authored path: `Bios.Keeping.SavedBios`.
- Covered by [Bios](../design/compositions/Bios.md), line 12.

```former
Former "the saved bios of (user)" — inputs (user); bindings (bio, name); promises exactly one record — forms:
  each Drafting._draftsOf (owner: user) has (draft: bio, name)
    form a record of
      bio
      name
```

### the tags matching (text)

Authored path: `Vocabulary.Tags.MatchingTags`.
- Covered by [Vocabulary](../design/compositions/Vocabulary.md), line 9.

```former
Former "the tags matching (text)" — inputs (text); bindings (tag, name, main, mainName); promises exactly one record — forms:
  each Tagging._suggest (text) has (name, tag)
    where Synonymizing._canonical (item: tag) has (canonical: main)
    where Tagging._get (tag: main) has (name: mainName)
    form a record of
      main
      mainName
      name
      tag
```

### the templates

Authored path: `Vocabulary.Templates.AllTemplates`.
- Covered by [Vocabulary](../design/compositions/Vocabulary.md), line 18.

```former
Former "the templates" — inputs (); bindings (template, name, layout, font, palette, isDefault); promises exactly one record — forms:
  each Templating._templates () has (default: isDefault, font, layout, name, palette, template)
    form a record of
      default: isDefault
      font
      layout
      name
      palette
      template
```

## Reactions

### Bios.Discarding.DiscardBio

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Discarding.DiscardBio:displayed-bio#2

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Discarding.DiscardBio
where
  earlier, RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
  Publishing._publisherOf (item: bio) has (publisher: user)
then
  Publishing.unpublish (publisher: user)
```

### Bios.Discarding.DiscardBio:displayed-bio#3

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when Publishing.unpublish (publisher: user), asked by Bios.Discarding.DiscardBio:displayed-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
then
  Drafting.discard (draft: bio)
```

### Bios.Discarding.DiscardBio:displayed-bio#4

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when Drafting.discard (draft: bio), asked by Bios.Discarding.DiscardBio:displayed-bio#3
where
  earlier, RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
then
  RequestBoundary.respond (bio, requestId)
```

### Bios.Discarding.DiscardBio:not-own-bio#2

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Discarding.DiscardBio
where
  earlier, RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Discarding.DiscardBio:undisplayed-bio#2

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Discarding.DiscardBio
where
  earlier, RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
  no Publishing._publisherOf (item: bio) has (publisher: user)
then
  Drafting.discard (draft: bio)
```

### Bios.Discarding.DiscardBio:undisplayed-bio#3

Authored path: `Bios.Discarding.DiscardBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 38.
- Covered by [Bios](../design/compositions/Bios.md), line 47.

```reaction
when Drafting.discard (draft: bio), asked by Bios.Discarding.DiscardBio:undisplayed-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/bios/discard", requestId, session)
then
  RequestBoundary.respond (bio, requestId)
```

### Bios.Discarding.DiscardedBioLosesItsDetails

Authored path: `Bios.Discarding.DiscardedBioLosesItsDetails`.
- Covered by [Bios](../design/compositions/Bios.md), line 43.

```reaction
when Drafting.discard (draft: bio)
then
  Describing.remove (item: bio)
```

### Bios.Discarding.DiscardedBioLosesItsLook

Authored path: `Bios.Discarding.DiscardedBioLosesItsLook`.
- Covered by [Bios](../design/compositions/Bios.md), line 42.

```reaction
when Drafting.discard (draft: bio)
where
  Templating._styled (item: bio) has (styled: true)
then
  Templating.remove (item: bio)
```

### Bios.Discarding.DiscardedBioLosesItsTags

Authored path: `Bios.Discarding.DiscardedBioLosesItsTags`.
- Covered by [Bios](../design/compositions/Bios.md), line 41.

```reaction
when Drafting.discard (draft: bio)
where
  Tagging._tagsOf (item: bio) has (tag)
then
  Tagging.remove (item: bio, tag)
```

### Bios.Keeping.ListBios

Authored path: `Bios.Keeping.ListBios`.
- Covered by [Bios](../design/compositions/Bios.md), line 11.
- Covered by [Bios](../design/compositions/Bios.md), line 31.

```reaction
when RequestBoundary.request (path: "/bios/list", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Keeping.ListBios#2

Authored path: `Bios.Keeping.ListBios`.
- Covered by [Bios](../design/compositions/Bios.md), line 11.
- Covered by [Bios](../design/compositions/Bios.md), line 31.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.ListBios
where
  earlier, RequestBoundary.request (path: "/bios/list", requestId, session)
then
  RequestBoundary.respond (bios: former "the saved bios of (user)" with (user), requestId)
```

### Bios.Keeping.RenameBio

Authored path: `Bios.Keeping.RenameBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 14.
- Covered by [Bios](../design/compositions/Bios.md), line 34.

```reaction
when RequestBoundary.request (bio, name, path: "/bios/rename", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Keeping.RenameBio:not-own-bio#2

Authored path: `Bios.Keeping.RenameBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 14.
- Covered by [Bios](../design/compositions/Bios.md), line 34.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.RenameBio
where
  earlier, RequestBoundary.request (bio, name, path: "/bios/rename", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Keeping.RenameBio:own-bio#2

Authored path: `Bios.Keeping.RenameBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 14.
- Covered by [Bios](../design/compositions/Bios.md), line 34.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.RenameBio
where
  earlier, RequestBoundary.request (bio, name, path: "/bios/rename", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Drafting.rename (draft: bio, name)
```

### Bios.Keeping.RenameBio:own-bio#3

Authored path: `Bios.Keeping.RenameBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 14.
- Covered by [Bios](../design/compositions/Bios.md), line 34.

```reaction
when Drafting.rename (draft: bio, name), asked by Bios.Keeping.RenameBio:own-bio#2
where
  earlier, RequestBoundary.request (bio, name, path: "/bios/rename", requestId, session)
then
  RequestBoundary.respond (bio, requestId)
```

### Bios.Keeping.SetBioDetails

Authored path: `Bios.Keeping.SetBioDetails`.
- Covered by [Bios](../design/compositions/Bios.md), line 25.
- Covered by [Bios](../design/compositions/Bios.md), line 35.

```reaction
when RequestBoundary.request (bio, displayName, note, path: "/bios/details", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Keeping.SetBioDetails:not-own-bio#2

Authored path: `Bios.Keeping.SetBioDetails`.
- Covered by [Bios](../design/compositions/Bios.md), line 25.
- Covered by [Bios](../design/compositions/Bios.md), line 35.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.SetBioDetails
where
  earlier, RequestBoundary.request (bio, displayName, note, path: "/bios/details", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Keeping.SetBioDetails:own-bio#2

Authored path: `Bios.Keeping.SetBioDetails`.
- Covered by [Bios](../design/compositions/Bios.md), line 25.
- Covered by [Bios](../design/compositions/Bios.md), line 35.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.SetBioDetails
where
  earlier, RequestBoundary.request (bio, displayName, note, path: "/bios/details", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Describing.set (item: bio, name: displayName, text: note)
```

### Bios.Keeping.SetBioDetails:own-bio#3

Authored path: `Bios.Keeping.SetBioDetails`.
- Covered by [Bios](../design/compositions/Bios.md), line 25.
- Covered by [Bios](../design/compositions/Bios.md), line 35.

```reaction
when Describing.set (item: bio, name: displayName, text: note), asked by Bios.Keeping.SetBioDetails:own-bio#2
where
  earlier, RequestBoundary.request (bio, displayName, note, path: "/bios/details", requestId, session)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### Bios.Keeping.StartBio

Authored path: `Bios.Keeping.StartBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 13.
- Covered by [Bios](../design/compositions/Bios.md), line 32.

```reaction
when RequestBoundary.request (name, path: "/bios/start", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Keeping.StartBio#2

Authored path: `Bios.Keeping.StartBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 13.
- Covered by [Bios](../design/compositions/Bios.md), line 32.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.StartBio
where
  earlier, RequestBoundary.request (name, path: "/bios/start", requestId, session)
then
  Drafting.start (name, owner: user)
```

### Bios.Keeping.StartBio#3

Authored path: `Bios.Keeping.StartBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 13.
- Covered by [Bios](../design/compositions/Bios.md), line 32.

```reaction
when Drafting.start (name, owner: user, draft: bio), asked by Bios.Keeping.StartBio#2
where
  earlier, RequestBoundary.request (name, path: "/bios/start", requestId, session)
then
  RequestBoundary.respond (bio, requestId)
```

### Bios.Keeping.ViewBio

Authored path: `Bios.Keeping.ViewBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 15.
- Covered by [Bios](../design/compositions/Bios.md), line 33.

```reaction
when RequestBoundary.request (bio, path: "/bios/view", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Keeping.ViewBio:not-own-bio#2

Authored path: `Bios.Keeping.ViewBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 15.
- Covered by [Bios](../design/compositions/Bios.md), line 33.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.ViewBio
where
  earlier, RequestBoundary.request (bio, path: "/bios/view", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Keeping.ViewBio:own-bio#2

Authored path: `Bios.Keeping.ViewBio`.
- Covered by [Bios](../design/compositions/Bios.md), line 15.
- Covered by [Bios](../design/compositions/Bios.md), line 33.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Keeping.ViewBio
where
  earlier, RequestBoundary.request (bio, path: "/bios/view", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
  Drafting._get (draft: bio) has (name)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), name, overrides: former "the font and palette overrides of (bio)" with (bio), requestId)
```

### Bios.Styling.ChooseFont

Authored path: `Bios.Styling.ChooseFont`.
- Covered by [Bios](../design/compositions/Bios.md), line 63.
- Covered by [Bios](../design/compositions/Bios.md), line 71.

```reaction
when RequestBoundary.request (bio, font, path: "/bios/look/font", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Styling.ChooseFont:not-own-bio#2

Authored path: `Bios.Styling.ChooseFont`.
- Covered by [Bios](../design/compositions/Bios.md), line 63.
- Covered by [Bios](../design/compositions/Bios.md), line 71.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ChooseFont
where
  earlier, RequestBoundary.request (bio, font, path: "/bios/look/font", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Styling.ChooseFont:own-bio#2

Authored path: `Bios.Styling.ChooseFont`.
- Covered by [Bios](../design/compositions/Bios.md), line 63.
- Covered by [Bios](../design/compositions/Bios.md), line 71.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ChooseFont
where
  earlier, RequestBoundary.request (bio, font, path: "/bios/look/font", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Templating.setFont (font, item: bio)
```

### Bios.Styling.ChooseFont:own-bio#3

Authored path: `Bios.Styling.ChooseFont`.
- Covered by [Bios](../design/compositions/Bios.md), line 63.
- Covered by [Bios](../design/compositions/Bios.md), line 71.

```reaction
when Templating.setFont (font, item: bio), asked by Bios.Styling.ChooseFont:own-bio#2
where
  earlier, RequestBoundary.request (bio, font, path: "/bios/look/font", requestId, session)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### Bios.Styling.ChoosePalette

Authored path: `Bios.Styling.ChoosePalette`.
- Covered by [Bios](../design/compositions/Bios.md), line 64.
- Covered by [Bios](../design/compositions/Bios.md), line 72.

```reaction
when RequestBoundary.request (bio, palette, path: "/bios/look/palette", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Styling.ChoosePalette:not-own-bio#2

Authored path: `Bios.Styling.ChoosePalette`.
- Covered by [Bios](../design/compositions/Bios.md), line 64.
- Covered by [Bios](../design/compositions/Bios.md), line 72.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ChoosePalette
where
  earlier, RequestBoundary.request (bio, palette, path: "/bios/look/palette", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Styling.ChoosePalette:own-bio#2

Authored path: `Bios.Styling.ChoosePalette`.
- Covered by [Bios](../design/compositions/Bios.md), line 64.
- Covered by [Bios](../design/compositions/Bios.md), line 72.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ChoosePalette
where
  earlier, RequestBoundary.request (bio, palette, path: "/bios/look/palette", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Templating.setPalette (item: bio, palette)
```

### Bios.Styling.ChoosePalette:own-bio#3

Authored path: `Bios.Styling.ChoosePalette`.
- Covered by [Bios](../design/compositions/Bios.md), line 64.
- Covered by [Bios](../design/compositions/Bios.md), line 72.

```reaction
when Templating.setPalette (item: bio, palette), asked by Bios.Styling.ChoosePalette:own-bio#2
where
  earlier, RequestBoundary.request (bio, palette, path: "/bios/look/palette", requestId, session)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### Bios.Styling.ChooseTemplate

Authored path: `Bios.Styling.ChooseTemplate`.
- Covered by [Bios](../design/compositions/Bios.md), line 62.
- Covered by [Bios](../design/compositions/Bios.md), line 70.

```reaction
when RequestBoundary.request (bio, path: "/bios/look/template", requestId, session, template)
then
  Sessioning.use (session)
```

### Bios.Styling.ChooseTemplate:not-own-bio#2

Authored path: `Bios.Styling.ChooseTemplate`.
- Covered by [Bios](../design/compositions/Bios.md), line 62.
- Covered by [Bios](../design/compositions/Bios.md), line 70.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ChooseTemplate
where
  earlier, RequestBoundary.request (bio, path: "/bios/look/template", requestId, session, template)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Styling.ChooseTemplate:own-bio#2

Authored path: `Bios.Styling.ChooseTemplate`.
- Covered by [Bios](../design/compositions/Bios.md), line 62.
- Covered by [Bios](../design/compositions/Bios.md), line 70.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ChooseTemplate
where
  earlier, RequestBoundary.request (bio, path: "/bios/look/template", requestId, session, template)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Templating.apply (item: bio, template)
```

### Bios.Styling.ChooseTemplate:own-bio#3

Authored path: `Bios.Styling.ChooseTemplate`.
- Covered by [Bios](../design/compositions/Bios.md), line 62.
- Covered by [Bios](../design/compositions/Bios.md), line 70.

```reaction
when Templating.apply (item: bio, template), asked by Bios.Styling.ChooseTemplate:own-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/bios/look/template", requestId, session, template)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### Bios.Styling.ResetLook

Authored path: `Bios.Styling.ResetLook`.
- Covered by [Bios](../design/compositions/Bios.md), line 66.
- Covered by [Bios](../design/compositions/Bios.md), line 73.

```reaction
when RequestBoundary.request (bio, path: "/bios/look/reset", requestId, session)
then
  Sessioning.use (session)
```

### Bios.Styling.ResetLook:not-own-bio#2

Authored path: `Bios.Styling.ResetLook`.
- Covered by [Bios](../design/compositions/Bios.md), line 66.
- Covered by [Bios](../design/compositions/Bios.md), line 73.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ResetLook
where
  earlier, RequestBoundary.request (bio, path: "/bios/look/reset", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Styling.ResetLook:own-bio#2

Authored path: `Bios.Styling.ResetLook`.
- Covered by [Bios](../design/compositions/Bios.md), line 66.
- Covered by [Bios](../design/compositions/Bios.md), line 73.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Styling.ResetLook
where
  earlier, RequestBoundary.request (bio, path: "/bios/look/reset", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Templating.reset (item: bio)
```

### Bios.Styling.ResetLook:own-bio#3

Authored path: `Bios.Styling.ResetLook`.
- Covered by [Bios](../design/compositions/Bios.md), line 66.
- Covered by [Bios](../design/compositions/Bios.md), line 73.

```reaction
when Templating.reset (item: bio), asked by Bios.Styling.ResetLook:own-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/bios/look/reset", requestId, session)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### Bios.Tagging.AddTag

Authored path: `Bios.Tagging.AddTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 50.
- Covered by [Bios](../design/compositions/Bios.md), line 57.

```reaction
when RequestBoundary.request (bio, path: "/bios/tags/add", requestId, session, tag)
then
  Sessioning.use (session)
```

### Bios.Tagging.AddTag:not-own-bio#2

Authored path: `Bios.Tagging.AddTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 50.
- Covered by [Bios](../design/compositions/Bios.md), line 57.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Tagging.AddTag
where
  earlier, RequestBoundary.request (bio, path: "/bios/tags/add", requestId, session, tag)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Tagging.AddTag:own-bio#2

Authored path: `Bios.Tagging.AddTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 50.
- Covered by [Bios](../design/compositions/Bios.md), line 57.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Tagging.AddTag
where
  earlier, RequestBoundary.request (bio, path: "/bios/tags/add", requestId, session, tag)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
  Synonymizing._canonical (item: tag) has (canonical: main)
then
  Tagging.add (item: bio, tag: main)
```

### Bios.Tagging.AddTag:own-bio#3

Authored path: `Bios.Tagging.AddTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 50.
- Covered by [Bios](../design/compositions/Bios.md), line 57.

```reaction
when Tagging.add (item: bio, tag: main), asked by Bios.Tagging.AddTag:own-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/bios/tags/add", requestId, session, tag)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### Bios.Tagging.RemoveTag

Authored path: `Bios.Tagging.RemoveTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 51.
- Covered by [Bios](../design/compositions/Bios.md), line 58.

```reaction
when RequestBoundary.request (bio, path: "/bios/tags/remove", requestId, session, tag)
then
  Sessioning.use (session)
```

### Bios.Tagging.RemoveTag:not-own-bio#2

Authored path: `Bios.Tagging.RemoveTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 51.
- Covered by [Bios](../design/compositions/Bios.md), line 58.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Tagging.RemoveTag
where
  earlier, RequestBoundary.request (bio, path: "/bios/tags/remove", requestId, session, tag)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Bios.Tagging.RemoveTag:own-bio#2

Authored path: `Bios.Tagging.RemoveTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 51.
- Covered by [Bios](../design/compositions/Bios.md), line 58.

```reaction
when Sessioning.use (session, subject: user), asked by Bios.Tagging.RemoveTag
where
  earlier, RequestBoundary.request (bio, path: "/bios/tags/remove", requestId, session, tag)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
  Synonymizing._canonical (item: tag) has (canonical: main)
then
  Tagging.remove (item: bio, tag: main)
```

### Bios.Tagging.RemoveTag:own-bio#3

Authored path: `Bios.Tagging.RemoveTag`.
- Covered by [Bios](../design/compositions/Bios.md), line 51.
- Covered by [Bios](../design/compositions/Bios.md), line 58.

```reaction
when Tagging.remove (item: bio, tag: main), asked by Bios.Tagging.RemoveTag:own-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/bios/tags/remove", requestId, session, tag)
then
  RequestBoundary.respond (bio, card: former "the card of (bio)" with (bio), requestId)
```

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Discovery.Searching.Search

Authored path: `Discovery.Searching.Search`.
- Covered by [Discovery](../design/compositions/Discovery.md), line 3.
- Covered by [Discovery](../design/compositions/Discovery.md), line 10.

```reaction
when RequestBoundary.request (path: "/search", requestId, session, tags)
then
  Sessioning.use (session)
```

### Discovery.Searching.Search#2

Authored path: `Discovery.Searching.Search`.
- Covered by [Discovery](../design/compositions/Discovery.md), line 3.
- Covered by [Discovery](../design/compositions/Discovery.md), line 10.

```reaction
when Sessioning.use (session, subject: viewer), asked by Discovery.Searching.Search
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/search", requestId, session, tags)
  wanted is searchedTags (tags)
then
  RequestBoundary.respond (people: former "the people open to new friends matching (tags) for (viewer)" with (tags: wanted, viewer), requestId)
```

### Sessions.CurrentAccount.CurrentUser

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 18.
- Covered by [Sessions](../design/compositions/Sessions.md), line 24.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
then
  Sessioning.use (session)
```

### Sessions.CurrentAccount.CurrentUser#2

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 18.
- Covered by [Sessions](../design/compositions/Sessions.md), line 24.

```reaction
when Sessioning.use (session, subject: username), asked by Sessions.CurrentAccount.CurrentUser
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### Sessions.EnteringApplication.Register

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.register (password, username)
```

### Sessions.EnteringApplication.Register#2

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when Authenticating.register (password, username, account), asked by Sessions.EnteringApplication.Register
then
  Sessioning.start (subject: account)
```

### Sessions.EnteringApplication.Register#3

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.EnteringApplication.Register#2
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, username: account)
```

### Sessions.EnteringApplication.SignIn

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 9.
- Covered by [Sessions](../design/compositions/Sessions.md), line 15.

```reaction
when RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  Authenticating.authenticate (password, username)
```

### Sessions.EnteringApplication.SignIn#2

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 9.
- Covered by [Sessions](../design/compositions/Sessions.md), line 15.

```reaction
when Authenticating.authenticate (password, username, account), asked by Sessions.EnteringApplication.SignIn
then
  Sessioning.start (subject: account)
```

### Sessions.EnteringApplication.SignIn#3

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 9.
- Covered by [Sessions](../design/compositions/Sessions.md), line 15.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.EnteringApplication.SignIn#2
where
  earlier, RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, username: account)
```

### Sessions.LeavingApplication.SignOut

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 27.
- Covered by [Sessions](../design/compositions/Sessions.md), line 31.

```reaction
when RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  Sessioning.end (session)
```

### Sessions.LeavingApplication.SignOut#2

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 27.
- Covered by [Sessions](../design/compositions/Sessions.md), line 31.

```reaction
when Sessioning.end (session), asked by Sessions.LeavingApplication.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  RequestBoundary.respond (requestId, signedOut: true)
```

### Sharing.Displaying.DisplayBio

Authored path: `Sharing.Displaying.DisplayBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 17.
- Covered by [Sharing](../design/compositions/Sharing.md), line 27.

```reaction
when RequestBoundary.request (bio, path: "/sharing/display", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Displaying.DisplayBio:not-own-bio#2

Authored path: `Sharing.Displaying.DisplayBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 17.
- Covered by [Sharing](../design/compositions/Sharing.md), line 27.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Displaying.DisplayBio
where
  earlier, RequestBoundary.request (bio, path: "/sharing/display", requestId, session)
  no view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  RequestBoundary.respond (error: "BIO_NOT_FOUND", requestId)
```

### Sharing.Displaying.DisplayBio:own-bio#2

Authored path: `Sharing.Displaying.DisplayBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 17.
- Covered by [Sharing](../design/compositions/Sharing.md), line 27.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Displaying.DisplayBio
where
  earlier, RequestBoundary.request (bio, path: "/sharing/display", requestId, session)
  view "(bio) is one of (user)'s saved bios" with (bio, user)
then
  Publishing.publish (item: bio, publisher: user)
```

### Sharing.Displaying.DisplayBio:own-bio#3

Authored path: `Sharing.Displaying.DisplayBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 17.
- Covered by [Sharing](../design/compositions/Sharing.md), line 27.

```reaction
when Publishing.publish (item: bio, publisher: user), asked by Sharing.Displaying.DisplayBio:own-bio#2
where
  earlier, RequestBoundary.request (bio, path: "/sharing/display", requestId, session)
then
  RequestBoundary.respond (bio, requestId)
```

### Sharing.Displaying.HideBio

Authored path: `Sharing.Displaying.HideBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 20.
- Covered by [Sharing](../design/compositions/Sharing.md), line 28.

```reaction
when RequestBoundary.request (path: "/sharing/hide", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Displaying.HideBio#2

Authored path: `Sharing.Displaying.HideBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 20.
- Covered by [Sharing](../design/compositions/Sharing.md), line 28.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Displaying.HideBio
then
  Publishing.unpublish (publisher: user)
```

### Sharing.Displaying.HideBio#3

Authored path: `Sharing.Displaying.HideBio`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 20.
- Covered by [Sharing](../design/compositions/Sharing.md), line 28.

```reaction
when Publishing.unpublish (publisher: user, item: bio), asked by Sharing.Displaying.HideBio#2
where
  earlier, RequestBoundary.request (path: "/sharing/hide", requestId, session)
then
  RequestBoundary.respond (bio, requestId)
```

### Sharing.Displaying.Status

Authored path: `Sharing.Displaying.Status`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 21.
- Covered by [Sharing](../design/compositions/Sharing.md), line 26.

```reaction
when RequestBoundary.request (path: "/sharing/status", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Displaying.Status#2

Authored path: `Sharing.Displaying.Status`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 21.
- Covered by [Sharing](../design/compositions/Sharing.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Displaying.Status
where
  earlier, RequestBoundary.request (path: "/sharing/status", requestId, session)
then
  RequestBoundary.respond (requestId, sharing: former "how (user) is sharing" with (user))
```

### Sharing.Handles.ClaimHandle

Authored path: `Sharing.Handles.ClaimHandle`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 8.
- Covered by [Sharing](../design/compositions/Sharing.md), line 13.

```reaction
when RequestBoundary.request (handle, path: "/sharing/claim", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Handles.ClaimHandle#2

Authored path: `Sharing.Handles.ClaimHandle`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 8.
- Covered by [Sharing](../design/compositions/Sharing.md), line 13.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Handles.ClaimHandle
where
  earlier, RequestBoundary.request (handle, path: "/sharing/claim", requestId, session)
then
  Publishing.claim (handle, user)
```

### Sharing.Handles.ClaimHandle#3

Authored path: `Sharing.Handles.ClaimHandle`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 8.
- Covered by [Sharing](../design/compositions/Sharing.md), line 13.

```reaction
when Publishing.claim (handle, user), asked by Sharing.Handles.ClaimHandle#2
where
  earlier, RequestBoundary.request (handle, path: "/sharing/claim", requestId, session)
then
  RequestBoundary.respond (handle, requestId)
```

### Sharing.Handles.ReleaseHandle

Authored path: `Sharing.Handles.ReleaseHandle`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 9.
- Covered by [Sharing](../design/compositions/Sharing.md), line 14.

```reaction
when RequestBoundary.request (path: "/sharing/release", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Handles.ReleaseHandle#2

Authored path: `Sharing.Handles.ReleaseHandle`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 9.
- Covered by [Sharing](../design/compositions/Sharing.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Handles.ReleaseHandle
then
  Publishing.release (user)
```

### Sharing.Handles.ReleaseHandle#3

Authored path: `Sharing.Handles.ReleaseHandle`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 9.
- Covered by [Sharing](../design/compositions/Sharing.md), line 14.

```reaction
when Publishing.release (user), asked by Sharing.Handles.ReleaseHandle#2
where
  earlier, RequestBoundary.request (path: "/sharing/release", requestId, session)
then
  RequestBoundary.respond (released: true, requestId)
```

### Sharing.Listing.CloseToNewFriends

Authored path: `Sharing.Listing.CloseToNewFriends`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 33.
- Covered by [Sharing](../design/compositions/Sharing.md), line 38.

```reaction
when RequestBoundary.request (path: "/sharing/close", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Listing.CloseToNewFriends#2

Authored path: `Sharing.Listing.CloseToNewFriends`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 33.
- Covered by [Sharing](../design/compositions/Sharing.md), line 38.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Listing.CloseToNewFriends
then
  Publishing.unlist (publisher: user)
```

### Sharing.Listing.CloseToNewFriends#3

Authored path: `Sharing.Listing.CloseToNewFriends`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 33.
- Covered by [Sharing](../design/compositions/Sharing.md), line 38.

```reaction
when Publishing.unlist (publisher: user), asked by Sharing.Listing.CloseToNewFriends#2
where
  earlier, RequestBoundary.request (path: "/sharing/close", requestId, session)
then
  RequestBoundary.respond (open: false, requestId)
```

### Sharing.Listing.OpenToNewFriends

Authored path: `Sharing.Listing.OpenToNewFriends`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 31.
- Covered by [Sharing](../design/compositions/Sharing.md), line 37.

```reaction
when RequestBoundary.request (path: "/sharing/open", requestId, session)
then
  Sessioning.use (session)
```

### Sharing.Listing.OpenToNewFriends#2

Authored path: `Sharing.Listing.OpenToNewFriends`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 31.
- Covered by [Sharing](../design/compositions/Sharing.md), line 37.

```reaction
when Sessioning.use (session, subject: user), asked by Sharing.Listing.OpenToNewFriends
then
  Publishing.list (publisher: user)
```

### Sharing.Listing.OpenToNewFriends#3

Authored path: `Sharing.Listing.OpenToNewFriends`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 31.
- Covered by [Sharing](../design/compositions/Sharing.md), line 37.

```reaction
when Publishing.list (publisher: user), asked by Sharing.Listing.OpenToNewFriends#2
where
  earlier, RequestBoundary.request (path: "/sharing/open", requestId, session)
then
  RequestBoundary.respond (open: true, requestId)
```

### Sharing.PublicCards.ViewCard:displayed

Authored path: `Sharing.PublicCards.ViewCard`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 41.
- Covered by [Sharing](../design/compositions/Sharing.md), line 47.

```reaction
when RequestBoundary.request (handle, path: "/cards/view", requestId)
where
  view "the bio shown at (handle)" with (handle) has (bio)
then
  RequestBoundary.respond (card: former "the card of (bio)" with (bio), handle, requestId)
```

### Sharing.PublicCards.ViewCard:nothing-displayed

Authored path: `Sharing.PublicCards.ViewCard`.
- Covered by [Sharing](../design/compositions/Sharing.md), line 41.
- Covered by [Sharing](../design/compositions/Sharing.md), line 47.

```reaction
when RequestBoundary.request (handle, path: "/cards/view", requestId)
where
  no view "the bio shown at (handle)" with (handle)
then
  RequestBoundary.respond (error: "CARD_NOT_FOUND", requestId)
```

### Vocabulary.Tags.SuggestTags

Authored path: `Vocabulary.Tags.SuggestTags`.
- Covered by [Vocabulary](../design/compositions/Vocabulary.md), line 8.
- Covered by [Vocabulary](../design/compositions/Vocabulary.md), line 14.

```reaction
when RequestBoundary.request (path: "/tags/suggest", requestId, text)
then
  RequestBoundary.respond (requestId, tags: former "the tags matching (text)" with (text))
```

### Vocabulary.Templates.ListTemplates

Authored path: `Vocabulary.Templates.ListTemplates`.
- Covered by [Vocabulary](../design/compositions/Vocabulary.md), line 17.
- Covered by [Vocabulary](../design/compositions/Vocabulary.md), line 22.

```reaction
when RequestBoundary.request (path: "/templates/list", requestId)
then
  RequestBoundary.respond (requestId, templates: former "the templates")
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/current` — requires `session`
- `/auth/register` — requires `username`, `password`
- `/auth/sign-in` — requires `username`, `password`
- `/auth/sign-out` — requires `session`
- `/bios/details` — requires `session`, `bio`, `displayName`, `note`
- `/bios/discard` — requires `session`, `bio`
- `/bios/list` — requires `session`
- `/bios/look/font` — requires `session`, `bio`, `font`
- `/bios/look/palette` — requires `session`, `bio`, `palette`
- `/bios/look/reset` — requires `session`, `bio`
- `/bios/look/template` — requires `session`, `bio`, `template`
- `/bios/rename` — requires `session`, `bio`, `name`
- `/bios/start` — requires `session`, `name`
- `/bios/tags/add` — requires `session`, `bio`, `tag`
- `/bios/tags/remove` — requires `session`, `bio`, `tag`
- `/bios/view` — requires `session`, `bio`
- `/cards/view` — requires `handle`
- `/search` — requires `session`, `tags`
- `/sharing/claim` — requires `session`, `handle`
- `/sharing/close` — requires `session`
- `/sharing/display` — requires `session`, `bio`
- `/sharing/hide` — requires `session`
- `/sharing/open` — requires `session`
- `/sharing/release` — requires `session`
- `/sharing/status` — requires `session`
- `/tags/suggest` — requires `text`
