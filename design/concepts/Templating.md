# Templating

## Purpose

Let a person give something a finished look by choosing a ready-made design,
so that work is not abandoned half laid out because arranging it by hand is
too much.

## Principle

Three templates are defined, each with a layout, a font, and a palette, and
one is made the default. An item whose owner has chosen nothing shows the
default template's look. The owner applies another template, and the item
shows that template's layout, font, and palette. They set their own font, and
the item shows it in place of the template's. When they apply a third
template, the layout and palette change and their own font stays, so nothing
is redone. Resetting returns the item to its template's font and palette.

## Types

```types
external Item
  The thing a look is chosen for.
```

## State

```state
a set of Templates with
  a unique name String
  a layout String
  a font String
  a palette String

a set of Default Templates

Rule: at most one template is a default template.

a set of Items with
  an optional template Template
  an optional font String
  an optional palette String
```

## Actions

```actions
define (name: String, layout: String, font: String, palette: String) : returns (template: Template)
  where name is blank or longer than 64 characters
  then
    refuses INVALID_TEMPLATE_NAME "A template name must not be blank and must be at most 64 characters."
  where layout is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_LAYOUT "A layout must not be blank and must be at most 64 characters."
  where font is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_FONT "A font must not be blank and must be at most 64 characters."
  where palette is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_PALETTE "A palette must not be blank and must be at most 64 characters."
  where another template has name
  then
    refuses TEMPLATE_NAME_TAKEN "Another template already has that name."
  where name, layout, font, and palette are accepted and no template has name
  then
    add a new template with name, layout, font, and palette
    returns template

revise (template: Template, font: String, palette: String) : returns (template: Template)
  where template is unknown
  then
    refuses TEMPLATE_NOT_FOUND "There is no such template."
  where font is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_FONT "A font must not be blank and must be at most 64 characters."
  where palette is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_PALETTE "A palette must not be blank and must be at most 64 characters."
  where template is known and font and palette are accepted
  then
    set the template's font to font and its palette to palette
    returns template

makeDefault (template: Template) : returns (template: Template)
  where template is unknown
  then
    refuses TEMPLATE_NOT_FOUND "There is no such template."
  where template is the default template
  then
    refuses TEMPLATE_ALREADY_DEFAULT "That template is already the default."
  where template is known and is not the default template
  then
    make template the only default template
    returns template

retire (template: Template) : returns (template: Template)
  where template is unknown
  then
    refuses TEMPLATE_NOT_FOUND "There is no such template."
  where template is the default template
  then
    refuses TEMPLATE_IS_DEFAULT "The default template cannot be retired."
  where template is some item's template
  then
    refuses TEMPLATE_IN_USE "A template that an item uses cannot be retired."
  where template is known, is not the default template, and is no item's template
  then
    remove template
    returns template

apply (item: Item, template: Template) : returns (item: Item, template: Template)
  where template is unknown
  then
    refuses TEMPLATE_NOT_FOUND "There is no such template."
  where template is already item's template
  then
    refuses TEMPLATE_ALREADY_APPLIED "The item already has this template."
  where template is known and is not item's template
  then
    set item's template to template, leaving item's own font and palette as they are
    returns item, template

setFont (item: Item, font: String) : returns (item: Item)
  where font is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_FONT "A font must not be blank and must be at most 64 characters."
  where font is accepted
  then
    set item's own font to font
    returns item

setPalette (item: Item, palette: String) : returns (item: Item)
  where palette is blank or longer than 64 characters
  then
    refuses INVALID_LOOK_PALETTE "A palette must not be blank and must be at most 64 characters."
  where palette is accepted
  then
    set item's own palette to palette
    returns item

reset (item: Item) : returns (item: Item)
  where item has neither its own font nor its own palette
  then
    refuses LOOK_NOT_CUSTOMIZED "The item has no font or palette of its own."
  where item has its own font or its own palette
  then
    remove item's own font and its own palette, leaving item's template as it is
    returns item

remove (item: Item) : returns (item: Item)
  where item has no template, no font of its own, and no palette of its own
  then
    refuses LOOK_NOT_SET "The item has no template, font, or palette."
  where item has a template, its own font, or its own palette
  then
    remove item's template, its own font, and its own palette
    returns item
```

## Queries

```queries
_templates () : many (template: Template, name: String, layout: String, font: String, palette: String, default: Flag)
  answers every template with its name, layout, font, and palette, and whether it is the default template
  answers no rows when no template is defined
  orders rows by name ignoring case, then by name, then by template identity
_look (item: Item) : optional (template: Template, layout: String, font: String, palette: String)
  answers the look in effect for item: the template it applied, or the default template when it applied none, with that template's layout
  answers item's own font and palette where set, and that template's font and palette otherwise
  answers no row only when item applied no template and there is no default template
_styled (item: Item) : one (styled: Flag)
  answers true when item has a template, its own font, or its own palette
  answers false for an item with none of them, even when it shows the default look
```
