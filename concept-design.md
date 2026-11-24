# Concept design: Fandom Friends

These are the seven concepts of the alpha. All seven are built, together with the two reused for sign-in.

This page explains each concept in the same form as F3. The exact specification of each one is in `design/concepts/`, where the framework checks it against the code. What each group of reactions does is in `design/compositions/`.

| Concept | Purpose |
|---|---|
| `Drafting` | Let a person keep several named versions of something they are working on |
| `Tagging` | Let items be found by what they are about |
| `Synonymizing` | Let several items that stand for the same thing be treated as one |
| `Grouping` | Let a specific thing count as part of the broader things it belongs to |
| `Templating` | Let a person give something a finished look by choosing a ready-made design |
| `Publishing` | Let a person choose which one of their items is public, and how far it travels |
| `Describing` | Let something carry a public name and a short description, apart from the private name it is saved under |

## Reused concepts

Sign-in reuses two concepts and is not specified here: `Authenticating`, which keeps usernames and passwords and comes from the sync engine's message-board example, and `Sessioning`, which comes from Concept Box. Requests reach the app through the framework's own request boundary, so there is no `Requesting` concept.

## 1. Drafting [User]

**Purpose:** Let a person keep several named versions of something they are working on. Prevents having to overwrite one version in order to try another.

**Principle:** After a person *starts* a draft under a name, they can *start* another, and both stay saved under their own names. Changing one leaves the other as it was. They can *rename* a draft, or *discard* one they no longer want.

```text
concept Drafting [User]

state
  a set of Drafts with
    an owner User
    a name String

actions
  start (owner: User, name: String) : return (draft: Draft)
    where name is not blank, is at most 80 characters, and owner has no
      draft with this name
    then create a draft with this owner and name, and return it

  rename (draft: Draft, name: String)
    where draft exists, name is not blank, is at most 80 characters, and
      its owner has no other draft with this name
    then set draft's name to name

  discard (draft: Draft)
    where draft exists
    then remove draft

queries
  _draftsOf (owner: User) : many (draft: Draft, name: String)
    Returns owner's drafts ordered by name.
  _owner (draft: Draft) : optional (owner: User)
    Returns draft's owner, or no result if the draft does not exist.
  _get (draft: Draft) : optional (owner: User, name: String)
    Returns draft's owner and name, or no result if the draft does not exist.
```

**Notes**

- A draft is a saved bio. A person can keep several, such as "Frieren and sketch swaps" and "Dungeon Meshi discussions", and displays one of them.
- Tags and the look belong to a saved bio. The handle belongs to the person.
- Drafting does not check who is asking. The reactions check that a bio is one of the person's own before any change to it.

## 2. Tagging [Item]

**Purpose:** Let items be found by what they are about. Prevents having to read through every item to find the relevant ones.

**Principle:** After a tag is *defined* and *added* to several items, choosing that tag finds exactly those items. *Removing* it from one of them leaves the others found.

```text
concept Tagging [Item]

state
  a set of Tags with
    a name String
  a set of Items with
    a tags set of Tags

actions
  define (name: String) : return (tag: Tag)
    where name is nonempty
    then create a tag with this name and return it

  rename (tag: Tag, name: String)
    where tag exists and name is nonempty
    then set tag's name to name

  retire (tag: Tag)
    where tag exists
    then remove tag, and remove it from the tags of every item

  add (item: Item, tag: Tag)
    where tag exists and is not among item's tags
    then add tag to item's tags

  remove (item: Item, tag: Tag)
    where tag is among item's tags
    then remove tag from item's tags

queries
  _suggest (text: String) : many (tag: Tag, name: String)
    Returns the tags whose name contains text, ignoring case, ordered by name.
  _tagsOf (item: Item) : many (tag: Tag, name: String)
    Returns item's tags ordered by name, or no rows if it has none.
  _get (tag: Tag) : optional (name: String)
    Returns tag's name, or no result if the tag does not exist.
  _itemsWith (tag: Tag) : many (item: Item)
    Returns the items that have the tag.
```

**Notes**

- People pick tags from a list the team makes, which is loaded when the app starts. Nobody creates tags inside the app.
- A tag name is not blank and is at most 64 characters. Two tags may have the same name, such as "Stark" in two series.
- Search needs the items that have every chosen tag. The search reaction asks about one tag at a time and combines the answers, because a tag under a chosen tag also counts.
- Tags belong to a saved bio, so each of a person's bios has its own tags.

## 3. Synonymizing [Item]

**Purpose:** Let several items that stand for the same thing be treated as one, without merging them. Prevents the same thing being split across differently worded items.

**Principle:** After one item is *linked* to another as its canonical item, asking what means the same as either returns both, and each stays a separate item. If the link was wrong, *unlinking* makes them distinct again.

```text
concept Synonymizing [Item]

state
  a set of Items with
    an optional canonical Item
  Rule: a canonical item is a different item with no canonical item of its own.

actions
  link (item: Item, canonical: Item)
    where the two differ, neither has a canonical item, and no item has
      `item` as its canonical item
    then set item's canonical item to canonical

  unlink (item: Item)
    where item has a canonical item
    then remove it

queries
  _same (item: Item) : many (other: Item)
    Returns item itself and every item that means the same: its
    canonical item, the items that share it, and the items that have
    item as their canonical item. An unlinked item returns only itself.
  _canonical (item: Item) : one (canonical: Item)
    Returns item's canonical item, or item itself if it has none.
```

**Notes**

- A link changes nobody's card, and one `unlink` undoes it.
- Each group of synonyms has one main tag, and every other tag in the group points straight at it. For example, "Sousou no Frieren" and "葬送のフリーレン" both point at "Frieren".
- The team makes the links with the seed script. A translated name is linked like any other.

## 4. Grouping [Item]

**Purpose:** Let a specific thing count as part of the broader things it belongs to. Prevents someone looking for the broad thing from missing what was filed under a specific part of it.

**Principle:** After an item is *placed* under a broader item, and that one under a still broader item, asking what lies under the broadest returns both, and asking what an item belongs to returns everything above it.

```text
concept Grouping [Item]

state
  a set of Items with
    a parents set of Items
  Rule: following parents from an item never leads back to that item.

actions
  place (item: Item, parent: Item)
    where the two differ, parent is not already a parent of item, and
      item does not lie above parent
    then add parent to item's parents

  remove (item: Item, parent: Item)
    where parent is a parent of item
    then remove parent from item's parents

queries
  _under (item: Item) : many (member: Item, direct: Flag)
    Returns every item below item at any depth. direct is true for those
    placed directly under it. No rows if nothing is below it.
  _above (item: Item) : many (broader: Item, direct: Flag)
    Returns every item above item at any depth, marked the same way.
  _top () : many (item: Item)
    Returns the items that have something under them and no parent.
```

**Notes**

- Tags are arranged by what they belong to. Fern belongs to Frieren. The pairing Fern/Stark belongs to both Fern and Stark, so a tag can have more than one parent.

## 5. Templating [Item]

**Purpose:** Let a person give something a finished look by choosing a ready-made design. Prevents work being abandoned half laid out because arranging it by hand is too much.

**Principle:** After templates are *defined* and one is *made the default*, every item has the default look. A person can *apply* another template to their item and *set* their own font or palette. If they later *apply* a different template, their choices carry over and nothing is redone. *Resetting* returns the item to its template's font and palette.

```text
concept Templating [Item]

state
  a set of Templates with
    a unique name String
    a layout String
    a font String
    a palette String
  a default set of Templates
  Rule: at most one template is the default.
  a set of Items with
    an optional template Template
    an optional font String
    an optional palette String

actions
  define (name: String, layout: String, font: String, palette: String) : return (template: Template)
    where name is nonempty and no template has it
    then create a template with this name, layout, font, and palette

  revise (template: Template, font: String, palette: String)
    where template exists
    then set its font and palette

  makeDefault (template: Template)
    where template exists and is not the default
    then make it the only default template

  retire (template: Template)
    where template exists, is not the default, and no item uses it
    then remove template

  apply (item: Item, template: Template)
    where template exists and is not already item's template
    then set item's template, leaving item's own font and palette as they are

  setFont (item: Item, font: String)
    where font is not blank and at most 64 characters
    then set item's own font to font

  setPalette (item: Item, palette: String)
    where palette is not blank and at most 64 characters
    then set item's own palette to palette

  reset (item: Item)
    where item has its own font or palette
    then remove both

  remove (item: Item)
    where item has a template, font, or palette
    then remove them

queries
  _templates () : many (template: Template, name: String, layout: String, font: String, palette: String, default: Flag)
    Returns every template with its layout, font, and palette, and
    whether it is the default, ordered by name.
  _look (item: Item) : optional (template: Template, layout: String, font: String, palette: String)
    Returns the look in effect for item: the template it applied, or the
    default template if it applied none, with item's own font and
    palette where set and that template's otherwise. No result only if
    item applied none and there is no default.
  _styled (item: Item) : one (styled: Flag)
    Returns whether item has a template, font, or palette of its own.
  _overrides (item: Item) : one (font: String or none, palette: String or none)
    Returns item's own font and palette, each only if item set it.
```

**Notes**

- A layout, a font, and a palette are stored by name, for example "Two columns", "Serif", and "Midnight". The page offers a fixed list of each and knows how to draw them.
- The team defines six templates and makes one the default. The editor offers three of them. A saved bio with no template chosen gets the default.
- A person's own font and palette stay when they switch template.

## 6. Publishing [User, Item]

**Purpose:** Let a person choose which one of their items is public, and how far it travels: to people given its address, or to anyone browsing. Prevents their other items, or an item they are not ready to show, from being seen by strangers.

**Principle:** A person *claims* a handle and *publishes* one of their items. Anyone given the handle can reach that item, and none of the person's other items. If they *publish* another item, it becomes public and the first stops being public. If they *list* it, people browsing can find it too, the most recently listed first. *Unlisting* takes it out of listings and keeps the address working. *Unpublishing* leaves them with nothing public, and they can publish again later under the same handle.

```text
concept Publishing [User, Item]

state
  a set of Users with
    a unique handle String
  a set of Publications with
    a unique publisher User
    a unique item Item
  a listed set of Publications with
    a listedOn DateTime

actions
  claim (user: User, handle: String)
    where user has no handle, no user has this handle, and it is 3 to 30
      lowercase letters, digits, and hyphens
    then give user this handle

  publish (publisher: User, item: Item)
    where publisher has a handle and item is not published
    then make item the one item publisher has published, in place of
      any earlier one, and keep the listing if there was one

  list (publisher: User)
    where publisher has a publication that is not listed
    then add it to the listed set, with the current time as its listedOn

  unlist (publisher: User)
    where publisher's publication is listed
    then remove it from the listed set

  unpublish (publisher: User)
    where publisher has a publication
    then remove it, and its listing if it has one

  release (user: User)
    where user has a handle and no publication
    then remove user's handle

queries
  _byHandle (handle: String) : optional (user: User)
    Returns the user with this handle, or no result.
  _handle (user: User) : optional (handle: String)
    Returns user's handle, or no result if they have none.
  _published (publisher: User) : optional (item: Item, listed: Flag)
    Returns publisher's published item and whether it is listed, or no
    result if they have published nothing.
  _publisherOf (item: Item) : optional (publisher: User)
    Returns the user who has published item, or no result.
  _listed () : many (publisher: User, item: Item, listedOn: DateTime)
    Returns every listed publication with the time it was listed,
    newest first.
```

**Notes**

- Only one of a person's saved bios is public at a time. "Display This Bio" publishes it in place of the one that was public, and Open to New Friends stays as it was.
- A public bio can be opened by anyone who has its link, for example from an X bio. "Open to New Friends" is the listed level, where it can also be found in search.
- The handle is the person's public address. It is separate from the login name, and is 3 to 30 lowercase letters, digits, and hyphens.
- Search results are shown newest listed first.

## 7. Describing [Item]

**Purpose:** Let something carry a public name and a short description, apart from the private name it is saved under. Prevents a person's private label for a bio, such as "Con weekend", from being what strangers see.

**Principle:** An item starts with no public details. Its owner *sets* a public name, "Mika", and a short introduction. Anyone who reads the item gets both. Setting them again replaces both together and leaves every other item's details alone. *Removing* them leaves the item with none again.

```text
concept Describing [Item]

state
  a set of Items with
    a name String
    a text String

actions
  set (item: Item, name: String, text: String)
    where name is not blank and at most 60 characters, and text is at
      most 280 characters
    then set item's name to name and its text to text

  remove (item: Item)
    then remove item's name and text, if it has them

queries
  _get (item: Item) : one (name: String, text: String)
    Returns item's public name and description, or two empty strings
    if it has none.
```

**Notes**

- The saved name of a bio stays in Drafting and only its owner sees it. The display name and "A little about you" are what the card shows.
- A bio saved before this concept existed has no public details. Other people then see its handle in place of a name.
- The description is free text of up to 280 characters. Nothing filters what a person writes there yet; reporting a card is later work.

## Essential reactions

A reaction says what the app does when something happens. `Request.addTag` means a signed-in person pressed "add tag" on a page, and `respond` sends the result back to the page. The team's own actions, such as defining a tag or a template, have no reaction: the team's list is loaded when the app starts.

**1. A person adds a tag to one of their own bios.**

```text
when Request.addTag (session, bio, tag)
where Sessioning: session's user is user
and Drafting: bio's owner is user
and Synonymizing: main is tag's canonical item, or tag itself if it has none
then Tagging.add (bio, main)
```

Note: picking another name for a tag, such as "Sousou no Frieren", adds the main tag, "Frieren". Every other change to a bio is checked the same way: removing a tag, setting its display name and description, and choosing a template, font, or palette. Changes to the person need no bio: claiming a handle, unpublishing, and turning Open to New Friends on or off.

**2. A person displays a bio.**

```text
when Request.display (session, bio)
where Sessioning: session's user is user
and Drafting: bio's owner is user
then Publishing.publish (user, bio)
```

Note: "Display This Bio" makes one bio public. If another bio was public, it stops being public. A person needs a handle first. Turning on Open to New Friends is `Publishing.list`, and turning it off is `Publishing.unlist`.

**3. Someone views a card.**

```text
when Request.viewCard (handle)
where Publishing: handle belongs to person, and bio is what person has published
and Describing: bio's public name and description
and Tagging: bio's tags
and Grouping: what each tag belongs under
and Templating: bio's look
then respond (the card: handle, name, description, tags, and look)
```

Note: anyone with the link can open a person's public bio without signing in. Their other saved bios cannot be opened by the link. The editor shows the owner the same card as a live preview.

**4. A person searches by tag.**

```text
when Request.search (session, tags)
where Sessioning: session's user is viewer
and Publishing: bio is listed, published by person, with their handle and the time it was listed
and person is not viewer
and for every tag in tags:
  Synonymizing: same means the same as tag
  Grouping: wanted is same or lies under it
  Synonymizing: worded means the same as wanted
  Tagging: bio has worded
then respond (each person, newest listed first)
```

Note: a bio must have every searched tag, and a tag under a searched one counts, so a bio with "Fern/Stark" matches "Frieren". With no tag chosen, everyone who is open to new friends appears.

**5. A person discards a bio.**

```text
when Request.discard (session, bio)
where Sessioning: session's user is user
and Drafting: bio's owner is user
then Publishing.unpublish (user), if bio is the one user has published
then Drafting.discard (bio)

when Drafting.discard (bio)
then Tagging.remove (bio, tag), for every tag of bio
and Templating.remove (bio), if bio has a look of its own
and Describing.remove (bio)
```

Note: a discarded bio is taken down before it is discarded, so it is never public after the answer arrives. Nothing of it is left behind.

## Changes since F3

- **Drafting is back.** The F3 reactions checked that "bio is one of user's saved bios", but no concept kept a person's saved bios. Drafting keeps them.
- **Sign-in.** We use the framework's request boundary instead of a `Requesting` concept, and `Authenticating` from the framework's example instead of Concept Box's `UserAuthentication`.
- **Tagging.** `_itemsWith` now takes one tag, and `_get` is new. The search reaction combines the tags, because a tag under a chosen tag also counts.
- **Describing is new.** A bio now has a display name and a short description that the card shows. The name a bio is saved under stays private.
- **Templating.** `_styled` is new, so that discarding a bio can clear its look. `_overrides` is new, so that the editor can tell a person's own font and palette from their template's.
- **Every action that can be refused has a named refusal with a sentence**, such as `HANDLE_TAKEN` "That handle is already taken." The page shows the sentence.
- **Reactions.** Removing a tag resolves to the main tag, as adding does. Discarding a bio is new (reaction 5). Viewing a card also reads its public details (reaction 3).
- **Pictures.** A card shows the cover of a series and the portraits of its characters. They are links to images at AniList and are chosen by the tag, so they need no concept: the page looks up a tag's picture by its name. People adding their own pictures, and starring favorites, move to the beta.
