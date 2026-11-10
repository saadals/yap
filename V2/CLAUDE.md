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
  the legal pack's rules and numbers, invented names, contact masking, fixed demo clock, no
  backend). Those are firm in V2 too.
- Different information architecture, flows and UI wherever we judged V1 could be easier.
- A separate Next.js app in `V2/` with no `node_modules` of its own (packages resolve from the
  repo root). Served at `/yap/V2/` on GitHub Pages, beside V1 at `/yap/`.

## What V2 changes, and why

| V2 | V1 | Why |
| --- | --- | --- |
| **Two modes on one account: Ordering and Studio** (`lib/mode.ts`). Ordering: Home, Discover, Orders, Library, Messages. Studio: Home, Find work, Jobs, Earnings, Messages. One tap switches ("Switch to Studio" / "Switch to ordering" in the header, with a count when the other side has something waiting) | One merged app: "Ordered / Making" toggles on Work, both sides mixed in alerts, feed and lists | Most people are one side most of the time. The closest products (Fiverr's "Switch to selling", Airbnb's "Switch to hosting") use one account with two modes. It keeps the PM's "one account, like Instagram" and removes a toggle from every screen. The owner chose the merged app for V1; V2 is where the alternative can be compared |
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
saved accounts and phone-and-code sign-in, dark mode, the static export, "one green action per
view", "calm first". Copy still says "Yapp"; the logo says "yapping".

## Decisions already made in V2 (don't relitigate without the owner)

| Decision | Why |
| --- | --- |
| V2 is a separate app in `V2/` that reuses V1's `lib/` (copied, not imported) and V1's `components/ui` and `components/domain` (copied, restyled through CSS) | V1 must stay untouched and runnable; V2 must be free to change anything. Copying keeps both independent |
| V2's browser storage never collides with V1's (same origin on GitHub Pages): localStorage/sessionStorage keys start with `yapp2-` (not `yapp-`, which V1's reset deletes), cookies are `yapp2_account`, `yapp2_theme`, `yapp2_logged_out` | Two demos on one origin |
| Mode names: **Ordering** (`order`) and **Studio** (`studio`). Header switch: "Switch to Studio" / "Switch to ordering". The Studio header shows a "Studio" tag beside the logo | "Studio" is what creator tools are called (YouTube Studio, TikTok Studio); "ordering" says what the other side does without assuming a company (Layla orders in her own name) |
| An account's starting mode: a personal account with a creator profile starts in Studio (Layla), everyone else in Ordering (Nour) (`defaultMode`) | Matches what each demo person mostly does |
| Opening Studio without a creator profile shows the setup on Studio Home (never a dead end) | The switch is always available |
| A non-owner opening an order sees it in Studio (as an opportunity); the owner sees it in Ordering | Looking at someone else's order is looking for work |
| Phone tab bars: Ordering **Home · Discover · Orders · Inbox · Me**; Studio **Home · Find work · Jobs · Inbox · Me**. Inbox holds Messages and Alerts. Me (`/account`) holds the mode switch, the pages not in the bar, theme and demo tools | Five items; the money pages (Billing, Earnings) and Library are one tap from Home and Me |
| The reels feed is **Watch**, creator videos only | See the table above |

## Routes

```
Public:    /  /signin  /onboarding  /how-it-works  /for-creators  /legal  (404)
Ordering:  /home  /discover  /discover/watch  /creators/[handle]  /creators/[handle]/order
           /orders  /orders/new  /library  /products  /products/new  /products/[id]  /billing
Shared:    /orders/[id]  (owner: manage · others: opportunity, in Studio)
           /jobs/[id]    (both sides; mode = your side)
           /messages  /account  /settings
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
  use it); `urgentCount(s, side)` is the mode switch's count.

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
is a quiet fill. The mode switch sits in the header (desktop: "Switch to Studio", phones: the
target mode's name) with a count of tier 0–1 items waiting on the other side. Studio shows a
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
- The chooser's three cards each carry a real number from the seed; one green Continue names
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
- Approve stays the green while reviewing; "Ask for changes (n)" sits under the notes with the
  revisions left (V1 swapped the green to the changes button, which was unpredictable).
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

The driver and sweep are V1's (see V1's CLAUDE.md "QA tooling"), pointed at V2's cookies. Flows in
`scripts/qa/flows/`, one set per area (desktop, `-mobile` at 390px, some `-dark`):
`brand-home`, `ordering-flows`, `order-owner`, `job` (+`job-dark`), `discover`, `studio-work`,
`studio-business`, `public-account` (+`-dark`), and `route-smoke-nour` / `route-smoke-layla`
(50 routes each in a real browser). Flows written for both hosts: URL checks tolerate the static
export's trailing slash, and "not found" is tested with ids that are pre-rendered but not in the
store (`/creators/nourhaddad` before Nour sets up a profile, `/404`), because a static host has no
page for an unknown id. As in V1, a flow occasionally fails on its very first page load in a cold
browser or under CPU load; rerun it before debugging.

## Status (10 Nov 2026, end of the V2 build)

**Built and verified.** Every route in the table above, both modes, light and dark, desktop and
phones. `typecheck`, `lint`, `build` and `build:pages` are clean; the static export (394 pages) was
served under `/yap/V2`: `qa:sweep` passes (56 routes × 3 sessions + 404s), both route smokes pass,
and all 22 flows pass against it (two needed a rerun for the first-page-load flake). V1 still
type-checks and lints; outside `V2/` only the root `tsconfig.json` and `eslint.config.mjs`
(exclude `V2`), the deploy workflow and the root CLAUDE.md changed.

**Not verified:** a real phone or GPU (safe areas, Back gesture, glass blur), RTL, the GitHub
Actions run itself (the V2 build step was tested locally the same way: `npm run build:pages` in
`V2/` with the root install).

**Known gaps (deliberate or inherited):**
- Everything V1 lists as simulated still is (V1 CLAUDE.md "Known gaps"): no backend, uploads,
  payments, social APIs or post verification; the clock never moves, so nothing auto-approves.
- On GitHub Pages an unknown URL under `/yap/V2/` shows **V1's** 404 page (Pages serves only the
  site's root `404.html`). V2's own 404 renders on a server and at `/yap/V2/404/`.
- Campaigns have no drafts; review copies reuse the creator's first portfolio video (V1 seed gap);
  the shared `BriefSummary` says "5 videos" for a hook pack; Layla has no seeded campaign slot, so
  her pending pay is empty until she takes one; business notes are visible to the creator at once
  (V1 store limit); a taken-down post is reachable only through the store; "Get help" is a toast.
- In Get pitches, a product typed into the inline form must be saved ("Save product") before
  Continue. "Make videos" onboarding continues as Layla and saves nothing (as V1).
- `V2/.qa/profiles/` can hold leftover Chrome profiles from interrupted runs (175 MB at the end of
  the build); it is safe to empty.

**Open question for the owner.** `feedback_docs_2/YAPPS_ROUND_3_ANSWERS.md` appeared during this
build (10 Nov). It settles round 3 and changes rules both versions follow today: a 20% fee taken
from the creator (instead of 10% charged to the brand), usage rights and raw footage included,
dark mode paused, "Pick now" and "Custom order" as names, and navigation rules (bubble landing,
feed on phones only) that V2 deliberately redesigned. V2 was built on the rules in V1's CLAUDE.md;
nothing from that file has been applied to either version yet.

**Next steps (owner to prioritise):** compare V1 and V2 with the owner; decide which of V2's
structural changes (two modes, Today homes, Library, one job page, the landing) should carry into
the main version; then apply the round 3 answers to whichever version goes forward.
