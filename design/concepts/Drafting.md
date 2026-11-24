# Drafting

## Purpose

Let a person keep several named versions of something they are working on, so
that they never have to overwrite one version to try another.

## Principle

A person starts a draft named "Frieren and sketch swaps", then starts another
named "Dungeon Meshi discussions". Both stay saved under their own names, and
asking for the person's drafts returns both. Renaming one draft leaves the
other as it was. Discarding one draft leaves the other saved.

## Types

```types
external User
  The person who owns a draft.
```

## State

```state
a set of Drafts with
  an owner User
  a name String
  unique owner and name
```

## Actions

```actions
start (owner: User, name: String) : returns (draft: Draft)
  where name is blank or longer than 80 characters
  then
    refuses INVALID_DRAFT_NAME "A draft name must not be blank and must be at most 80 characters."
  where owner already has a draft with this name
  then
    refuses DRAFT_NAME_TAKEN "The owner already has a draft with this name."
  where name is accepted and owner has no draft with this name
  then
    add a new draft with owner and name
    returns draft

rename (draft: Draft, name: String) : returns (draft: Draft)
  where draft is unknown
  then
    refuses DRAFT_NOT_FOUND "There is no such draft."
  where name is blank or longer than 80 characters
  then
    refuses INVALID_DRAFT_NAME "A draft name must not be blank and must be at most 80 characters."
  where the draft's owner has another draft with this name
  then
    refuses DRAFT_NAME_TAKEN "The owner already has a draft with this name."
  where draft is known, name is accepted, and its owner has no other draft with this name
  then
    set the draft's name to name
    returns draft

discard (draft: Draft) : returns (draft: Draft)
  where draft is unknown
  then
    refuses DRAFT_NOT_FOUND "There is no such draft."
  where draft is known
  then
    remove draft
    returns draft
```

## Queries

```queries
_draftsOf (owner: User) : many (draft: Draft, name: String)
  answers the owner's drafts with their names
  answers no rows when the owner has no drafts
  orders rows by name ignoring case, then by name, then by draft identity
_owner (draft: Draft) : optional (owner: User)
  answers the draft's owner
  answers no row for an unknown draft
_get (draft: Draft) : optional (owner: User, name: String)
  answers the draft's owner and name
  answers no row for an unknown draft
```
