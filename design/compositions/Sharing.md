# Sharing

A person decides how far their introduction travels in three steps: a handle
that gives them an address, one displayed bio at that address, and whether that
bio is open to new friends. Each step is the person's own choice and can be
undone.

A person [claims a handle](reaction:Sharing.Handles.ClaimHandle) once; it is
theirs until they [release it](reaction:Sharing.Handles.ReleaseHandle), which
they can do only while no bio is displayed.

```endpoints
Sharing.Handles.ClaimHandle at /sharing/claim
Sharing.Handles.ReleaseHandle at /sharing/release
```

"Display This Bio" [makes one saved bio public](reaction:Sharing.Displaying.DisplayBio)
in place of any other, after checking that the bio is one of the person's own.
A person needs a handle first. They can
[stop displaying](reaction:Sharing.Displaying.HideBio) at any time and keep the
handle. A person can always [see where they stand](reaction:Sharing.Displaying.Status):
[their handle, their displayed bio, and whether it is open](former:Sharing.Displaying.SharingStatus),
each blank until chosen.

```endpoints
Sharing.Displaying.Status at /sharing/status
Sharing.Displaying.DisplayBio at /sharing/display
Sharing.Displaying.HideBio at /sharing/hide
```

Turning on [Open to New Friends](reaction:Sharing.Listing.OpenToNewFriends) lets
search find the displayed bio.
[Turning it off](reaction:Sharing.Listing.CloseToNewFriends) hides it from search
and leaves the address working. Displaying a different bio keeps the setting.

```endpoints
Sharing.Listing.OpenToNewFriends at /sharing/open
Sharing.Listing.CloseToNewFriends at /sharing/close
```

Anyone with the address [opens the card](reaction:Sharing.PublicCards.ViewCard)
of [the bio displayed at that handle](view:Sharing.PublicCards.PublicBio),
without signing in. A person's other saved bios cannot be reached this way, and
a handle with nothing displayed answers that there is no card.

```endpoints
Sharing.PublicCards.ViewCard at /cards/view
```
