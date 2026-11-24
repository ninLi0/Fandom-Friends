# Fandom Friends application types

This file lists every concept instance the application assembles and says what
each concept's outside types stand for here.

A person is their account, identified by its username. Wherever another concept
needs a user, owner, publisher, or session subject, the application supplies
that account.

A bio is a draft: one saved version of a person's introduction. Its tags, its
look, and whether it is the public one are each kept by a different concept
under that same draft.

The tags are one shared list. Other names for a tag and the broader tags it lies
under are both relations between tags.

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate Drafting with
  User is Authenticating.Account

instantiate Tagging with
  Item is Drafting.Draft

instantiate Synonymizing with
  Item is Tagging.Tag

instantiate Grouping with
  Item is Tagging.Tag

instantiate Templating with
  Item is Drafting.Draft

instantiate Publishing with
  User is Authenticating.Account
  Item is Drafting.Draft
```
