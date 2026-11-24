# Bios

A person keeps several saved bios, so trying a new introduction never means
overwriting an old one. A bio's tags and look belong to that bio alone.

Every request about one bio resolves the session to a person and then checks
that [the bio is one of theirs](view:Bios.Keeping.OwnBio). A bio that belongs to
someone else is answered exactly like a bio that does not exist, so nobody
learns which identities are in use.

A person [lists their saved bios](reaction:Bios.Keeping.ListBios), which are
[their drafts in name order](former:Bios.Keeping.SavedBios). They
[start a bio](reaction:Bios.Keeping.StartBio) under a name of their own,
[rename it](reaction:Bios.Keeping.RenameBio), and
[open it](reaction:Bios.Keeping.ViewBio) to see its name and
[its card](former:Bios.Keeping.Card): the bio's tags, the broader tags each one
lies under, and the look in effect. The editor's preview, the public page, and
a search result all show this same card.

```endpoints
Bios.Keeping.ListBios at /bios/list
Bios.Keeping.StartBio at /bios/start
Bios.Keeping.ViewBio at /bios/view
Bios.Keeping.RenameBio at /bios/rename
```

A person [discards a bio](reaction:Bios.Discarding.DiscardBio) they no longer
want. If it is the displayed bio it is taken down first, so the answer never
arrives while a discarded bio is still public. Afterwards the bio
[loses its tags](reaction:Bios.Discarding.DiscardedBioLosesItsTags) and
[loses its look](reaction:Bios.Discarding.DiscardedBioLosesItsLook), so nothing
of it is left behind.

```endpoints
Bios.Discarding.DiscardBio at /bios/discard
```

A person [adds a tag](reaction:Bios.Tagging.AddTag) to a bio or
[removes one](reaction:Bios.Tagging.RemoveTag). Either way the tag they picked
is first replaced by the main tag it stands for, so picking "Sousou no Frieren"
adds "Frieren", and a bio only ever holds main tags. Both answer with the
updated card.

```endpoints
Bios.Tagging.AddTag at /bios/tags/add
Bios.Tagging.RemoveTag at /bios/tags/remove
```

A bio shows the default template until its owner
[chooses a template](reaction:Bios.Styling.ChooseTemplate). The owner may also
[choose a font](reaction:Bios.Styling.ChooseFont) and
[a color scheme](reaction:Bios.Styling.ChoosePalette) of their own, which stay
when they switch templates, and may
[go back to the template's own](reaction:Bios.Styling.ResetLook). Each answers
with the updated card.

```endpoints
Bios.Styling.ChooseTemplate at /bios/look/template
Bios.Styling.ChooseFont at /bios/look/font
Bios.Styling.ChoosePalette at /bios/look/palette
Bios.Styling.ResetLook at /bios/look/reset
```
