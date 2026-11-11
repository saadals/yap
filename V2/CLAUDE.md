# Yapp V2 — project guide for agents

Read this first, then [DESIGN.md](DESIGN.md). V2 is a second version of the Yapp prototype that
lives next to V1 (the repo root). V1's guide is [../CLAUDE.md](../CLAUDE.md): read its "What this
is", "Product in one minute" and the decisions table, because V2 keeps most of them. This file
lists what V2 changes, why, and how V2 is built.

## What V2 is

On 10 Nov 2026 the owner (Saad) asked for "another version of the demo" under `/V2`, with "full
freedom to make changes that you think makes sense, change UI based on what you think will be a
better user experience/UI". V1 stays untouched as the reference; V2 is the same product, rethought.

- Same product, market, data, money rules and brand as V1 (the brand package's logo and colours,
  the legal pack's rules and numbers, the round 3 answers file's rulings, invented names, contact
  masking, fixed demo clock, no backend). Those are firm in V2 too. When V1 changes a product rule,
  V2 follows it (see "Round 3 stage 2 port" below); V1's layouts and navigation are not copied.
- Different information architecture, flows and UI wherever we judged V1 could be easier.
- A separate Next.js app in `V2/` with no `node_modules` of its own (packages resolve from the
  repo root). Served at `/yap/V2/` on GitHub Pages, beside V1 at `/yap/`.

## What V2 changes, and why

| V2 | V1 | Why |
| --- | --- | --- |
| **Two modes on one account: Ordering and Studio** (`lib/mode.ts`). Ordering: Home, Discover, Orders, Library, Inbox. Studio: Home, Find work, Jobs, Earnings, Profile, Inbox. The switch ("Switch to Studio" / "Switch to ordering") is the first item of the account menu (desktop: the avatar; phones: Me), with a count on the avatar and a dot on Me when the other side has something waiting | One merged app: "Ordered / Making" toggles on Work, both sides mixed in alerts, feed and lists | Most people are one side most of the time. The closest products (Fiverr's "Switch to selling", Airbnb's "Switch to hosting") use one account with two modes. It keeps the PM's "one account, like Instagram" and removes a toggle from every screen. The owner chose the merged app for V1; V2 is where the alternative can be compared |
| The mode is **in the URL**: `/studio/*` is Studio, the ordering pages are Ordering. An order (`/orders/[id]`) and a job (`/jobs/[id]`) are one URL for both sides and take the mode from your side of the deal. Messages, account and settings keep the mode the tab was last in | No modes | Links, notifications and Back always land in the right place, with no hidden state |
| **Home is a "Today" page**, per mode: what needs you (one row per action, most urgent first, from `lib/attention.ts`), what's in progress, one way to start something new, and one discovery rail | Home was a reels feed; the dashboards were under Work | A brand's first question is "what do I need to do and where is my video", not "show me reels". The feed was good at one job, judging presenters, so it moved there (next row) |
| **Watch** (`/discover/watch`): the full-screen vertical feed, creators' videos only, from Discover and from any video | Reels feed mixed videos, orders and campaigns | Watching is how you judge a presenter. Briefs are text and read better as lists (Find work) |
| **Orders in one place** (`/orders`): every order and job you placed, grouped by stage (needs you, in progress, open for pitches, campaigns, done) | Split across Work (commissions) and Orders (requests) | One list answers "where is everything I bought" |
| **New order starts with how you want to work**: pick a creator yourself, get pitches, or run a UGC campaign, with a plain comparison. Then a short flow with a live preview | A two-card type picker ("UGC campaign" / "Custom request"), then an 8-step wizard | Plain words for the choice; fewer steps; the product's saved context and learnings are attached and shown, not re-entered |
| **One job page** (`/jobs/[id]`): a header with the single next step, a stage panel that changes with the job's state, one timeline (messages, versions and events together) and a side rail (money, dates, brief, files) | A long page with a stage track, review area, Details card and Messages / Brief / Activity / Files tabs | One place to look; no tabs to hunt through |
| **Library** (`/library`): every approved video for your products, with usage rights, download (simulated) and "Order more like this" | No place for finished videos | After approval, the video is what the brand came for |
| **Pitch review as a shortlist board**: pitches as cards with the sample video, hook idea, price, days and fit; compare the shortlist side by side | A dense table-like list plus a compare mode | Pitches are judged by watching and reading the idea |
| **Studio**: Find work (open requests and campaigns ranked by fit), Jobs (active, pitches, done), Earnings (available, pending with dates, payouts), Profile (portfolio, packages, about, connected accounts, with a preview) | Spread over Discover, Work (Making), Pitches, Wallet, Profile hub and profile edit | The creator's whole business in one mode |
| **A landing page that explains** (`/`): headline, sample videos, the three ways to order with real prices, how payment is protected, a section for creators, FAQ. Sign-in is a simple centred card (same phone-and-code flow and saved accounts) | Bubble field with two buttons; the explanation lived on `/about` | A first-time visitor should understand what Yapp is without clicking |
| **Product-scale styling** (same brand): page titles 26–32px (was 34–52), 40px buttons (was 48), 20px card corners (was 28), lists as rows in one card, underline tabs, a full-width glass header, content 1200px wide | Marketing-scale type everywhere | App pages are tools; big type and big blocks made them feel louder than they are |

Kept from V1 on purpose: the domain model and store (`lib/`), seed data, simulation (auto replies,
auto deliveries, campaign tick), money rules, the logo rules, contact masking, the fixed clock,
saved accounts and phone-and-code sign-in, the static export, "one green action per view", "calm
first". Copy still says "Yapp"; the logo says "yapping". Since 11 Nov V2 is light only, like V1
(dark mode is paused by owner decision; the dark CSS stays dormant).

## Decisions already made in V2 (don't relitigate without the owner)

| Decision | Why |
| --- | --- |
| V2 is a separate app in `V2/` that reuses V1's `lib/` (copied, not imported) and V1's `components/ui` and `components/domain` (copied, restyled through CSS) | V1 must stay untouched and runnable; V2 must be free to change anything. Copying keeps both independent |
| V2's browser storage never collides with V1's (same origin on GitHub Pages): localStorage/sessionStorage keys start with `yapp2-` (not `yapp-`, which V1's reset deletes), cookies are `yapp2_account`, `yapp2_theme`, `yapp2_logged_out` | Two demos on one origin |
| Mode names: **Ordering** (`order`) and **Studio** (`studio`). The switch reads "Switch to Studio" / "Switch to ordering" and lives in the account menu, not the header (design fixes, 10 Nov: it sat on every screen and read as a location on phones). The Studio header shows a "Studio" tag beside the logo | "Studio" is what creator tools are called (YouTube Studio, TikTok Studio); "ordering" says what the other side does without assuming a company (Layla orders in her own name) |
| An account's starting mode: a personal account with a creator profile starts in Studio (Layla), everyone else in Ordering (Nour) (`defaultMode`) | Matches what each demo person mostly does |
| Opening Studio without a creator profile shows the setup on Studio Home (never a dead end) | The switch is always available |
| A non-owner opening an order sees it in Studio (as an opportunity); the owner sees it in Ordering | Looking at someone else's order is looking for work |
| Phone tab bars: Ordering **Home · Discover · Orders · Inbox · Me**; Studio **Home · Find work · Jobs · Inbox · Me**. Every tab shows its icon and its label in a fixed slot, so nothing moves between tabs. Inbox holds Messages and Alerts (on desktop too: the nav item is "Inbox" and there is no bell). Me (`/account`) holds the mode switch, the pages not in the bar, theme and demo tools | Five items; the money pages (Billing, Earnings) and Library are one tap from Home and Me |
| The reels feed is **Watch**, creator videos only | See the table above |

## Routes

```
Public:    /  /signin  /onboarding  /how-it-works  /for-creators  /legal  (404)
           /services  /services/{ugc-ads,native-posts,hook-lab,go-to-market}  /for/tech-teams
Ordering:  /home  /discover  /discover/watch  /creators/[handle]  /creators/[handle]/order
           /orders  /orders/new  /library  /products  /products/new  /products/[id]  /billing
Shared:    /orders/[id]  (owner: manage · others: opportunity, in Studio)
           /jobs/[id]    (both sides; mode = your side)
           /messages  /account  /settings  /productivity (side follows the mode)
Studio:    /studio  /studio/work  /studio/jobs  /studio/earnings  /studio/profile
```

Every URL comes from `lib/paths.ts`. The names the store and seed data use (`paths.commission`,
`paths.order`, `paths.creator`, `paths.pitches`, `paths.wallet`) are kept as aliases.

## Mode model (`lib/mode.ts`)

- `modeOfPath(pathname)`: `"studio"` under `/studio`, `"order"` on the ordering pages, `null` on
  shared pages.
- `<AppShell mode>`: shared pages that belong to one deal pass the viewer's side
  (`modeForSide(sideOf(s, item))`); other pages pass nothing.
- `useMode()` resolves explicit → route → remembered (sessionStorage `yapp2-mode`, per account) →
  `defaultMode(account)`.
- `lib/attention.ts`: `attention(s, side)` lists what needs the account on one side (both Home pages
  use it); `urgentCount(s, side)` is the count on the avatar (and the dot on Me) for the other mode.

## Architecture

```
V2/
  app/                  routes (above); each segment has a layout.tsx with metadata (and
                        generateStaticParams for dynamic ones, from lib/static-params.ts)
  components/
    ui/                 primitives from V1 + V2 additions: list.tsx (List, Row), tabs.tsx (Tabs),
                        progress.tsx (ProgressBar, KeyValues)
    domain/             shared marketplace pieces from V1 (VideoThumb, VideoPlayer, CreatorCard…)
    shell/              AppShell, PublicShell, SiteHeader, TabBar, account-menu (AccountMenuBody,
                        AccountSheet, useSwitchMode), notifications-sheet, nav, site-footer
    account/            creator setup sheet + social connect (from V1)
    <feature>/          one folder per area (see the build map below)
  lib/                  V1's lib with: paths.ts (V2 routes), mode.ts, attention.ts, storage keys
  public/               brand files (byte-identical to the brand package), icons
  scripts/qa/           V1's driver (cdp.mjs) and sweep, pointed at V2's cookies; V2 flows in flows/
```

Data flow is V1's: seed → store (localStorage `yapp2-demo`) → `useDemo()` → selectors; mutate only
through `actions.*`. Read V1's CLAUDE.md "Architecture" for the store, selectors and simulation.

## Run it

```bash
npm install            # at the repo root, once (V2 has no node_modules of its own)
cd V2
npm run dev            # http://localhost:3200 (V1 uses 3000)
npm run typecheck
npm run lint
npm run build
NEXT_PUBLIC_BASE_PATH=/yap/V2 npm run build:pages     # static export → V2/out
```

Only one `next dev` per project folder: if V2's dev server is already running on 3200, reuse it.

## Conventions

V1's conventions all apply (DESIGN.md has the V2 versions). In short: one green action per view;
status = icon + label with the five chip looks; colours only via tokens; signed-in pages in
`<AppShell>`, public pages in `<PublicShell>`; links only through `lib/paths.ts`; derive the
viewer's side with `sideOf`; no self-dealing; dynamic routes use `useParams()` and show a skeleton
while `!useHydrated()`, a not-found state after; `useSearchParams()` inside `<Suspense>`; never
`new Date()` in render; copy plain, warm, specific, sentence case, Canadian spelling with "-ize",
no emoji, no exclamation marks; lint is strict (React Compiler rules).

## Decisions made per area (10 Nov 2026 build)

Each area was built by one agent (the map is DESIGN.md's appendix). What they decided, and why.

**Shell and modes (lead).** Full-width glass header aligned to the 1200px column; the active nav item
is a quiet fill. The mode switch is the first tile of the account menu; a count of tier 0–1 items
waiting on the other side shows on the avatar (desktop) and as a dot on Me (phones). Studio shows a
"Studio" tag beside the logo. The account menu (`AccountMenuBody`) is one component for the
desktop avatar sheet and the phone's Me page; demo tools are grouped in one quiet card.

**Ordering Home, Orders, Library, Products, Billing** (`components/brand-home`, `library`, `products`, `billing`)
- Home never says a fact twice: a delivery to review appears only in Needs you, and In progress
  rows don't repeat counts already in Needs you. The first Needs-you row holds the page's only
  green; on phones only that row shows its button.
- Nothing waiting: Needs you disappears, the greeting says "You're all caught up" and the green
  moves to starting an order. A brand-new account sees one block (Start an order) and the payment
  protection note.
- A custom request that hired someone appears only as its job; a campaign is one row with a
  progress bar ("2 of 10 approved · 5 in work").
- Orders search runs inside the current tab and says where else matches are ("Found in In
  progress (1)"). "New order" on the page shows on phones only (the desktop header has it).
- Library usage rights are plain words: organic use always; paid ads with an end date counted from
  approval; campaign videos "Posted by @handle on TikTok" with the keep-up date. "Order more like
  this" reorders a job with its brief, or opens a direct order from a campaign video.
- Product page leads with Learnings (add and remove in place, with Undo); the rest of the product
  context sits in a side column; editing is a sheet that asks before discarding. `/products/new`
  is one question per step with a live preview (`?return=` supported).
- Billing: one light big number for money held, receipts as rows with itemized sheets, a green
  "Review delivery" only when releasing money is the next step. Billing details are stored under
  `yapp2-billing-details`.

**New order and direct order** (`components/new-order`, `direct-order`)
- The chooser's three cards each carry three facts that differ (how the price is set, how fast, who posts it), from the seed and constants; one green Continue names
  where it goes ("Browse creators", "Describe the video", "Set up the campaign"). `?creator=` or
  `?again=` turns the first card into "Order from Layla (again)".
- Focused-flow frame: the question is the page title; thin step segments you can jump back
  through; a glass bottom bar with Back and the one green Continue naming the next step; errors
  only after Continue, with focus moved to the first problem.
- Get pitches (4 steps): a product's learnings are attached by default, can be unticked one by
  one, and go into the brief's must-include list (drafts round-trip them without duplicates).
  Budget is asked per video (per pack for hook packs) and stored as the total, because pitch
  prices are totals; "Creators usually charge $X–$Y" comes from seeded packages. The desktop
  preview shows what creators see plus three real videos in that format by matching creators.
- Campaign (4 steps): each tier shows how many creators qualify on that platform; tiers without a
  price are disabled; the rules step lists exactly what creators agree to; "Hold $440 and publish".
- Direct order: one-page checkout, essentials first with "More details" (opens itself on an
  error), goal suggested from the product, sticky summary rail on desktop and a total + button bar
  on phones. A personal buyer with no products isn't forced to create one.

**Order page, owner** (`components/order-owner`)
- The board's next step is the header's green: Hire when one pitch is shortlisted, Compare when
  two or more are; card Hire buttons are outline. On phones it sits in a glass bar.
- "New" means not opened yet; anything opened, starred or declined during a visit stays in its tab
  until you leave, so cards don't jump. Compare tags "Lowest" / "Fastest" only when one pitch is
  strictly best.
- Campaign review is a queue: one review copy in full (Approve is the only green), the rest as "Up
  next" rows; each decision moves on by itself. Campaign money appears once, in the rail.
- Hiring goes straight to the job with a toast (V1 showed a celebration sheet).

**Job page** (`components/job`)
- One next-step descriptor, shown in the header on desktop and in a glass bar above the tab bar on
  phones. Once the header button scrolls away on desktop, a slim sticky strip keeps it in reach.
- Steps that are forms (review, learnings, private rating, post link) keep their button in the
  form on desktop; the phone bar submits the same form, so only one green ever shows. Waiting
  states get a quiet "Message {name}" that focuses the composer.
- Approve stays the green while reviewing, and "Request changes (n)" is the outline button beside
  it wherever the next step shows (header, sticky strip, phone bar); the revisions left sit under
  the comments (V1 swapped the green to the changes button, which was unpredictable).
- A finished job walks through review → save what you learned (suggested from the notes) → order
  again + Library, on the page; the learnings step only appears right after a review on that visit.
- One timeline merges messages, events and versions (system messages that repeat an event are
  dropped; each version is a card that loads into the stage panel). The rail leaves out what the
  stage panel already says.

**Discover, Watch, creator profile** (`components/discover`, `watch`, `creator-profile`)
- Saved creators are a tab of Discover, with "Worked with before" rows and **Order again** (repeat
  orders are a success metric). Tabs show only when signed in.
- "Best for {product}" is one chip: ranks creators by V1's `fit` against the formats and languages
  of that product's earlier orders, with a bonus for creators who already made a video for it.
- Hover preview only with a mouse or keyboard focus, after 420ms, one card at a time, never on
  touch or with reduced motion. No fake loading delay on filter changes.
- Profile packages start on Basic ("From $140"), Standard marked "Most popular"; booking card in a
  sticky rail on desktop, the only green in a sticky bar on phones.
- Watch is `fullscreen focus` (no tab bar): a viewer you close. Phones: controls follow the reel's
  tone, swipe up for next, **swipe left opens the creator's profile**; desktop: 9:16 column with
  ↑/↓ and a side panel. The URL follows the video in view (`?video=`), so Back and reload return to
  it. A portfolio tile opens Watch limited to that creator.

**Studio Home, Find work, opportunities** (`components/studio-home`, `find-work`, `opportunity`, `account`)
- Each job appears once on Studio Home: a version due within three days (or late) is in Needs
  you, later ones in In progress.
- Fit reasons are written to the creator ("You speak English", "Your packages fit their budget").
- Find work's best-fit order: unanswered invites first; things you already pitched on or joined
  sink to the bottom; campaigns you can't take sink but stay listed with the reason in words;
  campaigns you were removed from, and full ones, are left out unless you hold a slot. Without a
  creator profile it defaults to newest.
- The pitch composer is one large sheet (V1 had two steps) with a live preview of the brand's pitch
  card; the hook idea is the pitch's headline; "Send pitch · $350" is pinned in the footer.
- Taking a slot needs one tick (agree to the tag and the paid-partnership label); the sheet gives
  the upload deadline as a date. A campaign's fix happens in place: no profile → "Set up and take a
  slot" (continues into connecting the account); no account → "Connect your TikTok"; below the
  tier, lost the race or removed before → a plain explanation, never a green button.
- Questions to a brand open a real conversation (`startThread` gained an optional `businessId`).

**Studio Jobs, Earnings, Profile** (`components/studio-jobs`, `earnings`, `studio-profile`)
- A delivered job reads "In review" on the creator side; campaign slots read "Post due" and "Pay
  pending". No green on Jobs while the list itself is the next step.
- Withdrawing a pitch is allowed while shortlisted too (V1 blocked it): a creator who can't do the
  work should be able to step back.
- Earnings: one green Withdraw at the top; pending rows give the release date or say what's
  missing; each total appears once. V1's six-month bar chart was dropped (the seed made the bars
  identical).
- Profile: one page of sections (`#about`, `#portfolio`, `#packages`, `#addons`, `#accounts`,
  `#equipment`, `#availability`). Profile, packages, add-ons and equipment are one draft saved from
  a floating "Unsaved changes" bar (the only green); portfolio, connected accounts and availability
  save as you go. Only Basic is a required package (V1 required all three, so a new creator
  couldn't save). "No file handy? Use a sample file" makes the simulated upload demoable.

**Landing, sign-in, onboarding, marketing, inbox, account, settings** (`components/landing`, `auth`, `marketing`, `inbox`, `settings`, `account-page`)
- Landing: signed-in visitors are hidden before paint and sent to their home. The hero video wall
  drifts slowly on desktop (pauses on hover, still with reduced motion) and is a swipeable row on
  phones. "How it works" shows a real seed delivery with its timestamped notes. Every number comes
  from the data or constants.
- Sign-in: one centred card: saved accounts, then phone and code, then Apple / Google / TikTok /
  Instagram. `?new=1` leads into onboarding with saved accounts below as "Already on Yapp?".
  `?intent` picks the mode's home; `next` always wins.
- Onboarding: one question per step (V1's product step split into "what it is" and "who it's for",
  its payout step into prices and payout); the step count is hidden until the first choice picks
  the path.
- Inbox: one card on desktop (list 360px + conversation); on phones an open conversation fills the
  screen and hides the tab bar. Ordering/Studio filter chips and "You ordered / You're making"
  labels appear only when an account has conversations on both sides (no seed account does).
- Settings: one page with an anchored nav; "Sign-in and security" has "Change number" (code
  123456) instead of V1's "Change password". Notifications open on the current mode's side.
- `app/styles/landing.css` was rewritten: V1's bubble-field rules (`.y-bubble`) had hidden V2's
  count bubbles everywhere.

## Round 3 stage 2 port (11 Nov 2026)

After V2 was built, V1 built round 3 stage 2: the spec's sender ruled on every open point in
`feedback_docs_2/YAPPS_ROUND_3_ANSWERS.md` and V1 implemented the rulings (V1 CLAUDE.md, decisions
table and status). The owner then asked to look at the base's changes and bring over what made
sense. The rule used: **V2 adopts every product, money, legal, naming and brand ruling, and keeps
its own information architecture and layouts.**

**Adopted (firm in V2 now):**
- **Money:** Yapp keeps 20% of every transaction, from the creator's side. The brand pays the
  listed price, nothing on top; a creator sees their net beside every price ("$140 · you earn
  $112"). The brand is told what the creator receives where V1 tells it (the approval summary shows
  the three amounts, answers item 5: "You pay $300 · Layla receives $240 · Yapp fee (20%) $60"; the
  campaign pay rule; receipts), never as a fee added to a total. Only lib computes money
  (`priceBreakdown`, `creatorNet`, `priceWithNet`, `commissionTotals`, `campaignMoney`).
- **Usage options** (four, chosen per order, included in the price), raw footage included, two
  revisions included; no rights or raw-footage add-ons.
- **UGC campaigns:** the brand sets the price per Yapp with a guidance range (`priceGuidance`);
  tiers only decide who can pick; one or more platforms, each creator picks one; brand handles per
  platform saved in Settings → Brand accounts; the price can only be raised after posting; the tier
  can change once with no money moving.
- **Custom orders:** job type video or **ad copy writing** (text and document deliveries, general
  comments, no posting); a brand-set delivery deadline; a 14-day closing date; brief attachments;
  a hook line; $50 minimum budget.
- **Two-way comments** on every delivered version (replies, resolve, re-open by the brand, edit and
  delete by the author, unread markers, deep links with `?comment=`), and **Request changes** with
  the comments you tick.
- **Brands shown by five reliability figures**, never stars. **Order drafts** per kind.
- **Productivity** (`/productivity`): one page whose side follows the mode, built on
  `lib/productivity.ts`; reached from the account menu, Ordering Home's figures card and Earnings.
- **Services** (`/services`, four service pages, `/for/tech-teams`) with V1's draft copy, linked from
  the footer and the signed-out nav.
- **Names:** "Custom order", "UGC campaign", "Pick now" (with the count left), "Productivity",
  "Request changes".
- **Brand rulings:** light only (dark mode paused); no blob characters in confirmations or empty
  states; the answers' chip colours; one "Log out" that asks first (a saved account is removed
  only on the sign-in screen).

**Kept as V2's own (V1's answers to these are V1's design):** the two modes; Today homes; Orders
and Library; one job page with one timeline (V1 has tabs); V2's four-step new-order flows (V1 has
one six-step wizard); V2's landing page (V1: bubbles); Discover as a browsing page, not the desktop
home; Watch on desktop as a viewer opened from a video (answers item 59 makes V1's home feed
phone-only); V2's five-tab phone bars per mode (V1: six tabs); no More page or Work sidebar.

**How it was done.** The lead copied V1's new `lib/` (types, store, selectors, taxonomy, format,
pricing, comments, productivity, files, campaigns, seed data) over V2's and re-applied V2's own
pieces (`paths.ts`, `mode.ts`, `attention.ts`, `yapp2-` keys, `startThread`'s `businessId`), took
V1's new `components/domain/*` and its character-free `EmptyState` and `Celebrate`, ported the
"needs you" changes into `lib/attention.ts` (net amounts, ad-copy wording, unread comments for the
brand, replies for the creator), updated the shell, and added placeholder routes. **V2's `lib/` is
synced with V1 at commit `9e183d3`** (use it as the base of the next three-way merge). Eight agents (the
same areas as the first build) then ported their pages. Store version 9 discards V2 demo state
saved before the port.

**Decisions per area in the port:**
- *Shell (lead):* switching demo account starts the new account in its own default mode.
- *Ordering Home, Orders, Library, Billing, Productivity:* Billing shows listed prices only; receipt
  sheets say what the creator received after Yapp's 20%. Library has All / Videos / Copy: ad copy
  appears as copy cards with "Copy text"; paid-ads end dates count from approval. Productivity's
  side is `?as=` if the account has it, otherwise the tab's mode (and it sets the remembered mode so
  the header agrees). Home gained a quiet "Last 30 days" figures card under Start an order, still
  five blocks.
- *New order and direct order:* the second chooser card is "Custom order" ("Write the brief"). Ad
  copy asks for pieces and placements, leaves out the product's filming dos and earlier learnings
  while unedited, and shows no usual price (no creator prices ad copy yet). A campaign's price
  starts at the guidance low end; a price under the range shows "Use $115" and never blocks.
  Campaigns autosave as drafts too.
- *Order owner:* the delivery deadline and closing date appear once, in the header; pitch cards
  don't repeat days. "Raise the price" (up only, top-up held for unpicked slots) and "Change who can
  pick" (once, no money) are separate. Each slot shows "Posts on {platform} · tags {handle}";
  consecutive open slots collapse into one row. On ad-copy orders a pitch's angle is its "Sample line".
- *Job page:* comments sit beside the player (below it on phones); on finished jobs they fold under
  the review and learnings steps. The brand's own open comments start ticked in Request changes.
  During changes the creator sees "What {brand} asked you to change" at the top with "Mark done".
- *Discover:* usage rights and raw footage are stated once in the booking card, the four options
  behind a disclosure; a creator sees their net on their own profile, tile and Watch; a Platform
  filter (ad placements excluded); "Best for" counts each order once and leaves out ad copy.
- *Studio Home and Find work:* Find work has a Job type filter (`?job=`); campaign rows carry a green
  "Pick now · 3 of 10 left" that opens the pick sheet in place; the pick sheet asks which platform
  when you qualify on several. Ad-copy pitches can add a written sample (kept at the end of the
  pitch message). Fixed: connecting an account during setup on Studio Home now saves.
- *Studio Jobs, Earnings, Profile:* every amount is price plus "you earn"; earnings rows open a
  sheet with the split (price, Yapp's 20%, what you got); withdrawals accept cents (nets can carry
  cents); packages and add-ons show "you earn" as you type.
- *Public pages, Services, Settings, Inbox:* How it works has a calculator with no fee or rights
  add-ons and a per-tier guidance range; the Services index lists each service with the kind of
  order it runs on; Settings has Brand accounts (`#brand`) and no Appearance; comment lines in
  Messages link to the job at that version; removing a saved account on sign-in has Undo.

## Design fixes (10 Nov 2026)

The owner asked for a critique of V2's design, then for a plan to address all of it, and approved
the plan (`~/.claude/plans/make-a-plan-to-polymorphic-hellman.md` on the owner's machine). The
critique was written from screenshots of every main screen (signed out, Nour, Layla; 1440 and 390
wide). What changed, and the decisions behind it. Everything is inside `V2/`.

**Two earlier decisions changed, with the owner's sign-off:**
- **The mode switch left the header.** It is the first tile of the account menu (the desktop
  avatar sheet and the phone's Me page). Why: V2's own argument is that most people are one side
  most of the time, yet the switch sat on every screen, and on phones "⇆ Studio" read as where you
  are. `urgentCount` for the other side shows on the avatar and as a dot on the Me tab.
- **"Moving" status chips are grey in V2** (`[data-tone-badge="active"]` in `app/globals.css`
  matches the neutral chip). Why: lists read as mostly green and competed with the one green
  action. This deviates from round 3 answers item 51 and is **for the sender to confirm**; the
  `--y-active-*` tokens are untouched, so restoring the old rule undoes it. Done, needs-you and
  negative chips keep the ruled colours.

**Decided and not built:** real sample clips. The generated scenes stay (owner), so "judge a
creator by watching" cannot be assessed in a design review.

**Shell (`components/shell`, `app/globals.css`).**
- `AppShell` props: `focus` (flows: no tab bar and a minimal header, logo plus avatar on desktop,
  logo only on phones), `detail` (one thing's own page: no tab bar, normal header, phone padding
  for exactly one action bar), `back` (`{ href, label }`: the phone header shows it in place of
  the logo, and any in-page link with class `y-backlink` hides below 1024px). `detail` is used by
  `/jobs/[id]`, `/orders/[id]`, `/creators/[handle]` (through `BrowseShell`'s passthrough), an
  open conversation and Watch.
- **One bottom bar per phone screen.** A page with an action bar has no tab bar. Every bar reads
  `bottom: var(--y-bar-bottom)` (declared on `.yapp`; `.y-no-tabbar`, set by `focus` and `detail`,
  lowers it to the screen edge). A new bar sits inside the shell's DOM and needs no spacer.
- Phone tab bar: five fixed slots, icon over a label that is always visible (`--y-bar-h` 60px).
- Desktop nav: "Inbox" (was "Messages") with one count for unread threads plus unread alerts; the
  bell and its sheet are gone (`NotificationList` stays for the Inbox's Alerts tab); Studio gains
  **Profile**.
- `dueSoon()` moved into `lib/attention.ts`, so `urgentCount` and Studio Home's "n things need you
  today" agree.

**Job page (`components/job`).**
- The brand's review shows both decisions together: outline "Request changes (n)" beside the green
  "Approve and release $X" (`secondary` on `nextAction()`); the phone bar uses short labels
  ("Request changes", "Approve · $300") with the full ones as aria-labels.
- A vertical player stays in view from 768px (sticky column, width capped by the viewport height
  so the controls never fall off a short screen; at most 45% of the panel).
- The comment box (`CommentComposer`) renders once in the review's right column: pinned to the
  bottom from 1024px, directly under the player on phones. On a phone a tap on a time chip brings
  the player into view.
- The timeline shows the last five items; older ones sit behind "Show n earlier updates".

**Homes and Inbox (`components/brand-home`, `studio-home`, `inbox`).**
- Needs you rows lead with the thing: a 40px thumbnail of the delivered video, or an icon tile
  (ad copy, pitches, shortlist, review copies, draft). Review copies say "Review".
- In progress shows three rows, then "All orders n".
- The right column leads with money: `MoneyCard` ("Held for work in progress", then "Last 30
  days"; `figures-link.tsx` is gone). `StartOrder` is the full three-row card only when nothing is
  waiting or the account is new; otherwise one row into the chooser.
- Both homes say "Show n more" / "Show fewer" (`ShowMore` in `needs-you.tsx`).
- The phone-only "New order" pill on `/orders` is gone (the header "+" is the one entry).
- Inbox rows and the conversation header lead with the order's title (`threadAbout()` in
  `inbox/thread-meta.ts`), so two conversations with one person are told apart.
- "Read pitches" on Home opens the board's New tab (`?tab=new`), and a new-pitch alert opens that
  pitch (`?pitch=`). The second is one line in `lib/store.ts`: **a V2-only change to keep in the
  next merge with V1's `lib/`**.

**Order flows and Discover (`components/new-order`, `discover`, `landing`).**
- Discover uses the 1200px `Page` like every other page; `Page`'s `full` width is removed.
- The flow bar spans the page: Back at the left edge, Continue at the right. Continue is never
  dimmed; a click with something missing shows the errors, and the "To continue: …" hint shows on
  phones too (red when it names what is missing).
- The chooser's cards show three facts each, in the same order (price, speed, who posts).
- On phones Discover hides its description and the unfiltered count (kept for screen readers).
- "A Yapp is one creator's video" is said once on the chooser's campaign card, the landing's
  campaign card and Find work's description. The word itself is unchanged.

**Order owner and Find work (`components/order-owner`, `find-work`).**
- The pitch board opens on Shortlist when one exists and nobody is hired (decided once per
  visit); `?tab=` and `?pitch=` choose the tab explicitly.
- A slot's "Posts on {platform} · tags {handle}" line shows only on campaigns with several
  platforms.
- Find work rows carry no fit percentage: the three best custom orders get "Top match"
  (`WorkItem.topMatch`), other rows show what is missing, if anything. The hide button shows on
  hover or keyboard focus with a mouse and not at all on touch (the opportunity page's ⋯ menu has
  "Not interested"). Below 640px the filters are one "Filters" button and a sheet.

**Left as found, worth knowing:** on the job page at 1440 the pinned comment box covers the end
of a long first comment until you scroll; on a phone its text field sits behind the action bar
until you scroll a little; a 40px video thumbnail on Home reads as a small scene, not obviously a
video (a play glyph needs a `VideoThumb` change); on a touch tablet with "Show hidden" on, hidden
rows' prices sit about 34px left of the others.

## QA

```bash
cd V2
npm run build && npx next start -p 3201                       # or reuse `npm run dev` on 3200
scripts/qa/sweep.sh http://localhost:3201                     # every route × 3 sessions + 404s
BASE_URL=http://localhost:3201 node scripts/qa/cdp.mjs scripts/qa/flows/job.json

# Exactly as GitHub Pages serves it (static export under /yap/V2):
NEXT_PUBLIC_BASE_PATH=/yap/V2 npm run build:pages
mkdir -p /tmp/site/yap && ln -sfn "$PWD/out" /tmp/site/yap/V2 && python3 -m http.server -d /tmp/site 4100 &
scripts/qa/sweep.sh http://localhost:4100/yap/V2
for f in scripts/qa/flows/*.json; do BASE_URL=http://localhost:4100/yap/V2 node scripts/qa/cdp.mjs $f | tail -1; done
```

The driver and sweep are V1's (see V1's CLAUDE.md "QA tooling"), pointed at V2's cookies; the
sweep runs signed out, as Nour and as Layla (light only). Flows in `scripts/qa/flows/`, one set per
area (desktop and `-mobile` at 390px): `brand-home`, `productivity`, `ordering-flows`,
`order-owner`, `job` (+`job-states`: ad copy for both sides, disputes, cancellations), `discover`,
`studio-work`, `studio-business`, `public-account` (+`public-account-services`), and
`route-smoke-nour` / `route-smoke-layla` (61 routes each in a real browser). Flows written for both
hosts: URL checks tolerate the static export's trailing slash, and "not found" is tested with ids
that are pre-rendered but not in the store (`/creators/nourhaddad` before Nour sets up a profile,
`/404`), because a static host has no page for an unknown id. Some flows patch localStorage for a
run where the seed has no suitable record (an open ad-copy order or a two-platform campaign of
Nour's, an approved ad copy). As in V1, a flow occasionally fails on its very first page load in a
cold browser or under CPU load; rerun it before debugging.

## Status (10 Nov 2026, after the design fixes)

**The design fixes above are built and verified.** `typecheck` and `lint` are clean; `build`
passes; `build:pages` exports 411 pages (407 routes). Served under `/yap/V2`, the sweep passes
(67 routes × 3 sessions + 404s) and all 21 flows pass against the export (`discover`,
`discover-mobile` and `public-account` on their second run: the first-page-load and Watch-swipe
flakes). All 21 also pass against `next start`. Nine flows were updated for the deliberate
changes (the header switch, Home, Orders, the job page's buttons, the pitch board's tab, the
single-platform slot line). The lead re-took the critique's screenshots (signed out, Nour, Layla;
1440×900 and 390×844) and read them against each finding.

**Not verified in this round:** a real phone (the glass bars, safe areas and the sticky comment
box were only seen in headless Chrome, which draws no backdrop blur), Safari, a touch tablet, a
screen reader. Nothing was committed: the owner commits.

**Waiting on someone:** the sender, to confirm grey "moving" chips (answers item 51).

Everything below describes the state before the design fixes; where the two differ, the "Design
fixes" section wins.

## Status before the design fixes (after the round 3 stage 2 port)

**Built and verified.** Every route in the table above plus `/productivity`, `/services` (and four
service pages) and `/for/tech-teams`, both modes, desktop and phones, light only, on the stage 2
rules. `typecheck` and `lint` are clean (V2 and V1); `build:pages` exports 407 pages; served under
`/yap/V2` the sweep passes (67 routes × 3 sessions + 404s) and all 24 flows pass against the export
(four needed a fix or a rerun on the export: a trailing-slash selector, the Watch swipe flake, and
two job flows that asserted the brand never sees "Yapp fee", which the answers file's approval
summary contradicts). The temporary port shims are gone. Nothing outside `V2/` changed in the port.

**Not verified:** a real phone or GPU (safe areas, Back gesture, glass blur), RTL, the GitHub
Actions run itself (the V2 build step was tested locally the same way).

**Known gaps (deliberate or inherited):**
- Everything V1 lists as simulated still is (V1 CLAUDE.md "Known gaps"): no backend, uploads,
  payments, social APIs or post verification; the clock never moves, so nothing auto-approves.
- On GitHub Pages an unknown URL under `/yap/V2/` shows **V1's** 404 page (Pages serves only the
  site's root `404.html`). V2's own 404 renders on a server and at `/yap/V2/404/`.
- Inherited from V1's lib and seed: `creatorEarnings().lifetime` rises by an estimate (not the
  slot's net) when a campaign slot is approved; seed campaign `r-251` is posted at 11:00 while the
  clock is 10:00; review copies reuse the creator's first portfolio video; no seeded ad copy is
  approved; no seeded open ad-copy order or two-platform campaign belongs to Nour; the paid extra
  revision is copy only; business notes are visible to the creator at once.
- Shared components from V1: `PriceSummary` always says "Raw footage included" (wrong for ad copy;
  the order owner's hire sheet prints its own line); `BriefSummary` leaves out the hook line and
  attachments (areas add them locally).
- Copy shown to a creator in the job timeline and Messages is the store's text, which names Yapp's
  20% to both sides (as V1 does).
- Hook Lab's button opens a custom order without the hook-pack format preselected (`newOrder` takes
  no format). On older orders without a brand deadline the pitch composer still asks for days. A
  direct order repeated from an ad-copy job falls back to the creator's first video format.
  Campaigns have no server-side draft, only the form autosave. Onboarding's prices step says "You
  earn" twice. "Make videos" onboarding continues as Layla and saves nothing (as V1).
- Only campaign review copies are watermarked before approval (V1 also watermarks custom-order
  videos). Cancelled or declined jobs don't show their comments.
- `V2/.qa/profiles/` can hold leftover Chrome profiles from interrupted runs; it is safe to empty.

**Next steps (owner to prioritise):** compare V1 and V2 with the owner, now that both run on the
same rules and data; decide which of V2's structural changes (two modes, Today homes, Library, one
job page, the four-step order flows, the landing) should carry into the main version. When V1
changes a rule again, port it the same way: three-way merge `lib/` (base = the V1 commit V2 last
took, ours = `V2/lib`, theirs = V1's), keep V2's own files, then fix each area.
