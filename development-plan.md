# Development plan

## Stages

| Date | Stage | What we deliver |
|---|---|---|
| Wed Nov 18 | Setup | The app is deployed. Sign-in works. The Frieren tag list is loaded. |
| Fri Nov 20 | Concepts | The alpha's five concepts pass their tests: Tagging, Synonymizing, Grouping, Templating, and Publishing. The bio editor shows a live preview. |
| **Mon Nov 23** | **F4 alpha (checkpoint)** | A person can sign in, build a bio from Frieren tags, pick one of three templates with a font and color scheme, save several bios, display one of them at a link, turn on Open to New Friends, and search the displayed bios by tag. |
| Wed Nov 25 | Discovery | For You, Pass with undo, and private interest with matching. |
| **Mon Nov 30** | **F5 beta (checkpoint)** | Adds stars and pictures, PNG export with copy as text, account deletion, and a second anime in the tag list. |
| Dec 1 to 6 | User testing | Testers are recruited by Nov 23. We fix the top problems. |
| Dec 7 and 9 | F6 and F7 | Testing write-up, then the demo and report. |

Thanksgiving is November 26, so the discovery work is due the day before. This plan has no in-app chat and no reporting flow.

The alpha's five concepts are specified in `concept-design.md`. The beta adds three more (Featuring, Hiding, Matching). We will specify them before we build them.

## Tag list

- **Alpha:** one anime, Frieren. We build the list by hand, with its synonyms and groups.
- **Beta:** a second anime, also built by hand, so testers from another fandom can take part.
- **After the beta, if time allows:** more anime from AniList's public API, which returns each character with its native-script name and its series. We checked this with one query on November 16. An LLM proposes synonyms and groups, and a teammate reviews them in a file before they are loaded. The Frieren list is the answer key for checking the LLM.

## Responsibilities 

Everyone designs, codes, tests, and reviews. Each concept has one owner.

| Person | Alpha | Beta |
|---|---|---|
| Eric | Tagging, Synonymizing, Grouping, the Frieren tag list, search | For You, the second anime's tag list |
| Heyang | Templating, the bio editor with live preview | PNG export with copy as text |
| Katherine | Publishing, the public bio page, the search page | Hiding (Pass), Matching |
| Samantha | Sign-in, deployment, visual design | Featuring (stars and pictures), account deletion |

Sign-in, sessions, and requests are reused from Concept Box. Beta pictures will reuse its FileUploading, which assumes a cloud bucket. Featuring, Hiding, and Matching are working names.

## Risks

| Risk | What we do about it | Fallback |
|---|---|---|
| Saving several bios adds work to the alpha | Build one bio end to end first, then add saving several. | Ship the alpha with one bio per person. |
| The week before the beta has six features and Thanksgiving | One owner per feature, and the discovery work is due before the holiday. | Cut in order: pictures, then interest and matching, then Pass. |
| Too few testers share tags | Recruit from the fandoms in the tag list. A bio is useful alone as a link. | Team members run partner accounts to test search. |
| The tag list is poor: duplicates, or the same name in two series, such as "Stark" | Build it by hand and review each other's lists. Synonym links can be undone, and groups tell same-named tags apart. | Fewer tags, each checked by two people. |
| The API or the LLM step does not work | It comes after the beta, and nothing depends on it. | Keep building tag lists by hand. |
