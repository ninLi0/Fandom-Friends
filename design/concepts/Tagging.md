# Tagging

## Purpose

Let items be found by what they are about, so that nobody has to read through
every item to find the relevant ones.

## Principle

A tag named "Frieren" is defined and added to two items. Asking which items
have that tag returns exactly those two, and asking for one item's tags
returns "Frieren" with its name. Adding the same tag to the same item again is
refused. Removing the tag from one item leaves the other item as it was.
Renaming the tag changes the name every item shows and keeps it on those
items. Retiring the tag removes it from every item.

## Types

```types
external Item
  The thing a tag is added to.
```

## State

```state
a set of Tags with
  a name String

a set of Items with
  a tags set of Tags
```

## Actions

```actions
define (name: String) : returns (tag: Tag)
  where name is blank or longer than 64 characters
  then
    refuses INVALID_TAG_NAME "A tag name must not be blank and must be at most 64 characters."
  where name is accepted
  then
    add a new tag with name
    returns tag

rename (tag: Tag, name: String) : returns (tag: Tag)
  where tag is unknown
  then
    refuses TAG_NOT_FOUND "There is no such tag."
  where name is blank or longer than 64 characters
  then
    refuses INVALID_TAG_NAME "A tag name must not be blank and must be at most 64 characters."
  where tag is known and name is accepted
  then
    set the tag's name to name
    returns tag

retire (tag: Tag) : returns (tag: Tag)
  where tag is unknown
  then
    refuses TAG_NOT_FOUND "There is no such tag."
  where tag is known
  then
    remove tag, and remove it from the tags of every item
    returns tag

add (item: Item, tag: Tag) : returns (item: Item, tag: Tag)
  where tag is unknown
  then
    refuses TAG_NOT_FOUND "There is no such tag."
  where tag is already among item's tags
  then
    refuses TAG_ALREADY_ADDED "The item already has this tag."
  where tag is known and not among item's tags
  then
    add tag to item's tags
    returns item, tag

remove (item: Item, tag: Tag) : returns (item: Item, tag: Tag)
  where tag is not among item's tags
  then
    refuses TAG_NOT_ADDED "The item does not have this tag."
  where tag is among item's tags
  then
    remove tag from item's tags
    returns item, tag
```

## Queries

```queries
_suggest (text: String) : many (tag: Tag, name: String)
  answers the tags whose name contains text, ignoring case
  answers every tag when text is empty, and no rows when no name contains text
  orders rows by name ignoring case, then by name, then by tag identity
_get (tag: Tag) : optional (name: String)
  answers the tag's name
  answers no row for an unknown tag
_tagsOf (item: Item) : many (tag: Tag, name: String)
  answers the item's tags with their names
  answers no rows when the item has no tags
  orders rows by name ignoring case, then by name, then by tag identity
_itemsWith (tag: Tag) : many (item: Item)
  answers the items that have the tag
  answers no rows for an unknown tag or a tag no item has
  orders rows by item identity
```
