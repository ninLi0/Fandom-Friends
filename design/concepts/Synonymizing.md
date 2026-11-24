# Synonymizing

## Purpose

Let several items that stand for the same thing be treated as one, without
merging them, so that the same thing is not split across differently worded
items.

## Principle

Two items stand for the same show: "Sousou no Frieren" and "Frieren". The
first is linked to the second as its canonical item. Asking what means the
same as either item returns both, and each stays a separate item. Asking for
the canonical item of either returns "Frieren". The link turns out to be
wrong, so "Sousou no Frieren" is unlinked. The two are distinct again: each
means the same only as itself.

## Types

```types
external Item
  The thing that can mean the same as other items.
```

## State

```state
a set of Items with
  an optional canonical Item

Rule: a canonical item is a different item with no canonical item of its own.
```

## Actions

```actions
link (item: Item, canonical: Item) : returns (item: Item, canonical: Item)
  where item and canonical are the same item
  then
    refuses SYNONYM_OF_ITSELF "An item cannot be its own canonical item."
  where item already has a canonical item
  then
    refuses SYNONYM_ALREADY_LINKED "The item already has a canonical item."
  where canonical has a canonical item of its own
  then
    refuses SYNONYM_CANONICAL_LINKED "The canonical item has a canonical item of its own."
  where some other item has item as its canonical item
  then
    refuses SYNONYM_IS_CANONICAL "The item is the canonical item of another item."
  where the two differ, neither has a canonical item, and no item has item as its canonical item
  then
    set item's canonical item to canonical
    returns item, canonical

unlink (item: Item) : returns (item: Item)
  where item has no canonical item
  then
    refuses SYNONYM_NOT_LINKED "The item has no canonical item."
  where item has a canonical item
  then
    remove item's canonical item
    returns item
```

## Queries

```queries
_same (item: Item) : many (other: Item)
  answers item itself and every item that means the same: its canonical item, the items that share that canonical item, and the items that have item as their canonical item
  answers only item itself when it has no canonical item and no item has it as its canonical item
  orders rows by item identity
_canonical (item: Item) : one (canonical: Item)
  answers item's canonical item
  answers item itself when it has no canonical item
```
