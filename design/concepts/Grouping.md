# Grouping

## Purpose

Let a specific thing count as part of the broader things it belongs to, so
that someone looking for the broad thing does not miss what was filed under a
specific part of it.

## Principle

The item "Fern/Stark" is placed under "Fern", and "Fern" is placed under
"Frieren". Asking what lies under "Frieren" returns both, with "Fern" marked
as directly under it. Asking what "Fern/Stark" belongs to returns everything
above it: "Fern" directly, and "Frieren" further up. Placing "Frieren" under
"Fern/Stark" is refused, because "Frieren" would then lie under itself.
Removing "Fern" from under "Frieren" leaves "Fern/Stark" under "Fern" and
nothing under "Frieren".

## Types

```types
external Item
  The thing that is placed under broader things.
```

## State

```state
a set of Items with
  a parents set of Items

Rule: following parents from an item never leads back to that item.
```

## Actions

```actions
place (item: Item, parent: Item) : returns (item: Item, parent: Item)
  where item and parent are the same item
  then
    refuses GROUP_SAME_ITEM "An item cannot be placed under itself."
  where parent is already among item's parents
  then
    refuses GROUP_ALREADY_PLACED "The item is already placed under this parent."
  where item lies above parent at any depth
  then
    refuses GROUP_CYCLE "The item cannot be placed under a parent that already lies under it."
  where the two differ, parent is not among item's parents, and item does not lie above parent
  then
    add parent to item's parents
    returns item, parent

remove (item: Item, parent: Item) : returns (item: Item, parent: Item)
  where parent is not among item's parents
  then
    refuses GROUP_NOT_PLACED "The item is not placed under this parent."
  where parent is among item's parents
  then
    remove parent from item's parents
    returns item, parent
```

## Queries

```queries
_under (item: Item) : many (member: Item, direct: Flag)
  answers every item below item at any depth, each once
  direct is true for an item placed directly under item, even when it is also reached further down
  answers no rows when nothing is below item
  orders rows by member identity
_above (item: Item) : many (broader: Item, direct: Flag)
  answers every item above item at any depth, each once
  direct is true for a parent of item, even when it is also reached further up
  answers no rows when item has no parents
  orders rows by broader identity
_top () : many (item: Item)
  answers the items that have something under them and no parent
  answers no rows when nothing is placed
  orders rows by item identity
```
