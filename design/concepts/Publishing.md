# Publishing

## Purpose

Let a person choose which one of their items is public, and how far it
travels: to people given its address, or to anyone browsing. Their other items
stay out of sight, and so does an item they are not ready to show.

## Principle

Alice claims the handle "alice" and publishes one of her items. Anyone given
"alice" reaches that item, and none of her other items. She publishes another
item: it becomes public, and the first stops being public. She lists it, and
people browsing find it too, the most recently listed first. Unlisting takes it
out of listings and keeps the address working. Unpublishing leaves her with
nothing public, and she can publish again later under the same handle.

## Types

```types
external User
  The person who claims a handle and publishes an item.
external Item
  The thing a person makes public.
```

## State

```state
a set of Users with
  a unique handle String

a set of Publications with
  a unique publisher User
  a unique item Item

a set of Listed Publications with
  a listedOn DateTime

Rule: every publication's publisher is a user with a handle.
```

## Actions

```actions
claim (user: User, handle: String) : returns (user: User, handle: String)
  where user already has a handle
  then
    refuses HANDLE_ALREADY_CLAIMED "You already have a handle."
  where handle is not 3 to 30 lowercase letters, digits, or hyphens
  then
    refuses INVALID_HANDLE "A handle must be 3 to 30 lowercase letters, digits, or hyphens."
  where another user has handle
  then
    refuses HANDLE_TAKEN "That handle is already taken."
  where user has no handle, and handle is well formed and no user has it
  then
    give user this handle
    returns user, handle

publish (publisher: User, item: Item) : returns (publisher: User, item: Item)
  where publisher has no handle
  then
    refuses HANDLE_REQUIRED "You need a handle before you can publish."
  where item is already published, by publisher or by anyone else
  then
    refuses ALREADY_PUBLISHED "That item is already published."
  where publisher has a handle and item is not published
  then
    make item the one item publisher has published, in place of any earlier one
    keep the listing and its listedOn if the earlier one was listed
    returns publisher, item

list (publisher: User) : returns (publisher: User)
  where publisher has no publication
  then
    refuses NOTHING_PUBLISHED "You have not published anything."
  where publisher's publication is already listed
  then
    refuses ALREADY_LISTED "Your published item is already listed."
  where publisher has a publication that is not listed
  then
    add it to Listed Publications with the current time as its listedOn
    returns publisher

unlist (publisher: User) : returns (publisher: User)
  where publisher has no publication, or it is not listed
  then
    refuses NOT_LISTED "You have nothing listed."
  where publisher's publication is listed
  then
    remove it from Listed Publications
    returns publisher

unpublish (publisher: User) : returns (publisher: User, item: Item)
  where publisher has no publication
  then
    refuses NOTHING_PUBLISHED "You have not published anything."
  where publisher has a publication
  then
    remove it, and its listing if it has one
    bind item to the item it published
    returns publisher, item

release (user: User) : returns (user: User)
  where user has no handle
  then
    refuses NO_HANDLE "You do not have a handle."
  where user still has a publication
  then
    refuses STILL_PUBLISHED "Unpublish your item before you release your handle."
  where user has a handle and no publication
  then
    remove user's handle
    returns user
```

## Queries

```queries
_byHandle (handle: String) : optional (user: User)
  answers the user who has this handle
  answers no row when no user has it
_handle (user: User) : optional (handle: String)
  answers the user's handle
  answers no row for a user with no handle
_published (publisher: User) : optional (item: Item, listed: Flag)
  answers the item publisher has published, and whether it is listed
  answers no row for a publisher who has published nothing
_publisherOf (item: Item) : optional (publisher: User)
  answers the user who has published item
  answers no row for an item nobody has published
_listed () : many (publisher: User, item: Item, listedOn: DateTime)
  answers every listed publication with its publisher, its item, and the time it was listed
  answers no rows when nothing is listed
  orders rows by listedOn, newest first, then by publisher identity
```
