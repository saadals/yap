# Round 3 documents: contradictions and open points

Reviewed 9 November 2026. This lists every place where the round 3 documents contradict each other, contradict themselves, or can't be built as written, so each one can be checked and settled.

**Files reviewed**

| Short name used below | File |
| --- | --- |
| Discover spec | `DISCOVER PAGE SPEC.md` (Part 4) |
| Discover preview | `DISCOVER PAGE.html` |
| Site-wide spec | `YAPPS_SITEWIDE_SPEC.md` (Part 5) |
| Work spec | `YAPPS_WORK_SPEC.md` (Part 6) |
| Work preview | `YAPPS_WORK (7).html` |
| Brand spec | `Yapping-Developer-Brand-Package/YAPPS_BRAND_SPEC.md` (also Part 6) |
| Brand book | `Yapping-Brand-Guidelines.pdf` |
| Legal pack | `Yapping_Legal_Docs_v1.0.zip` |

The two previews were read from their HTML source, not rendered in a browser, so the figures in items 38 and 44 are calculated from the CSS.

**How to read an entry.** "Where" gives the file and section. "What" is the conflict. "Assumed for now" is what the prototype does until someone decides otherwise; "open" means nothing was built.

The questions that most need an answer are collected at the end.

---

## A. Where the documents disagree with each other

**1. Four different logos**
- Where: Discover spec 4.2 and 4.11; Site-wide spec 5.3.2, 5.12 (criterion 16) and 5.13; Work spec 6.2.3, 6.16 (criterion 12) and 6.17; Brand spec 6.2 and 6.8.
- What: Discover has a bubble with white, white, green dots and warns that the landing page uses three green dots. Site-wide makes it green, green, red, "final, everywhere". Work goes back to white, white, green, calls it "original, final" and says Site-wide must be updated. The Brand spec replaces all of them with a clapper over the bubble and the word "yapping".
- Assumed for now: the Brand spec's logo, from its master files.

**2. Two documents are both "Part 6"**
- Where: Work spec title; Brand spec title.
- What: each sets rules of precedence over earlier parts, and neither mentions the other. On the logo they disagree (item 1).
- Assumed for now: the Brand spec wins on logo, icons and colours; the Work spec on its own pages.

**3. The logo says "yapping", every document says "Yapp"**
- Where: Brand spec 6.6; Brand book page 9 ("Name status: not yet cleared"); Legal pack readme section 4.
- What: the logo artwork reads "yapping" and the Legal pack calls the service "Yapping", while every spec and preview says "Yapp". The Brand spec says to change the logo only.
- Assumed for now: new logo, copy unchanged. The header reads "yapping" above pages that say "Yapp".

**4. When a campaign creator is paid**
- Where: Work spec 6.9, 6.9.3 and 6.8.5; Site-wide spec 5.5.1 (item 7); Legal pack readme section 3, Brand Terms 4.2, Creator Agreement 9.3 and 11.
- What: the two specs say at month end, if the post stays up. The Legal pack says 7 days after the post is verified, with the post kept up for 30 days and checked daily. Work spec 6.6.5 also lists "Paid when the brand approves". The Legal pack's readme says its numbers must match the Work spec; they don't.
- Assumed for now: the Legal pack's rule (7 days, 30-day keep-live).

**5. When the brand is charged**
- Where: Work spec 6.8.5, 6.10.1 and 6.11.9; Legal pack Brand Terms 4.1.
- What: the order page says "Total, charged on approval" beside "$627 held". The wizard says "Money is held per slot as creators pick" and, a few lines later, that the full amount is charged when the campaign is posted. The approve button says "Approve and release $627" when the creator receives $570. The Legal pack: charged at hire (custom order) or at posting (campaign), then held.
- Assumed for now: the Legal pack's wording; the button names the creator's amount.

**6. Service fee on campaigns**
- Where: Work spec 6.11.9 and 6.11.10; Legal pack Brand Terms 4.1 and 4.4.
- What: both charge 10% on campaigns. The app, by an earlier owner decision, charged none. Neither document notes the change.
- Assumed for now: 10% on campaigns.

**7. Usage rights: three models**
- Where: Work spec 6.11.8; Legal pack Brand Terms 6.1 and Creator Agreement 10.3; Discover spec 4.9 and 4.12.1.
- What: Work and the Legal pack let the brand pick one of four options per order. Discover says "Ad usage rights included" and also sells a "Yapp + 30-day ad rights" package; 30 days isn't one of the four options. The app today includes organic use and sells paid-ad rights as an add-on priced by the creator.
- Assumed for now: open. The app is unchanged.

**8. Revisions**
- Where: Discover spec 4.9 (trust card "Free revisions"); Work spec 6.5.6; Legal pack readme section 3.
- What: Discover promises "revisions until the video is right". Work and the Legal pack say two.
- Assumed for now: two.

**9. Raw footage**
- Where: Discover spec 4.4 (step 3); Work spec 6.8.5 and 6.10.1.
- What: Discover's step 3 delivers "several hooks to test, plus raw footage". Work lists raw footage as a $60 add-on in 6.8.5, then in 6.10.1 says approval gives "the clean file… plus raw footage" as if always included.
- Assumed for now: an add-on.

**10. "No quotes, no back-and-forth"**
- Where: Discover spec 4.9 (trust card "Fixed, visible prices"); Work spec 6.5.6 and 6.7.2.
- What: custom orders are pitched by creators with their own price, which is a quote.
- Assumed for now: open (Discover isn't built).

**11. What desktop visitors see at "/"**
- Where: Discover spec 4.18; Site-wide spec 5.1.2.
- What: Discover keeps the bubble landing for signed-out visitors and puts Discover at `/discover`. Site-wide makes `/` Discover on desktop and redirects `/discover` to it. The bubbles aren't mentioned.
- Assumed for now: open. Nothing has moved.

**12. Sign-in layout**
- Where: Site-wide spec 5.4.2 and 5.4.1; Brand spec 6.3.
- What: 5.4.2 asks for a "centred 440px card". 5.4.1 says restyled pages keep their layout, and sign-in is a glass panel over the bubbles (built from the previous round's spec, and referenced by file name in the Brand spec).
- Assumed for now: the panel stays, restyled.

**13. How much green**
- Where: Brand book page 6; Site-wide spec 5.3; Work spec 6.4.1, 6.5.1 and 6.5.9.
- What: the Brand book says "Green is a signal, not a wallpaper… one primary action per view". Find work shows a green "Needs you" block, a green Search button and a green "Pick now" on every campaign card at once.
- Assumed for now: one green action per view on app pages.

**14. Emoji and exclamation marks**
- Where: Brand book page 9; Work spec 6.5.4, 6.5.9, 6.6.6, 6.8.3 and 6.9; Site-wide spec 5.5.4 and 5.6.2; Discover spec 4.11 and 4.12.1.
- What: the Brand book bans both in product copy. The specs use lock, people, flag, microphone and lightning emoji, emoji reactions on comments, and "Approved! Now post it".
- Assumed for now: icons, no reactions, no exclamation marks.

**15. Mascots**
- Where: Brand book page 9; Site-wide spec 5.4.1 and 5.5.3; Work spec 6.7.3.
- What: the Brand book says no mascots. Two specs keep the blob characters in confirmation screens and empty states.
- Assumed for now: the characters stay.

**16. Three names for taking a campaign slot**
- Where: Work spec 6.5.9 and 6.7.1; the previous round's mobile spec; Discover spec 4.12.4; Legal pack Creator Agreement 5.4.
- What: "Pick now", "Make a Yapp" and "Join · earn $X".
- Assumed for now: open. The app still says "Make a Yapp" and "Take a slot".

**17. Three names for the statistics page**
- Where: Site-wide spec 5.9; Work spec 6.3.3 and 6.3.4; Legal pack Brand Terms 14.
- What: "Productivity", "Insights" (the sidebar group) and "Stats" (the tab below 1180px).
- Assumed for now: open (not built).

**18. Two names for the two kinds of order**
- Where: Discover spec 4.3.2 and 4.12.4; Work spec 6.5.6.
- What: Discover says "Request" and "Campaign". Work says "Custom order" and "UGC campaign".
- Assumed for now: open.

**19. Messages on phones**
- Where: Site-wide spec 5.2.1 and 5.5.5; Work spec 6.2.2.
- What: 5.5.5 puts a Messages chip at the top of Work and gives it no tab, while calling Messages "the only channel between brand and creator". Work 6.2.2 puts an icon in the header. 5.2.1 describes the current bar as having an Alerts tab; the app's bar has an Inbox tab holding Messages and Alerts.
- Assumed for now: the Inbox tab stays.

**20. A star rating for brands**
- Where: Site-wide spec 5.5.1 (item 9); Legal pack Brand Terms 11.2 and Creator Agreement 13.4; Work spec 6.6.6.
- What: creators' feedback about a brand is private and brands are shown by reliability stats. The job page's brand card shows "Rating 4.8".
- Assumed for now: review speed, share approved by the timer, and hires.

**21. Copyright line**
- Where: Discover spec 4.11 and 4.19 (criterion 10); Site-wide spec 5.6.1 and 5.13; Work spec 6.2.4.
- What: Discover requires "© 2026 Yapp Inc., Canada" as an acceptance criterion. The others say "Line Node Technologies, Canada".
- Assumed for now: Line Node Technologies.

**22. Footer links: three lists**
- Where: Discover spec 4.11; Site-wide spec 5.6.1; Legal pack readme section 1.
- What: four columns in Discover, five in Site-wide, and the Legal pack lists twelve legal links where the specs list five.
- Assumed for now: open. The existing footer is unchanged apart from the copyright line.

**23. Who can use the service**
- Where: Legal pack Terms of Service 2.2 and Creator Agreement 3.1; Site-wide spec 5.6.2; Discover preview.
- What: the Legal pack serves Canada outside Quebec and the United States. Site-wide offers "French ready for Canada later", and the Discover preview's sample creator is in Montréal. The owner wants a global audience.
- Assumed for now: no country restriction in the prototype.

**24. Physical products**
- Where: Legal pack Terms of Service 4.7 and Brand Terms 3.3; Discover spec 4.6 and 4.7; Work spec 6.4.4.
- What: the Legal pack says products aren't shipped, so a creator must already own the product. "Unboxing" is a launch format, "Gadgets & audio" a launch category, and the samples include a smart ring unboxing.
- Assumed for now: briefs for physical products say the creator needs their own.

**25. Fonts**
- Where: Discover spec 4.1.3; Site-wide spec 5.3; both previews.
- What: the specs allow Inter at 400, 500 and 600, with 700 only for the wordmark. The previews use 700 elsewhere, and 300 and 800, which they don't load.
- Assumed for now: 400, 500 and 600.

**26. File names**
- Where: every spec's "Read with" list.
- What: the specs refer to `YAPPS_DISCOVER_SPEC.md`, `YAPPS_DISCOVER.html` and `YAPPS_WORK.html`. The files delivered are `DISCOVER PAGE SPEC.md`, `DISCOVER PAGE.html` and `YAPPS_WORK (7).html`.

---

## B. Where a document doesn't hold together

**27. "Other services" as jobs**
- Where: Work spec 6.5.4 and 6.17; 6.6.2, 6.6.5, 6.9.1 and 6.9.3; Legal pack Terms of Service 4.1.
- What: script writing, hooks, voiceover, editing, captions, ad copy and thumbnails become jobs, but every later step is for video. The job page still shows "30 sec · 9:16", the upload sheet asks for "MP4 or MOV · 9:16", and the creator must post with a paid-partnership label. Follower tiers decide who may take the job. The Terms define the marketplace as short videos.
- Assumed for now: left out.

**28. "Services" means two different lists**
- Where: Site-wide spec 5.8.1; Work spec 6.5.4.
- What: the nav's Services menu lists Creator Network, UGC ads and so on. Work's "Service" filter lists Full video, Script writing and so on.

**29. Price guidance**
- Where: Work spec 6.11.4, 6.11.5 and 6.11.6; Work preview.
- What:
  - The formula ignores the follower tier. A 10K–20K campaign for "AI tools" gets "usual $215–$275", the same as every tier, while that tier's minimum is $30.
  - The message claims the range is "for {category} at {tier}".
  - The preview's default price of $200 triggers its own red "below market" warning.
  - The category that sets the range is chosen on step 3, after the price on step 2.
  - Two of the three sources are second-hand ("via Knowlify", "via DesignRevision").
- Assumed for now: left out. Campaign prices still come from the tier.

**30. Find work as the default for everyone**
- Where: Work spec 6.3.3; Work preview.
- What: the job board opens first for every account, including one with no creator profile that can't take a job.
- Assumed for now: open (not built).

**31. Find work filters**
- Where: Work spec 6.5.1, 6.5.2 and 6.5.8.
- What: category can be filtered in three places on one screen (a select, a chip row, sidebar checkboxes) and service in two, beside format tabs, a type bar, sort, a view toggle and removable chips.
- Assumed for now: open (not built).

**32. The same open orders in four places**
- Where: Work spec 6.5; Site-wide spec 5.4.2 (`/explore` kept); the mobile feed's Orders tab; Discover spec 4.3.2.
- What: Find work, Explore, the feed and Live briefs all list open orders.

**33. No screen for the brand's side of an order**
- Where: Work spec 6.4.4, 6.6 and 6.8; Site-wide spec 5.5.1 (item 2) and 5.4.2; Work preview.
- What: nothing shows where a brand reviews pitches and hires, or sees who took a campaign's slots, removes a creator, changes the tier or closes the campaign. In the preview the "Your orders" rows link nowhere and a newly posted order opens the creator's job page. Site-wide says those flows must keep working.
- Assumed for now: the app's existing owner screens stay.

**34. Page addresses are the reverse of the app's**
- Where: Work spec 6.6 and 6.8.
- What: the spec puts the open job at `/work/[id]` and the order in progress at `/orders/[id]`. The app has them the other way round.
- Assumed for now: the app's addresses stay.

**35. The new-order wizard drops the product**
- Where: Work spec 6.11.6 and 6.7.2.
- What: the product becomes a typed name. Saved products and the learnings carried from earlier orders go, along with invite-only requests and the number of videos. A pitch shrinks to an idea and a price, with no sample videos.
- Assumed for now: open. The two existing wizards are unchanged.

**36. Statistics that need data nobody has**
- Where: Site-wide spec 5.9.1, 5.9.4, 5.9.5 and 5.9.7; Work spec 6.12.
- What: CAC, ROAS, CTR, hook rate, reach and CPA need connected ad accounts. The brand's headline number is CAC. The account menu shows "CAC ↘ 12%". The page is summarised again inside Work, and its money sections repeat Wallet and Billing.
- Assumed for now: open (not built).

**37. Services with nothing behind them**
- Where: Site-wide spec 5.8.1 and 5.8.4.
- What: Creator Network, Amplified ads and Go to market describe things the product can't do yet. "For growth agencies" assumes one account running many brands. The pages have no copy (`TODO(copy)`).
- Assumed for now: open (not built).

**38. Campaign platforms**
- Where: Work spec 6.5.5, 6.11.6 and 6.9.3.
- What: a campaign can list several of eight platforms, but the creator posts once and pastes one link. "Meta ads" is on the list, and nobody can post to it or be tagged on it. Several others have no account connection, so followers can't be verified.
- Assumed for now: campaigns stay on the three connectable platforms.

**39. Out of revisions**
- Where: Work spec 6.10.3; Legal pack Brand Terms 5.3.
- What: the only option left is "Open a dispute", though the same clause allows new work at a new price by agreement.
- Assumed for now: the app's paid extra revision stays, with the dispute as the second option.

**40. A footer on every signed-in page**
- Where: Site-wide spec 5.6.1.
- What: about thirty links under Work, Messages and Settings, most to pages that don't exist (Careers, Press, Blog, Help center, Pricing).
- Assumed for now: open.

**41. The "More" page**
- Where: Site-wide spec 5.6.2.
- What: about 45 rows. A third are for a native app that doesn't exist (Rate, Check for updates, Clear cache, build number). Region and Currency offer only Canada and the United States. Appearance offers System and Light, with no dark.
- Assumed for now: open.

**42. "Get the app"**
- Where: Discover spec 4.5.1; Discover preview.
- What: App Store and Google Play buttons for an app that isn't in the stores. In the preview both link nowhere.

**43. Discover as the home for people who already have an account**
- Where: Discover spec introduction, 4.4, 4.9 and 4.10.
- What: a signed-in user lands on a how-it-works stepper, a comparison with agencies and a closing sales pitch. The headline speaks to brands only.

**44. Sample numbers without the "Sample" chip**
- Where: Discover spec data note, 4.14, 4.17 and 4.19 (criterion 12); Discover preview.
- What: every figure must carry a chip. The preview shows $15.2M traded, 48K Yapps, the story results and the comparison prices without one. Section 4.14 hides the chips on phones.

**45. Names called fictional that aren't**
- Where: Discover spec 4.5; Work preview sample data.
- What: Discover's "all fictional" list includes Fynd and Stackline, which are real companies, and "Orbit Audio", when a real maker sells earbuds named Orbit. The Work preview's sample jobs use Notion AI, Linear, Ramp, Loom, Raycast, Framer and others as customers.
- Assumed for now: invented names throughout the demo data.

---

## C. Where a preview differs from its own spec

**46. Discover preview**
- No signed-out navigation and no Services menu (Site-wide 5.4.4).
- No tab bar on phones, so Work and Messages can't be reached.
- The footer has no Services column (Site-wide 5.6.1) and says "Yapp Inc." (item 21).
- The embedded mobile app still has "Log out and forget this account" (removed by Site-wide 5.9.1) and a "5K–10K followers · $45" tier, below the lowest tier in Work 6.11.4. Its logo has three green dots.
- `var(--ease)` is used but never defined.

**47. Work preview**
- Below 1180px the filters disappear. The spec (6.3.4) moves them into a Filters button and sheet.
- Choosing "Stats" below 1180px hides the tab control, so there is no way back to the other tabs.
- The brand's order page shows "Version 1 is in… Approve and release" for every open order, including "Offer sent" and "Cancelled".
- On the price step, "Total for videos" leaves the fee out; the summary beside it includes it.

**48. The hot-categories fix**
- Where: Site-wide spec 5.7.1; Discover preview.
- What: the spec says long names push the bars to the right. In the preview the name column is a fixed 78px, so long names wrap onto two lines instead. The fix isn't applied in the preview.

---

## D. Details that break when built as written

**49. Colour values with no dark versions**
- Where: Brand package `code/yapping-tokens.css`; Site-wide spec 5.3.1.
- What: only light values exist, and the previews have no dark mode. The app has one.
- Assumed for now: dark values derived; dark mode kept.

**50. Tertiary text colour**
- Where: `yapping-tokens.css`; Brand spec 6.5; Site-wide spec 5.3.1.
- What: `--y-ink-3` becomes #9A9AA0, which the package rates 2.6:1 and "never for text people must read". Site-wide maps the app's existing tertiary text to it, and the app uses that colour for about a hundred lines of small text.
- Assumed for now: readable text uses the secondary colour.

**51. Status chip colours**
- Where: Site-wide spec 5.4.3 and 5.7.3 (item 7); Brand spec 6.5; Legal pack accessibility statement.
- What: chip text in #16A34A and #E5483B at 12.5px is 3.3:1 and 3.9:1 by the Brand spec's own figures. The audit list and the accessibility statement require 4.5:1.
- Assumed for now: darker green (#0A7A33), red and amber for small text.

**52. Translucent cards**
- Where: Site-wide spec 5.3.1; `yapping-tokens.css`.
- What: `--y-paper` at 90% opacity lets content show through sheets, sticky bars and a sticky table column.
- Assumed for now: paper stays opaque. It looks the same on the new background.

**53. The supplied logo component**
- Where: Brand package `code/brand.tsx`.
- What: it loads `/brand/…` from the site root. The demo is served under `/yap`, where that is a 404. As an image, the logo can no longer follow dark mode or the colour of the reel behind it.
- Assumed for now: the same files, with the base path added and the light and on-dark versions swapped by CSS.

**54. "Tablets get the desktop layout from 761px"**
- Where: Site-wide spec 5.1.1 and 5.7.3 (item 1); both previews.
- What: the desktop navigation doesn't fit there. From the CSS, the Work preview's nav fits only from about 1,060px and the Discover preview's from about 900px. The audit list requires no overflow at 768 and 1024.
- Assumed for now: the app's switch stays at 1024px.

**55. Pastel colours**
- Where: Site-wide spec 5.3.1; Brand book page 6.
- What: lavender, butter and sky become illustration-only. In the app they mean fit, money and trust on 37 blocks.
- Assumed for now: those blocks are white, with an icon and label carrying the meaning.

**56. Page width**
- Where: Site-wide spec 5.4.1 and 5.7.3 (item 2).
- What: restyled pages keep their layout grid, and every section must use a 1520px container. Forms and settings pages can't do both.
- Assumed for now: existing widths kept.

---

## E. Changes that reverse the previous round without saying so

**57. "Log out and forget this account"**: asked for in the previous mobile spec, removed by Site-wide 5.9.1.

**58. The bubbles on desktop**: the previous desktop spec kept them as the home for signed-in users. Now Discover is (item 11).

**59. The feed on desktop**: the first round asked for a reels feed as Home for everyone. Site-wide 5.1 makes it phone-only.

---

## F. Not possible in the current prototype

**60.** The prototype is a static site with no server. These wait for a backend: server-side device detection and 301 or 308 redirects (Site-wide 5.1), the `/api/*` endpoints (Site-wide 5.10, Work 6.14), analytics events, ad-account sign-in, real uploads with virus scans and duplicate checks, review reminders by push and email, dispute decisions and appeals, deal-sheet downloads, CAD and French.

**61.** Campaigns of up to 500 videos (Work 6.11.4): every slot is a pre-built page and 200 are reserved, so the demo's limit stays at 50.

---

## Questions that need an answer

1. Are these documents a specification to build as written, or a direction to draw from? In particular the layouts of Discover, Work, the job and order pages, and the new-order wizard.
2. Which logo is final (item 1)?
3. Campaign pay: month end or 7 days (item 4)?
4. Is the feed leaving desktop, and do the bubbles stay as the signed-out page there (items 11, 58, 59)?
5. Usage rights: four options per order, "included", or a priced add-on (item 7)?
6. Are non-video jobs intended, and how would a script or a voiceover be delivered and reviewed (item 27)?
7. The price guidance: the formula, its sources, and how it sits with the tier minimums (item 29). Tier prices above 50K are still "TBC".
8. Where does a brand review pitches and manage a campaign's slots (item 33)?
9. Are Productivity, the Services menu and the More page wanted for this version, and which services (items 36, 37, 41)?
10. The phone bar: an Inbox tab, or Alerts with Messages behind Work (item 19)?
11. Who can sign up: Canada and the United States only, or anywhere (item 23)?
12. One name each for taking a slot, for the statistics page, and for the two kinds of order (items 16, 17, 18).
