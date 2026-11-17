# Concept design: Fandom Friends

These are the five concepts scoped for alpha submission.

| Concept | Purpose |
|---|---|
| `Tagging` | Let items be found by what they are about |
| `Synonymizing` | Let several items that stand for the same thing be treated as one |
| `Grouping` | Let a specific thing count as part of the broader things it belongs to |
| `Templating` | Let a person give something a finished look by choosing a ready-made design |
| `Publishing` | Let a person choose which one of their items is public, and how far it travels |

## Reused concepts

Sign-in is reused from Concept Box and is not specified here: its `UserAuthentication`, `Sessioning`, and `Requesting` concepts, with its reactions for registering, logging in, and logging out.

## 1. Tagging [Item]

**Purpose:** Let items be found by what they are about. Prevents having to read through every item to find the relevant ones.

**Principle:** After a tag is *defined* and *added* to several items, choosing that tag finds exactly those items. Choosing several tags narrows the result to the items that have all of them.

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
  _itemsWith (tags: set of Tags) : many (item: Item, matched: Number)
    Returns each item that has at least one of the given tags, with how
    many of them it has, most first. An item that has all of them has
    matched equal to the number of tags given.
```

**Notes**

- People pick tags from a list the team makes with a seed script. Nobody creates tags inside the app.
- Tags belong to a saved bio, so each of a person's bios has its own tags.

## 2. Synonymizing [Item]

**Purpose:** Let several items that stand for the same thing be treated as one, without merging them. Prevents the same thing being split across differently worded items.

**Principle:** After one item is *linked* to another as its canonical item, asking what means the same as either returns both, and each stays a separate item. If the link was wrong, *unlinking* makes them distinct again.

```text
concept Synonymizing [Item]

state
  a set of Items with
    a canonical Item
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

## 3. Grouping [Item]

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

## 4. Templating [Item]

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
    then set item's own font to font

  setPalette (item: Item, palette: String)
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
```

**Notes**

- A layout, a font, and a palette are stored by name, for example "Two columns", "Serif", and "Sunset". The page offers a fixed list of each and knows how to draw them.
- The team defines three templates and makes one the default. A saved bio with no template chosen gets the default.
- A person's own font and palette stay when they switch template.

## 5. Publishing [User, Item]

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
    where user has no handle, no user has this handle, and it has only
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
- The handle is the person's public address. It is separate from the login name, and may contain lowercase letters, digits, and hyphens.
- Search results are shown newest listed first.

## Essential reactions

A reaction says what the app does when something happens. `Requesting.addTag` means a signed-in person pressed "add tag" on a page, and `Requesting.respond` sends the result back to the page. Actions that no reaction or note mentions, such as defining a tag, are done by the team only.

**1. A person adds a tag to one of their own bios.**

```text
when Requesting.addTag (session, bio, tag)
where Sessioning: session's user is user
and bio is one of user's saved bios
and Synonymizing: main is tag's canonical item, or tag itself if it has none
then Tagging.add (bio, main)
```

Note: picking another name for a tag, such as "Sousou no Frieren", adds the main tag, "Frieren". Every other change to a bio is checked the same way: removing a tag, and choosing a template, font, or palette. Changes to the person need no bio: claiming a handle, unpublishing, and turning Open to New Friends on or off.

**2. A person displays a bio.**

```text
when Requesting.display (session, bio)
where Sessioning: session's user is user
and bio is one of user's saved bios
then Publishing.publish (user, bio)
```

Note: "Display This Bio" makes one bio public. If another bio was public, it stops being public. A person needs a handle first. Turning on Open to New Friends is `Publishing.list`, and turning it off is `Publishing.unlist`.

**3. Someone views a card.**

```text
when Requesting.viewCard (handle)
where Publishing: handle belongs to person, and bio is what person has published
and Tagging: bio's tags
and Grouping: what each tag belongs under
and Templating: bio's look
then Requesting.respond (the card: handle, tags, and look)
```

Note: anyone with the link can open a person's public bio without signing in. Their other saved bios cannot be opened by the link. The editor shows the owner the same card as a live preview.

**4. A person searches by tag.**

```text
when Requesting.search (session, tags)
where Sessioning: session's user is viewer
and Publishing: bio is listed, published by person, with their handle and the time it was listed
and person is not viewer
and for every tag in tags:
  Synonymizing: same means the same as tag
  Grouping: wanted is same or lies under it
  Synonymizing: worded means the same as wanted
  Tagging: bio has worded
then Requesting.respond (each person, newest listed first)
```

Note: a bio must have every searched tag, and a tag under a searched one counts, so a bio with "Fern/Stark" matches "Frieren". With no tag chosen, everyone who is open to new friends appears.

## Design summary

**How the concepts work together.** A fan picks tags once, and the same tags do three jobs.

- **An introduction that gets finished** (the unfinished Carrd and the "anime fan" bio). Tagging and Grouping let a fan pick specific tags from a series' list. Templating gives the bio a finished look with nothing to position. A fan can keep several bios, and Publishing gives the one they display an address.
- **Knowing who welcomes contact** (fans who hesitate to message first). Publishing's listed level is "Open to New Friends". Only people who chose it appear in search, so everyone a fan finds there has said they want new friends.
- **Telling a sketch-swapper from a theory fan** (same fandom, different activities). Activities are tags like any other, so a card shows them and a search can ask for them. Search expands through Synonymizing and Grouping, so a fan is found whichever name or broader tag the searcher picks.

**Ethics concerns from F2.**

| Concern | Where the design answers it |
|---|---|
| 1. Public cards expose interests | Only the bio a person chooses to display is public, and their other saved bios stay private. Open to New Friends is a separate choice, and only then does the bio appear in search. |
| 2. Linking someone else's account | A card has no links to outside accounts in the alpha, so it cannot point at someone else's account. Every card page links to the team's contact address for reporting a problem. |
| 3. A PNG hides text from screen readers | A published card is a web page with real text, which screen readers and translation tools can read. This design has no image export. |
| 4. Choosing to stop | Turning off Open to New Friends takes a person out of search and keeps their link. Unpublishing takes the card down. Nobody can message anyone inside the app. |
| 5. Popular tags crowd out niche ones | Search returns only the people who match every tag asked for, so a niche search shows niche matches. Results are ordered by when a person opened to new friends, not by how popular they or their tags are. There is no popularity score. |

**Still unclear.**

- **Age.** The app is for adults only. We have not decided how sign-up checks this.
- **After finding someone.** A person finds another fan's card through tag search. The alpha gives them no way to contact that fan. MutualMatching concept is planned for beta. 
- **Order of search results.** Among the people a search finds, the one who turned on Open to New Friends most recently comes first. A person who turned it on long ago ends up at the bottom, and we do not know yet if that is fair.
- **Saved bios.** A person can save several bios and display one. These five concepts do not say where saved bios are kept or how one is discarded. We will specify that before we build it.
- **Deleting an account.** In F2 we said that deleting an account would remove a person's card. This design cannot delete an account yet. A person can unpublish their card and remove their tags. Planned for beta. 
