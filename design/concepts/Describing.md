# Describing

## Purpose

Give an item a public name and a short description without exposing the
private name used to save or organize it.

## Principle

An item initially has no public details. Its owner supplies the public name
"Mika" and a short introduction. Reading the item returns both, including
after a restart. Revising the details replaces both together and leaves
another item's details alone. Removing the details makes both empty again.

## Types

```types
external Item
  The thing being described.
```

## State

```state
a set of Items with
  a name String
  a text String
```

## Actions

```actions
set (item: Item, name: String, text: String) : returns (item: Item)
  where name is blank or longer than 60 characters
  then
    refuses INVALID_DESCRIPTION_NAME "A display name must not be blank and must be at most 60 characters."
  where text is longer than 280 characters
  then
    refuses INVALID_DESCRIPTION_TEXT "A description must be at most 280 characters."
  where name and text are accepted
  then
    set the item's name to name and its text to text
    returns item

remove (item: Item) : returns (item: Item)
  where true
  then
    remove the item's description if present
    returns item
```

## Queries

```queries
_get (item: Item) : one (name: String, text: String)
  answers the item's public name and description
  answers empty strings for both when the item has no description
```
