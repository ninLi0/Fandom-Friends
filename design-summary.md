# Fandom Friends: Design Summary

## Creating a bio

Tagging and Grouping let fans choose specific fandoms, characters, pairings, and activities for their introductions. Templating arranges these into a card, so someone can make a readable bio without laying out the page by hand.

Tagging records the bio's interests, while Templating records its layout, font, and palette choices. The preview brings these together so the owner can check the introduction before publishing it.

## Publishing and discovery

Publishing gives a person one public bio at a stable address. They can share that link without appearing in search. Turning on "Open to New Friends" also lists the bio, letting other fans find it through its tags.

Search includes only bios that contain all selected tags. Synonymizing recognizes alternate names, while Grouping lets a broader search include more specific interests. Someone searching for Frieren and sketch swaps can therefore find people who share both the fandom and the activity. Search filters are separate from the searcher's own bio, so exploring an interest does not add it to their introduction.

## Ethical considerations

These responses follow the six concerns in the [F3 ethical analysis](problem-framing-f3.md#ethical-analysis), in the same order.

### 1. Privacy and self-expression

Users choose what to include and preview their card before publishing. Only the chosen bio becomes public. The editor should identify when someone is editing the public card and explain that saving changes affects what readers see. Publishing an introduction does not, by itself, mean that direct messages are welcome.

### 2. People whose accounts are linked without permission

Any social links included on a card should be labeled as user-provided and unverified. Someone whose account has been linked without permission should be able to report impersonation without creating a Fandom Friends account. The team should review reports before removing cards, so false reports cannot automatically take down someone's introduction. Responsibility for reviewing reports and the process for removing a card still need to be assigned.

### 3. Readability and accessibility

Published cards use real text that screen readers and translation tools can access. Templates should provide readable defaults, and the available fonts and palettes need to be checked for contrast and readability. We also need to check keyboard access and reading order. The current scope does not include PNG export.

### 4. Choosing to stop sharing

Users can unpublish their hosted card when they no longer want to share it. They should also be able to remove any personal details and links they have added. We will explain that screenshots and copies shared elsewhere may remain. Account deletion is still a development task; unpublishing removes public access but does not delete the account or all its stored content.

### 5. Expressing niche interests

The team's tag collection may leave out interests that matter to some fans. The proposed response is to let people suggest missing tags and describe unlisted interests in an optional personal note. The remaining design still needs to specify where that note belongs. Alternative-name relationships are maintained by the team and can be corrected; they are not inferred automatically by an AI agent.

### 6. Adults and vulnerable users

The initial application is intended for adults aged 18 and older. Accounts and interaction flows for minors are outside the current scope, but this restriction does not prevent minors from opening public links. We still need to decide how the age policy is communicated and enforced. Exact ages, locations, and other sensitive details should not be required, and users should be told that anyone with a published card's address can read it.

## Open design decisions

### Search order

The most recently listed person appears first. Older listings fall to the bottom, while someone can move back to the top by unlisting and listing again. We need to assess whether this is fair before keeping it as the default order.

### Changes to published bios

Changes to a published bio's tags or appearance affect what visitors see. We need to decide whether a warning before saving is enough, or whether people should be able to preview changes privately before making them public.

### Alpha scope

The app needs to record each bio's owner when it is created and use that record to authorize edits and publication. We also need to decide whether display names, notes, and contact links are part of alpha and where they belong in the design.

The [current journey](user-journey.md) includes multiple named bios, starred tags, and image uploads whose behavior is not fully specified in the current alpha design. We need to mark these as later work or specify their behavior before including them in alpha.
