# YAPPS — Round 3 answers: every contradiction and open point, settled

**Date:** 10 Nov 2026
**Answers:** `ROUND_3_DOCUMENT_ISSUES.md` (reviewed 9 Nov 2026), items 1–61 and questions 1–12. Item numbers below are the developer's.
**Replaces:** `YAPPS_SPEC_RECONCILIATION.md` (10 Nov). Where the two differ, this file is correct.
**Status of this file:** until the specs and the Legal pack are themselves edited, this file wins over every spec, preview and legal document on the points it covers.

**Contents**
1. Current rules at a glance: every decision in force, by topic
2. Why the documents disagreed, and the rules that stop it
3. Answers to items 1–61 (sections A–F)
4. The twelve questions
5. **G. Legal updates:** the numbers and clauses the Legal pack must change
6. What happens to the documents

**How to read a ruling**

| Label | Meaning |
|---|---|
| **Owner decision** | The owner has ruled. Build it. |
| **Agreed** | The developer's "assumed for now" is correct and becomes the rule. |
| **Corrected** | The spec or preview was wrong. The fix is stated. |
| **Recommended** | The project record does not settle it. A default is given so work can continue. Build the default. |

The review is accurate. Nearly every item is a real fault in the documents, not a misreading.

---

## Current rules at a glance

Every decision in force on 10 Nov 2026. The item number points to the full answer below.

**Brand and names**

| Topic | Rule | Item |
|---|---|---|
| Logo | The Brand spec's clapper over the speech bubble, dots white, white, green, from the master files, unchanged | 1 |
| Name | Logo reads "yapping"; interface copy stays "Yapp" until the name is legally cleared | 3 |
| Legal entity | Line Node Technologies, Canada | 21 |
| Taking a campaign slot | "Pick now" | 16 |
| Statistics page | "Productivity" | 17 |
| The two kinds of order | "UGC campaign" and "Custom order" | 18 |
| Work filter for the kind of job | "Job type" | 28 |
| Illustrations | Abstract; no characters in modals or empty states | 15 |
| Emoji, exclamation marks | None in product copy | 14 |
| Green | One green action per view | 13 |

**Money**

| Topic | Rule | Item |
|---|---|---|
| Platform fee | 20% of every transaction, taken from the creator's side | 6 |
| What the brand pays | The listed price, nothing on top | 6 |
| What the creator receives | 80% of the listed price, shown everywhere beside the price | 6 |
| Campaign: brand charged | Full amount when the campaign is posted; held | 5 |
| Custom order: brand charged | At hire; held | 5 |
| Campaign: creator paid | 7 days after the post is verified, if still live | 4 |
| Custom order: creator paid | On approval | 5 |
| Keep-live period | 30 days from verification; 48 hours to restore a post | 4 |
| Price floor | $30 per Yapp (listed price); $30 per pitch; $50 custom-order budget | 29 |
| Tier prices | None. Guidance range only, scaled by tier, never blocks | 29 |
| Usage rights | One of four options per order, included in the price | 7 |
| Raw footage | Included | 9 |
| Revisions | Two included; then approve, a paid extra revision by agreement, or a dispute | 8, 39 |
| Auto-approval | 3 days, with reminders at 48h, 24h and 2h | G |
| Disputes | A person replies within 48 hours | G |
| Brand ratings | No stars; reliability figures only | 20 |

**Scope of this version**

| Topic | Rule | Item |
|---|---|---|
| Markets | Global audience; launch in Canada and the United States | 23 |
| Jobs | Full video, and Ad copy writing. Other non-video jobs are future | 27 |
| Campaign platforms | Connectable platforms only; the creator posts on one | 38 |
| Physical products | Not shipped; creator uses their own, or digital access | 24 |
| Services menu | UGC ads, Native posts, Hook Lab, Go to market, For tech teams | 37 |
| Dark mode | Paused; light only | 49 |
| Brand-side screens | The app's existing ones, restyled | 33 |

**Navigation and layout**

| Topic | Rule | Item |
|---|---|---|
| Desktop "/" signed out | Bubble landing with sign-in | 11 |
| Desktop "/" signed in | Discover; a creator-only account goes to Work | 11, 43 |
| Reels feed | Phone only | 11, 59 |
| Phone bar | Home · Discover · Work · Messages · Alerts · Profile | 19 |
| Layout switch | 1024px | 54 |
| Find work filters | Finder bar with category select, and the left sidebar; no chip row | 31 |
| Page addresses | The app's existing ones | 34 |
| Fonts | Inter 400, 500, 600 | 25 |

---

## Why the documents disagreed, and the rule that stops it

- Each spec was written in a separate conversation, on a different day, about one page. None was checked against the others after it changed.
- The owner changed some decisions between rounds (the logo, the feed on desktop, campaign pay). The later file recorded the new decision but did not go back and correct the earlier files, and did not say it was reversing them.
- Three sets of owner decisions from 9 Nov (trust rules, pricing, legal numbers) were written as handoff files and had not yet been merged into the Work spec when the package was sent. The Legal pack was written from the new decisions; the Work spec still showed the old ones.
- The previews were iterated quickly and drifted from their own specs.
- Features of the existing app that a spec did not mention were read as removed. They were only not mentioned.

**Rules from now on**

1. **One owner per topic.** When files disagree, the owner of the topic wins:

   | Topic | File that wins |
   |---|---|
   | Logo, icons, favicon, brand tokens | Brand spec |
   | Money, timing, disputes, ratings, eligibility | Section G of this file, then the Legal pack and Trust rules |
   | Prices and price guidance | Pricing handoff, as amended by item 29 below |
   | Find work, the job page, the order page, New order | Work spec |
   | Shell, routing, footer, Services, Productivity, Messages | Site-wide spec |
   | Discover page content, base design system | Discover spec |
   | Phone feed and tab bar | Mobile spec |
   | Signed-out landing, sign-in | Desktop spec |

2. **A spec wins over its own preview.** A preview shows look and flow. Where it differs from the spec text, the text is right.
3. **Nothing in the existing app is removed unless a spec says "remove".** Silence means "keep".
4. **Sample data, "production" notes and "Demo:" links are not requirements for the prototype.**
5. **Part numbers:** the Work spec is Part 6. The Brand spec becomes **Part 7** (sections 7.0–7.8).

---

## A. Where the documents disagreed with each other

**1. Four different logos — Owner decision.**
The logo is the Brand spec's, **unchanged**, exactly as delivered in the brand package (confirmed by the owner on 10 Nov): the clapper over the speech bubble with three dots (white, white, green), from the master files. The plain bubble is retired. Light, on-dark and small files are chosen by surface, as the Brand spec's table says. Delete the logo descriptions in Discover 4.2 and 4.11, Site-wide 5.3.2 and criterion 16, Work 6.2.3 (including its SVG code) and criterion 12; each becomes a pointer to the Brand spec.

**2. Two documents called "Part 6" — Corrected.**
Brand spec becomes Part 7. Precedence as in the table above. The developer's assumption was right.

**3. The logo says "yapping", the copy says "Yapp" — Owner decision, known and temporary.**
The owner has chosen the name "Yapping". The Brand spec holds interface copy at "Yapp" until the name is legally cleared, then one change renames copy, metadata and store listings. Until then the mismatch is intended. The Legal pack uses "Yapping" because it is written for publication after clearance. Do not rename copy now.

**4. When a campaign creator is paid — Owner decision.**
Seven days after the post is verified, if the post is still live. The post must stay live 30 days from verification, checked daily. Down before release: 48 hours to restore, otherwise the slot is refunded. Removed after release and before day 30: breach, recovered from the creator's balance. The Legal pack is right on this. "Month end" is removed from Work 6.0, 6.5.6, 6.6.4, 6.8.5, 6.9, 6.9.1, 6.9.3, 6.10.1, 6.14 and Site-wide 5.5.1 (items 7 and 13). Work 6.6.5 "Paid when the brand approves" was wrong for a campaign; it becomes "Paid 7 days after your post is verified".

**5. When the brand is charged — Agreed.**
- Campaign: the full amount (slots × price; see item 6 for the fee) is charged or authorised **when the campaign is posted**, and held. Each slot is paid out after its video is approved and its post verified. Unpicked slots are refunded when the campaign closes.
- Custom order: nothing at posting. Charged **at hire**, held, released on approval.
- Work 6.8.5 "Total, charged on approval" → "Total · held since you hired".
- Work 6.11.9 "Money is held per slot as creators pick" → "The full amount is held when you post. Each slot is paid out after you approve its video. Unpicked slots are refunded when the campaign closes."
- Work 6.10.1 button → "Approve and release payment". The summary box above it shows the three amounts from item 6: You pay $570 · Maya receives $456 · Yapp fee (20%) $114.

**6. Service fee — Owner decision (10 Nov): 20%, taken from the creator's side.**
This replaces both earlier rules (no fee on campaigns; 10% added for the brand, 0% for creators).
- Yapp keeps **20% of every transaction**: campaigns, custom orders, add-ons and paid extra revisions.
- The brand pays the listed price and **nothing on top**. The creator receives **80%**.
- Example, custom order at $570: the brand pays $570 (held at hire). On approval Maya receives $456 and Yapp keeps $114.
- Example, campaign of 10 Yapps at $140: the brand pays $1,400 at posting. Each creator receives $112 per Yapp.
- **Copy to change everywhere:**
  - "You earn · you keep 100%" → "You earn $456 · after the 20% Yapp fee";
  - every "+ 10% fee" and "Service fee (10%)" line on the brand side is removed; the brand's total is the price;
  - Work 6.8.5 brand total "$627" → "$570"; Work 6.11.9 and 6.11.10 totals lose the fee ("10 Yapps × $140 = $1,400").
- **Creators always see their net.** Every job card, the job page, the pick and pitch modals and the order page show the price and the net together: "$140 per Yapp · you earn $112". In a pitch, the creator types their price and sees "You receive $X" under it.
- **Refunds and breach recovery** are calculated on the price the brand paid.
- The $30 floor is the listed price; the creator's net at the floor is $24.
- The Legal pack changes to match: see G1 and G2. Any outreach message that promises creators 100% must be corrected before it is sent again.

**7. Usage rights — Owner decision.**
The brand picks one of four options on each order: paid ads 12 months, paid ads 6 months, organic only, paid ads with no end date. The option is part of the price; there is no separate rights add-on. Creators see the option before they pick or pitch. This replaces the app's current model (organic included, paid-ad rights as a creator-priced add-on).
- Discover 4.9 table row → "Ad usage rights included · you choose the term".
- Discover 4.12.1 package "Yapp + 30-day ad rights" → "Yapp + paid ads · 6 months".

**8. Revisions — Agreed.**
Two, everywhere. Discover 4.9 card → "Two revisions included". Discover 4.12.1 package "1 revision" → two.

**9. Raw footage — Owner decision.**
Included with every approved video. It is not an add-on. This reverses the developer's assumption. Remove "Raw footage add-on $60" from Work 6.8.5; the sample breakdown shows "Extra hook variation $60" instead.

**10. "No quotes, no back-and-forth" — Corrected.**
The card is true for campaigns and creator packages and false for custom orders. New text: "**Visible prices** — Campaigns and creator packages show their price upfront. For a custom order, you set the budget and creators pitch within it."

**11. What desktop visitors see at "/" — Owner decision.**
- Signed out, desktop: the **bubble landing** with sign-in (Desktop spec).
- Signed in, desktop: **Discover** at "/". `/discover` redirects to "/". One exception, from item 43: an account with only a creator profile is sent to Work.
- The reels feed is phone-only. Desktop never renders it.
- Discover 4.18 (Discover at `/discover`) is the line to correct. Site-wide 5.1.2 gains the signed-out row.

**12. Sign-in layout — Agreed.**
Sign-in stays a glass panel over the bubbles, restyled. The owner asked for a side panel for sign-in and similar flows. Site-wide 5.4.2 "centred 440px card" is deleted.

**13. How much green — Agreed.**
One green action per view.
- "Needs you" becomes a white card with a narrow accent bar (Site-wide 5.4.2 already said this; the preview did not follow).
- The Search button becomes the dark pill.
- "Pick now" is the one green action on Find work. It repeats on each campaign card, as one action in a list.

**14. Emoji and exclamation marks — Agreed.**
Line icons replace every emoji (lock, people, flag, microphone, lightning and the service symbols). The footer reads "Canada · English". Comment reactions are dropped from this version (Site-wide 5.5.4 `reactions` field removed). "Approved! Now post it" → "Approved. Now post it on your account".

**15. Mascots — Owner decision.**
The blob characters are replaced by **abstract illustrations** in the brand palette, in confirmation modals and empty states. This reverses the developer's assumption. Until the artwork is supplied, show the modal with no illustration; do not ship the characters. The interactive characters on the phone feed's order posts are outside this round and stay as they are until the feed is revisited.

**16. Taking a campaign slot — Owner decision.**
"**Pick now**", everywhere, with the remaining count beside it. It replaces "Make a Yapp", "Make Yapp now", "Take a slot" and "Join · earn $X". The Legal pack uses the same words (G2).

**17. The statistics page — Owner decision.**
"**Productivity**". The sidebar group label "Insights" is removed. The tab "Stats" becomes "Productivity".

**18. The two kinds of order — Corrected.**
"**Custom order**" and "**UGC campaign**". Discover's "Request" becomes "Custom order", and `Brief.kind: 'request'` becomes `'order'`.

**19. Messages on phones — Owner decision (10 Nov).**
Messages and notifications are two tabs, side by side, in the bottom bar. The bar has six items: **Home · Discover · Work · Messages · Alerts · Profile**. Icons only; the active tab shows its label, as today; each target stays at least 44px. Site-wide 5.2.1 (five tabs), Site-wide 5.5.5 (a chip on Work), Work 6.2.2 (a header icon) and the app's single Inbox tab are all replaced by this. "The only channel between brand and creator" becomes "Messages is the channel for conversation. Feedback on a delivered video lives in the comments on that video."

**20. A star rating for brands — Agreed.**
No stars for brands. The brand card shows platform-computed figures: Pays on time, Review speed, Hire rate, Auto-approved, Shares results. Each shows "—" until there is enough data. Remove "Rating 4.8" from Work 6.6.6 and 6.8.6.

**21. Copyright line — Owner decision.**
"© 2026 Line Node Technologies, Canada. All rights reserved." Discover 4.11 and criterion 10 change.

**22. Footer links — Recommended.**
The Site-wide list (five columns) is the list. The Legal column shows the five main documents plus "All legal documents", which opens an index page listing every document in the Legal pack. A link ships only when its page exists (see item 40).

**23. Who can use the service — Owner decision (10 Nov).**
The audience is global; the launch is **Canada and the United States**.
- At launch, sign-up, payments and payouts are offered in Canada and the United States, under the Legal pack as written (which excludes Quebec).
- Nothing is built as "two countries only": country, currency and language are data, so a country can be added without a rebuild.
- The prototype does not block by country.
- Product copy says "US & Canada" for now. The French note is removed from Site-wide 5.6.2, and sample creators are not placed in Quebec.
- Each new country needs its own legal review before it opens (G2, Terms of Service 2.2).

**24. Physical products — Owner decision.**
Yapp does not ship products now; that is planned for a later phase. "Unboxing" and "Gadgets & audio" stay. A brief for a physical product must state that the creator uses a product they already own, or that access is digital. New order shows the note "Shipping products isn't available yet." The developer's assumption was right.

**25. Fonts — Agreed.**
Inter 400, 500 and 600 only. The wordmark is outlined artwork, so 700 is not loaded at all. The previews' 300, 700 and 800 are errors.

**26. File names — Corrected.**
The names in the specs are the real ones. The delivered copies were renamed on export.

| Delivered as | Correct name |
|---|---|
| `DISCOVER PAGE SPEC.md` | `YAPPS_DISCOVER_SPEC.md` |
| `DISCOVER PAGE.html` | `YAPPS_DISCOVER.html` |
| `YAPPS_WORK (7).html` | `YAPPS_WORK.html` |

The next package will use the exact names.

---

## B. Where a document did not hold together

**27. "Other services" as jobs — Owner decision (10 Nov).**
For now there is **one** non-video job: **Ad copy writing**. Script writing, hooks, voiceover, editing, captions and thumbnails are future services and are removed from this version (Work 6.5.4, the filters, New order and the price table). The developer's choice to leave them out was right.

Ad copy writing in this version (Recommended flow, to be previewed before it is built):
- It follows the **custom-order path**: pitch, hire, deliver, review, approve, paid on approval. It is never a campaign: no slots, no posting step, no keep-live period, no follower tier.
- Delivery is text: typed into the delivery sheet or attached as a document (PDF, DOC, DOCX, TXT).
- Review comments are general comments, without timestamps.
- The job page hides "30 sec · 9:16", the format and the platform tags.
- The Terms' definition of the marketplace adds written ad copy (G2, Terms of Service 4.1).

**28. "Services" means two lists — Corrected.**
The nav's **Services** is what Yapp offers brands. The Work filter is renamed **Job type**, with two values in this version: Full video and Ad copy writing.

**29. Price guidance — Owner decision on the model; details Corrected.**
- **One hard floor:** $30 per Yapp, every tier. Nothing else blocks posting.
- **Tier prices are removed.** The tier buttons show no dollar figure. The "TBC" tiers no longer exist as prices.
- **The usual range is scaled by tier.** Owner-approved factors: 10K–20K × 0.5 · 20K–50K × 0.7 · 50K–100K × 1.0 · 100K–250K × 1.3 · 250K+ × 1.7.
  `low = max(30, round5(154 × category × tier))`, `high = max(low + 20, round5(198 × category × tier))`.
  Example: AI tools at 10K–20K → $110–$140. At 50K–100K → $215–$275.
- **The default price is `low`**, so the default never shows the warning.
- **The warning never blocks.** Below `low` it is red and offers a "Use $low" chip.
- **Order of steps:** category and job type move to step 1 (Type), so the range is known when the price is set on step 2. The Yapp count stays on step 2, as the owner asked.
- **Sources:** the two second-hand figures must be replaced by their primary reports, or the note reads "industry estimates" with no named figures. The tier factors are labelled as Yapp estimates. All numbers live in one config file, not in components.
- **The range is the listed price**, the amount the brand pays. Creators see their net beside it (item 6).
- This amends `YAPPS_PRICING_AND_FEED_HANDOFF` A2 ("suggested start" prices are dropped).
- The developer's interim choice (prices from the tier) is replaced by the above.

**30. Find work as the default for everyone — Recommended.**
The default section follows the account: an account with a creator profile opens **Find work**; a brand-only account opens **Ordered**. A brand-only account can still browse Find work, with the pick and pitch buttons replaced by "Create a creator profile to take work".

**31. Find work filters — Owner decision (10 Nov).**
- **Kept:** the finder bar with its search field and category select, and the sidebar on the left with its filter groups (Job type, Category, Platform, Pay at least, Closes within).
- **Removed:** the horizontal chip row under the finder bar (Work 6.5.2, "Categories" and "Other services").
- The finder's category select and the sidebar's Category group are one filter shown twice; changing either updates the other.
- The format tabs, the type bar, sort and the view toggle stay.

**32. The same open orders in four places — Clarified.**
One data source, four views with different jobs. **Find work** is the full board. **Live briefs** on Discover shows the latest six and links to Find work. The feed's **Orders** tab is the phone browsing view. If the app's `/explore` lists open orders, it redirects to Find work on desktop; if it lists creators, it stays.

**33. No screen for the brand's side of an order — Agreed, and acknowledged as the largest gap.**
The app's existing owner screens (pitch review, hire, campaign slots) stay and are restyled. "Your orders" rows link to them. A posted order opens its owner screen for the brand, not the creator's job page. Two redesigned screens, pitch review and campaign management, will be delivered as a separate spec with a preview; nothing in Work 6 replaces the existing screens until then.

**34. Page addresses reversed — Corrected.**
The app's addresses stay. The Work spec's route names were not a requirement. Read "the job page" for Work 6.6 and "the order page" for Work 6.8, at whatever addresses the app already uses.

**35. The wizard drops the product — Corrected.**
Nothing was meant to be dropped. Keep saved products and their learnings (Work 6.11.6 already says the production field is a select from Products), invite-only requests, the number of videos on a custom order, and sample videos in a pitch. Work 6.7.2's pitch form gains "attach sample videos". The existing wizards stay until the new one covers all of this.

**36. Statistics that need data nobody has — Recommended.**
Productivity ships with the figures the platform can compute: spend, videos, cost per video, on-time rate, first-pass approval, rehire rate, earnings, pending. CAC, ROAS, CTR, hook rate, reach and CPA show "Connect an ad account" and no number. The account menu chip and the first KPI card show a platform figure, not CAC, until an account is connected. The summary inside Work is not built in this version; the sidebar item links to the full page.

**37. Services with nothing behind them — Owner decision (10 Nov).**
Creator Network, Amplified ads and For growth agencies are **hidden** from the nav menu, the footer and the More page until the product can do them. The menu lists: UGC ads, Native posts, Hook Lab, Go to market, For tech teams. A service page ships only with written copy; no `TODO(copy)` page goes live.

**38. Campaign platforms — Agreed.**
- Campaigns use only platforms where the creator's account can be connected and verified (the three the app supports today).
- A campaign may list more than one. The creator posts on **one** of them, chosen when picking, and pastes one link.
- "Meta ads" is an ad placement, not a place to post. It is removed from campaigns and kept for custom orders as "where the brand will run it".

**39. Out of revisions — Agreed.**
Three paths: approve; a paid extra revision by agreement (the app's existing option); open a dispute. Work 6.10.3 and the Legal handoff 3.3 ("the only paths are approval or a dispute") are corrected (G2, Brand Terms 5.3).

**40. A footer on every signed-in page — Recommended.**
Signed-in app pages get the **compact** footer: logo, legal links, © line. The full footer appears on Discover, the landing and the marketing pages. No link is rendered until its page exists.

**41. The "More" page — Recommended.**
Only rows with a destination are shown. Rows marked for the native app do not render on the web. The Appearance row is removed (see item 49). Region and Currency stay.

**42. "Get the app" — Corrected.**
Until the app is listed, the two store buttons are replaced by one disabled pill, "Coming soon to the App Store and Google Play". No dead links.

**43. Discover as the home for signed-in users — Owner decision on the role; content Recommended.**
Discover is the main page. For a signed-in account, the how-it-works stepper, the comparison table and the closing sales bar are hidden; the stats, Live briefs, the Explore strip, stories and reviews stay. An account with only a creator profile lands on Work.

**44. Sample numbers without the "Sample" chip — Corrected.**
Every sample figure carries the chip, on phones too. Discover 4.14's line hiding chips on phones is deleted. No sample figure ships to production. A stat with no real data behind it is hidden, as Discover 4.17 already says.

**45. Names called fictional that are not — Corrected.**
All demo brands, products and people are replaced by invented names that have been checked. This includes Fynd, Stackline and Orbit Audio in Discover, and Notion, Linear, Ramp, Loom, Raycast, Framer, Superhuman, Arc, Cal.com and Pixel Buds in the Work preview. The developer's assumption was right.

---

## C. Where a preview differs from its own spec

The spec wins in every case below. The previews will be corrected before the next package.

**46. Discover preview — Corrected.**
- Signed-out nav and the Services menu are per Site-wide 5.4.4.
- Phones get the tab bar.
- Footer and © per items 21, 22 and 40.
- The embedded phone app: "Log out and forget this account" is removed; the "5K–10K · $45" tier is removed (the lowest tier is 10K–20K); the logo is the Brand spec's.
- `--ease` is `cubic-bezier(.2,.8,.2,1)`, as in Discover 4.1.1.

**47. Work preview — Corrected.**
- Below the layout switch, filters open from a Filters button in a sheet (Work 6.3.4).
- The tab control stays visible on Productivity.
- The order page's next step follows the order's status. It is not "Approve and release" for every order:

  | Status | Next step for the brand |
  |---|---|
  | Offer sent | "Waiting for {name} to accept." · Withdraw offer |
  | In progress | "{name} is working on version 1. Due {date}." · Message |
  | Ready to review | Approve and release · Request changes |
  | Revision | "{name} is working on version N." · Message |
  | Completed | Order a variation · Files |
  | Cancelled | "Cancelled on {date}. {refund line}." · no action |

- The price step shows one total, "Total · 10 Yapps × $140 = $1,400", and under it "Each creator receives $112 after the 20% Yapp fee". The summary card shows the same total.

**48. The hot-categories fix — Corrected.**
The fault is the fixed 78px name column. The fix: the name column is `minmax(0, 1fr)` capped at 140px, one line, ellipsis; the bar column takes the rest. Names never wrap and bars never shift.

---

## D. Details that break when built as written

**49. No dark values — Owner decision.**
Dark mode is paused. This version is light only. Do not derive dark values; hide the app's dark-mode switch.

**50. Tertiary text colour — Agreed.**
Any text people must read uses the secondary colour `#6E6E73`. `--y-ink-3` (`#9A9AA0`) is for hints and axis labels only. The Site-wide mapping of the app's tertiary text to it is corrected.

**51. Status chip colours — Agreed.**
Small chip text: green `#0A7A33` (5.5:1 on white), red `#B42318` (6.6:1), amber `#92400E` (7.1:1). Check each on its tinted chip background and keep at least 4.5:1. `#16A34A` and `#E5483B` remain for icons, bars and text at 18px and above.

**52. Translucent cards — Agreed.**
Paper is opaque. Glass is used only for the nav, sticky headers and sheet headers.

**53. The supplied logo component — Agreed.**
Add the base path, and swap the light and on-dark files with CSS. That does not alter the artwork, so the "never redraw" rule holds. Over video, use the on-dark files.

**54. Tablets from 761px — Agreed.**
One switch at **1024px**. Below it: the phone experience (tab bar, feed as home). At 1024 and above: desktop. Site-wide 5.1.1 is corrected. The Work sidebar still collapses to tabs below 1180px.

**55. Pastel colours — Agreed.**
Those blocks are white, with an icon and label carrying the meaning.

**56. Page width — Agreed.**
The 1520px container applies to the redesigned pages (Discover, Work). Restyled pages keep their existing widths.

---

## E. Reversals of the previous round

All three are intended. The fault was that the newer file did not say so.

**57. "Log out and forget this account"** — Owner decision: removed. "Log out" only.
**58. The bubbles on desktop** — Owner decision: signed-out visitors only. Signed-in users land on Discover.
**59. The feed on desktop** — Owner decision: phone only.

---

## F. Not possible in the current prototype

**60. Agreed.** Server detection and redirects, the APIs, analytics, ad-account sign-in, real uploads and scans, reminders, disputes, CAD and French are requirements for production. The static prototype is not expected to do them. Where a rule depends on one, the prototype shows the screen and states.

**61. Agreed.** The demo's limit of 50 slots stays. The product rule is still a minimum of 10, in steps of 5, up to 500.

---

## The twelve questions

| # | Question | Answer |
|---|---|---|
| 1 | Spec or direction? | A specification to build as written, under the five rules at the top. Layouts of Discover, Work, the job page, the order page and New order are to be matched, with the corrections in this file. Existing brand-side screens stay (item 33). |
| 2 | Which logo? | The Brand spec's clapper with white, white, green dots. |
| 3 | Campaign pay? | 7 days after verification; post kept live 30 days. |
| 4 | Feed and bubbles on desktop? | The feed is phone-only. The bubbles stay as the signed-out page; signed-in users get Discover. |
| 5 | Usage rights? | Four options per order, chosen by the brand, included in the price. |
| 6 | Non-video jobs? | One for now: Ad copy writing, as a custom order with text delivery and no posting. The others are future services and are removed from this version. |
| 7 | Price guidance? | $30 floor only; no tier prices; range scaled by tier; default at the low end; category chosen before price; sources fixed or unnamed. Yapp keeps 20% from the creator's side; the brand pays the listed price. |
| 8 | Where does a brand review pitches and manage slots? | On the app's existing owner screens, restyled. New designs follow as a separate spec. |
| 9 | Productivity, Services, More in this version? | Yes, reduced: Productivity with platform figures only; Services with five entries (three hidden); More with working rows only. |
| 10 | Phone bar? | Home · Discover · Work · Messages · Alerts · Profile. |
| 11 | Who can sign up? | Global audience; launch in Canada and the United States. No block in the prototype; built so countries can be added. |
| 12 | One name each? | "Pick now" · "Productivity" · "Custom order" and "UGC campaign". |

---

## G. Legal updates

This section amends `YAPPS_LEGAL_HANDOFF.md` and the Legal pack (`Yapping_Legal_Docs_v1.0`). Where they differ from this section, this section is correct. The legal text is not published until it matches, and a lawyer reviews it before publication.

Clause numbers are the ones the developer's review cites. The Legal pack itself was not opened while writing this section, so each number must be checked against the pack when the edit is made.

### G1. The numbers (replaces Legal handoff section 2)

| Item | Value | Changed? |
|---|---|---|
| Platform fee | **20% of every transaction**, deducted from the creator's payout | **Changed** (was 10% added for the brand) |
| Brand pays | The listed price. No fee is added | **Changed** |
| Creator receives | **80%** of the listed price | **Changed** (was 100%) |
| Fee applies to | Campaign slots, custom orders, add-ons, paid extra revisions | **Changed** (campaigns were once fee-free) |
| Campaign: brand charged | `slots × price` at posting; held | **Changed** (no "+10%") |
| Custom order: brand charged | The agreed price at hire; held | Wording only |
| Campaign payment release | 7 days after the post is verified, if still live | Same |
| Custom order payment release | On approval | Same |
| Keep-live period | 30 days from verification, checked daily | Same |
| Restore window | 48 hours | Same |
| Auto-approval | 3 days after delivery, on silence | Same |
| Reminders before auto-approval | 48h, 24h, 2h, by push and email | Same |
| Revisions included | 2 | Same |
| After revisions are used | Approve · paid extra revision by agreement · dispute | **Changed** (a third path) |
| Dispute first human reply | 48 hours | Same |
| Minimum price | $30 per Yapp (listed; the creator's net is $24) · $30 per pitch · $50 custom-order budget | Same figures; net added |
| Maximum price | $5,000 per Yapp | Same |
| Tier prices | None. Price guidance is advice and never an obligation | **Changed** |
| Campaign price changes | Raise only, for unpicked slots | Same |
| Usage rights | One of four options per order, **included in the price**; no separate rights add-on | **Changed** (no add-on) |
| Raw footage | **Included** with every approved video | **Confirmed** |
| Services covered | Short videos, and written ad copy (custom orders only) | **Changed** |
| Campaign posting | On **one** platform the creator chooses from the campaign's list; connectable platforms only | **Changed** |
| Markets | Launch: Canada (outside Quebec) and the United States. Other countries open later, each after legal review | **Changed** (worded as a launch scope) |
| Physical products | Not shipped. The creator uses their own product, or access is digital | Same |
| Brand ratings | Creator feedback on brands is private; brands are shown by reliability figures | Same |
| Comments | Open 30 days after completion, then read-only; never deleted | Same |

Still open from the Legal handoff, unchanged: the unpicked-slot refund period after a campaign closes, and the campaign close window (14 days in the preview).

### G2. Changes by document

**Terms of Service**
- **2.2 Who can use the service:** state the launch markets (Canada outside Quebec, and the United States) as where the service is offered **today**, and that other countries may be added. Do not word it as a permanent limit.
- **4.1 What the marketplace is:** short videos, and written ad copy ordered as a custom order.
- **4.7 Physical products:** unchanged.
- **Names:** the service is "Yapping" in the legal text; the interface shows "Yapp" until the name is cleared. Add one line saying the two names mean the same service.

**Brand Terms**
- **4.1 Charges:**
  - a campaign is charged `slots × price` at posting; a custom order is charged the agreed price at hire;
  - no service fee is added to the brand's price;
  - remove every "+10%".
- **4.2 Release:** unchanged (7 days after verification for a campaign slot; on approval for a custom order).
- **4.4 Fees:** Yapping's fee is 20% of each transaction and is deducted from the amount paid out to the creator. The brand is told this so the price it sets is understood as the gross price.
- **5.3 Revisions:** two included. After that: approve, agree a paid extra revision with the creator, or open a dispute.
- **6.1 Usage rights:** the brand chooses one of four options per order. The option is included in the price. Raw footage is included.
- **11.2 Ratings:** unchanged.
- **14 Statistics:** the page is called "Productivity".
- **Refunds:** a refund returns the price the brand paid. Yapping keeps no fee on a refunded amount.

**Creator Agreement**
- **3.1 Eligibility:** the same launch-market wording as Terms of Service 2.2.
- **5.4 Taking a slot:** the action is "Pick now". On a campaign with several platforms, the creator chooses one when picking and posts there.
- **9.3 and 11 Payment:**
  - the creator receives the listed price less Yapping's 20% fee;
  - the net amount is shown before the creator picks or pitches, and on the order;
  - timing is unchanged (7 days after verification; on approval);
  - remove "0% creator fee" and "you keep 100%" wherever they appear.
- **10.3 Licence:** the licence covers the option the brand chose; it is part of the price, with no separate rights fee. It covers raw footage.
- **13.4 Ratings:** unchanged.
- **Breach (post removed after payment):** the refund to the brand is calculated on the price the brand paid (remaining days ÷ 30 × price). See G3 for who bears each share.
- **New deliverable:** ad copy is delivered as text or a document, is never posted by the creator, and has no keep-live period.

**Acceptable use, Privacy, Cookies, Accessibility**
- No rule changes.
- The accessibility statement's 4.5:1 contrast commitment now holds for status chips (item 51).
- Privacy: remove ad-account metrics from "data we collect" until ad accounts can be connected (item 36), or mark it as collected only when a brand connects one.

**Legal pack readme**
- Section 1 (footer links): the footer shows five main documents and "All legal documents", which lists the rest (item 22).
- Section 3 (numbers): replace with G1.
- Section 4 (name): keep, with the one-line note above.

### G3. New points for the lawyer and the owner

These follow from the 20% decision and are not yet settled. None blocks the prototype.

1. **Breach recovery and the fee.** When a creator removes a post early, the brand is refunded on the price it paid, but the creator received only 80% of it. Proposed: the creator returns their 80% share of the refunded amount and Yapping returns its 20% share. To confirm.
2. **Sales tax on the fee.** Whether GST/HST or US sales tax applies to Yapping's 20%, and how it is shown on the creator's statement.
3. **Creator income reporting.** Whether a creator's reportable income is the listed price or the net amount, in Canada and in the United States.
4. **Fee disclosure to creators.** The 20% must be stated before a creator picks or pitches. Confirm the wording meets consumer and platform-work rules in both countries.
5. **Fee changes.** Keep the existing promise: announced 30 days ahead, never applied to open orders or picked slots.
6. Still open from before: holding third-party funds (use a licensed payment provider), enforceability of non-circumvention, and the moral-rights waiver.

---

## Still with the owner

Nothing blocks the build. The owner answered every open point on 10 Nov (items 6, 19, 23, 27, 31 and 37).

Six items carry a **Recommended** default that the owner has not ruled on: items 22, 30, 36, 40, 41 and 43. Build the default. It changes only if the owner says so.

## What happens to the documents

1. The Work spec is updated with the Trust rules, the Pricing handoff and every Work item above.
2. The Site-wide, Discover and Mobile specs take their corrections; the Brand spec is renumbered Part 7.
3. Both previews are corrected (items 44–48) and demo names replaced (item 45).
4. The Legal pack and `YAPPS_LEGAL_HANDOFF.md` are edited to match section G. The legal text is not published until it matches and a lawyer has reviewed it.
5. One consistency pass checks every number and name across all files before the next package is sent.
6. The brand-side screens and the ad copy delivery flow are designed and sent as an addition.
