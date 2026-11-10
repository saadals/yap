# Yapp — project guide for agents

Read this first. It explains what this repo is, why it looks the way it does, and how to work in
it without asking the owner (Saad) for context again. Design and component rules live in
[DESIGN.md](DESIGN.md); the original product brief is [product-writeup.txt](product-writeup.txt).

## V2 (a second version, in `V2/`)

On 10 Nov 2026 the owner asked for "another version of the demo" under `/V2` with full freedom to
change the experience and UI. V2 is a separate Next.js app in [V2/](V2/) (its own guide:
[V2/CLAUDE.md](V2/CLAUDE.md), design contract [V2/DESIGN.md](V2/DESIGN.md)) that reuses V1's data,
store and money rules and redesigns the rest: one account with two modes (Ordering and Studio),
"Today" home pages, one Orders list, a Library of approved videos, a single job page with one
timeline, a landing page that explains. It uses the root `node_modules` (no install of its own),
runs on port 3200 (`cd V2 && npm run dev`), keeps its browser storage under `yapp2-` keys, and is
deployed by the same workflow to `/yap/V2/`. The root `tsconfig.json` and `eslint.config.mjs`
exclude `V2/`. Everything below this section is about V1; V1 is unchanged by V2.

## What this is

A **front-end-only, launch-quality prototype** of **Yapp**: a marketplace where small businesses
commission creators to make social video content for the business's own accounts and ads.
Built in Next.js with mock data and simulated flows. **No backend, no auth, no real payments, no
real media.** Everything a user does is stored in the browser (localStorage) so the demo feels
live and survives reloads.

The owner asked for something "pretty comprehensively developed… almost as if it's ready for
launch", to review and adjust afterwards. Treat it as a high-fidelity product prototype: real
flows, real states, real copy, but fake data.

## Product in one minute (from product-writeup.txt)

- Businesses (segment: **tech brands**, e.g. app makers; **US and Canada by default, built for a
  global audience**) place an order: a **custom order** (one creator, creators pitch; a video or
  written ad copy), a **UGC campaign** (10 or more videos from different creators at one price the
  brand sets, first come first served, posted on the creator's own account), or a **direct order**
  from a creator's profile.
- **Creators** (everyday presenters, video producers, influencers; portfolio matters more than
  followers) find work in one place, **pitch** on a custom order or **pick** a campaign slot.
- The work runs on one **order page**: messages → **delivery** (versioned) → **comments** both
  ways, pinned to a second of the video → **revision** → **approve** → payment released →
  **review** → **learnings** saved to the product → **commission again** with context carried forward.
- North star: "the easiest, most dependable place for a particular type of business to get social
  content made." Success = completed commissions, satisfaction, repeat purchases, minimal
  coordination.
- **The feedback so far.** Round 1 (`docs/`, two .docx; `textutil -convert txt -stdout`): one
  account type, the reels feed, UGC campaigns. Round 2 (`feedback_docs/`): the phone feed and tab
  bar, the bubble welcome, sign-in. Round 3 (`feedback_docs_2/`): three specs (Discover, Site-wide,
  Work), two HTML previews, a brand package and a legal pack of 12 drafts.
- **Round 3 is a specification.** The three specs contradicted each other, so the lead wrote the
  61 conflicts down (`feedback_docs_2/ROUND_3_DOCUMENT_ISSUES.md`) and the sender ruled on each in
  **`feedback_docs_2/YAPPS_ROUND_3_ANSWERS.md`**. That file is the authority: read its "Current
  rules at a glance" before changing a rule. The two previews (`DISCOVER PAGE.html`,
  `YAPPS_WORK (7).html`) are designs to replicate. When sources disagree: the answers file, then a
  spec's text, then its preview. Nothing in the app is removed unless a document says "remove".

## Decisions already made (and why) — don't relitigate without the owner

| Decision | Why |
| --- | --- |
| **Round 3 is built as written, with the answers file on top.** Stage 1 (9 Nov) was the part that held under any reading; stage 2 (10 Nov) is the rest. Not designed yet, so restyled only: the brand's own screens for reviewing pitches and managing campaign slots (`request-detail.tsx`, `campaigns/owner-view.tsx`) | The sender confirmed the documents are a spec and said he will design those two screens separately. |
| The logo is the brand package's **clapper over a speech bubble, wordmark "yapping"**, rendered only from the master SVGs in `public/brand/` through `components/ui/brand.tsx` (never redrawn, retyped, recoloured or minified). **Interface copy still says "Yapp"** | Brand spec: "Yapp" is filed by others and "Yapping" isn't legally cleared, so only the logo changed. `tone="auto"` renders the light and on-dark files and CSS shows one; `asset()` in `lib/site.ts` adds the base path. |
| Styling is the **brand package's look**: #F7F7F9 canvas, white cards with a soft shadow, pills, Inter 400/500/600, light big numbers, the dark primary button, glass header and sticky bars, five status-chip looks. **Light only: dark mode is paused** (`DARK_MODE_ENABLED = false` in `lib/prefs.tsx`; no switch anywhere; the dark values stay in `globals.css`, dormant) | Answers, item 49. Chip text is the answers' green #0A7A33, red #B42318 and amber #92400E (item 51). Paper stays opaque; readable text never uses `--y-ink-3` (2.6:1). Details in DESIGN.md. |
| **One green action per view.** "Needs you" is a white card with an accent bar; Search, Continue, Pitch now and the comment composer's send button are dark. Which action is green on each page is listed in DESIGN.md ("Pages") | Answers, item 13, and the brand book: "Green is a signal, not a wallpaper". Pastels are illustration-only (characters, avatars, reel covers); blocks are white. |
| **No blob characters in confirmation modals or empty states**; they show no illustration until abstract artwork is supplied. The feed's characters and the marketing pages keep theirs | Answers, item 15 (owner decision). `ConfirmModal`, `EmptyState` and `Celebrate` take a line icon at most. |
| **Market: US and Canada by default, built for a global audience.** English, US dollars, +1, US date formats, Eastern demo clock. A **video language** list (English, Spanish, French, Arabic, Portuguese, Hindi, Korean, Chinese); a video that isn't in English shows a translation toggle | Owner, round 3. The legal pack words Canada (outside Quebec) and the US as the launch scope, not a permanent limit; the prototype doesn't enforce it. CSS stays RTL-safe. |
| Launch content set: **8 formats** (app demo, screen walkthrough, unboxing, problem → solution, comparison, testimonial, talking head, voiceover) **plus the ad hook pack**; **8 tech categories**; **two job types** on a custom order: full video, and **ad copy writing** | The round 3 lists. Physical products are never shipped: briefs say the creator uses their own. |
| Economics: **Yapp keeps 20% of every transaction, taken from the creator's side.** The brand pays the listed price and nothing on top; the creator receives 80% and sees it beside every price ("$140 per Yapp · you earn $112"). Held from hire (or from posting a campaign), **released on approval**, **auto-approve 3 days** after delivery, a refund returns the price paid. Limits: **$30 to $5,000 per video**, $30 minimum pitch, $50 minimum budget | Answers, item 6 (it replaced stage 1's 10% on top). The split is computed only by `priceBreakdown()` in `lib/format.ts`; constants in `lib/taxonomy.tsx` (`PLATFORM_FEE_RATE`, `PRICE_*`, `PITCH_MIN`, `BUDGET_MIN`, `AUTO_APPROVE_DAYS`). Never recompute a price, a fee or a net in a component. |
| **The brand sets a campaign's price**; follower tiers (10K–20K up to 250K+) only decide who may pick. A **guidance range** per category and tier (`priceGuidance()` in `lib/pricing.ts`) is advice: a price under it shows a note and never blocks | Answers: no tier prices. The note calls the range an estimate and names no source, because the sources weren't verified. |
| Every order carries **one of four usage options, included in the price** (paid ads 12 months, paid ads 6 months, organic only, paid ads with no end date). **Raw footage is included. Two revisions are included**; after that: approve, a paid extra revision by agreement, or a dispute | Answers, section G1. There is no rights or raw-footage add-on any more (`usageOptions`, `DEFAULT_USAGE`). |
| **The legal pack's drafts are not published.** `/legal` lists the twelve documents as "in legal review" with no text, the footer links only to "All legal documents", and the zip is in `.gitignore` | Owner's choice: the pack's own readme requires a lawyer's review first, and the zip contains a file marked do-not-publish. Section G of the answers lists what the pack must change (20% fee, 80% to creators, launch-market wording) before that review. |
| **Brands are shown by reliability, never a star rating**: pays on time, review speed, hire rate, auto-approved, shares results ("—" until there is data). `reliabilityFigures()` | Legal pack: a creator's feedback about a client is private. "Shares results" needs ad accounts, so it stays "—". |
| Seed brands and people are **invented names**, checked by web search against the same field: Daftar, Roundleaf, Tablecrew, Notewren, Wayfolk, Brindle, Wrenlow Audio, Pixel Arcade, Qalamy, Wasla, Souqly | The previews use real companies and photos as samples. No real company is ever a customer or a subject; faces are `FaceAvatar`, covers are `VideoThumb`; payment options are generic. |
| **Product profiles + learnings** carried into every new brief and "Commission again" | Writeup: "product context and previous feedback carrying forward into subsequent commissions". |
| **One account type**: every account can order (its buyer profile, `businessId`) and make videos (its creator profile, `creatorId`, once set up). "Role" (`business`/`creator`) is only **the viewer's side of a deal**, derived per item with `sideOf()` | PM round 1: "no need for two types of accounts… like Instagram". |
| Two demo people sharing **one store**: **Nour Haddad** (business account, Daftar, Toronto; no creator profile until she sets one up) and **Layla Mansour** (personal account, creator @laylatalks, Vancouver, English and Arabic). Account menu → **Switch account (demo)**. The signed-in account is **tab-local** (sessionStorage), so two windows can play both sides | Lets a reviewer play both sides; actions by one show up for the other. |
| Other creators **auto-respond** (simulated replies, offers accepted after ~7s, versions delivered after ~20–25s), never for a demo person (`isDemoCreator`). Campaigns created in the browser are driven by a resumable `simulationTick` (creators join, upload review copies, redo them, post) | So the flows can be demoed end to end. See `scheduleReply` / `simulateDelivery` / `simulationTick` in `lib/store.ts`. Seeded campaigns stay still (deterministic QA). |
| **Fixed demo clock** (`NOW` = Wed 4 Nov 2026 10:00 Eastern, `lib/clock.ts`), fixed UTC−5 zone, US formats | Deterministic UI and no hydration mismatches. Never use `new Date()` in render. Because the clock never moves, nothing happens "by itself": auto-approval, the 14-day campaign window and upload deadlines are shown but not enforced, and "Skip 7 days (demo)" stands in for time passing on campaign pay. |
| **No real media**: `VideoThumb` composes generated scenes; the players simulate playback against each video's script with captions and a translation | No assets or backend; still makes portfolios, pitches and delivery review feel real. |
| Session in **cookies** (`yapp_account`, `yapp_logged_out`), read in the browser, plus a pre-paint script that sets a `y-session` class on `<html>` | Static-exportable, so no middleware. `y-session` and the 1024px media query decide what shows before paint (`.y-in-only`, `.y-out-only`, `.y-phone-only`), so "/" never flashes the wrong page. |
| **Calm over complete**: one job per screen, quiet cards, details behind a click, nothing said twice | Owner feedback after the first build: "cluttered at times, too much going on at once". Rules at the top of DESIGN.md ("Calm first"). Where a spec section would crowd a page it was left out and listed under known gaps (for example Productivity's ad, video and benchmark sections). |
| **Where "/" goes** (`components/shell/home-route.tsx`): signed out, the bubble welcome. Signed in on desktop, **Discover**, or **Work** for a personal account with a creator profile (`desktopHomeOf(s)`: Layla). Signed in on a phone, the feed. `/home` and `/more` go to `/` on desktop. Layout switches at **1024px** | Answers, items 11, 43 and 59. `/discover` stays reachable for phones, signed-out visitors and Layla, and redirects to `/` only when the account's desktop home is Discover. After sign-in on desktop: Ask for Yapps → New order, Make Yapps → Find work. |
| **The reels feed is phone only** (`/home`): full-bleed reels, floating logo and "+", Mix · Yapps · Orders, creator videos get **Order**, orders get **Pitch** or **Pick now**, an in-feed details layer. Desktop shows it only as a read-only preview inside Discover's phone frame (`/app-preview`, `lib/preview.ts`) | PM round 1 made it the home; round 3 moved the desktop home to Discover. Round 2's deliberate changes still hold (tab icons follow the reel, safe-area guide, ⋯ in the bottom row). |
| **Signed-out welcome** at `/`: a field of creator bubbles with **Ask for Yapps** and **Make Yapps**; `/signin` and `/signup` are the same scene with the panel open; the previous marketing page is `/about` | Round 2. The buttons set only where you land and, in the demo, who you become (Ask = Nour, Make = Layla). The welcome's nav is the shared signed-out nav (Discover, Services, How it works, Sign in, Get started). |
| Desktop nav: **Discover · Services · Work · Messages · Profile**, then New order, the bell and the avatar (account dropdown). Phone bar: **Home · Discover · Work · Messages · Alerts · Profile**, icons only with the label on the active tab; Alerts is its own page (`/alerts`) | Answers, item 19 (it replaced round 2's Inbox tab). Below 375px the active tab shows its icon only, because six tabs with a label don't fit. |
| **One sign-in and sign-up flow** (`components/auth/sign-in-panel.tsx`): phone and code first, then Apple, TikTok, Instagram, Google, all simulated; saved accounts (seeded with Nour and Layla). **One "Log out", which asks first** and keeps the saved account; an account is removed from the device only on the sign-in screen | Round 2, then the Site-wide spec: "Log out and forget" is gone everywhere. |
| **Glass floats, content doesn't**: glass is for the header pill, dropdowns, the tab bar, sticky bars, the welcome, sign-in and the reels chrome. Cards, sheets and page content stay solid | Brand package. A backdrop filter on a parent stops glass inside it from blurring, so the header's glass is a pseudo-element (see DESIGN.md, Shell). |
| **No 3D, animation or chart libraries**: the bubble field, Discover's stat cabinet, drifting strip and fan, and every chart are DOM and SVG with small calculations | Keeps the static export light and needs no WebGL fallback; all of it honours reduced motion. |
| **Discover shows real data where the app has it** (Live briefs, the activity ticker, reviews, hot categories as order counts, the category strip) **and labelled sample data elsewhere** (the stat cabinet, stories, the comparison table). A sample figure always carries the "Sample" chip, on every screen size. Signed-in visitors don't see How it works, the comparison or the closing bar | Answers, item 44. Figures that need connected ad accounts (CAC, ROAS, CTR, hook rate, reach) never show a number. Store buttons are one disabled "Coming soon" pill. |
| **Work** (`/work`): a sidebar with **Find work**, Ordered, Making and a link to Productivity; below 1180px a segmented control and a Filters sheet. Find work opens by default for accounts with a creator profile, Ordered for the rest. **Find work never lists the signed-in brand's own orders** | Work spec and preview. A posted order opens its owner screen for the brand (item 33); everyone else gets the **job page** at the same address (`/orders/[id]`). Find work's filters live in the URL. Explore keeps creators only. |
| **The order page** (`/work/[id]`): stages and one next step, Deliveries with version tabs, a player and **two-way comments** (timestamped or general, replies, resolve and re-open, edit and delete by the author); tabs Activity · Messages · Brief · Files; approve in two steps with the review; request changes with the comments you tick | Work spec and preview. Comments notify the other side and leave a line in Messages. A review copy is watermarked for the brand until approval. |
| **One new-order wizard** (`/orders/new`, six steps: Type, Size & price, Basics, Brief, Deadline, Post) for both kinds, with a live summary and **autosaved drafts**. The two older wizards were deleted | Work spec and preview. It keeps what the old ones did: saved products and their learnings, invite-only, number of videos, extras to quote, the explainer. Brand handles to tag are saved in Settings → Brand accounts. |
| **Ad copy writing** is a custom-order job type: text or a document as the delivery, general comments only, no posting step and no follower tier | Built from the answers' recommended flow at the owner's request, before its design exists. Expect a rework when the design arrives. |
| **Productivity** (`/productivity`): one page for both sides, built only from figures the store can compute (spend or earnings, videos, cost per video, on-time rate, first-pass approval, review time, pitch funnel, rehire rate). A change with no better direction (spend) is shown neutral | Answers, item 17 and the Productivity paragraph: reduced, platform figures only; ad metrics read "Connect an ad account". `lib/productivity.ts`. |
| **Services**: UGC ads, Native posts, Hook Lab, Go to market and For tech teams, each with a page; Creator Network, Amplified ads and For growth agencies are hidden everywhere | Answers, item 37: a service appears only when the product can do it. **The pages' copy is the lead's draft for the owner to edit** (`components/marketing/service-content.tsx`); their figures come from the store. |
| **Footers**: the full dark footer on Discover, the welcome and marketing pages, with only links whose page exists; a compact one on signed-in pages; none on phones, where `/more` holds the same links | Answers, items 22, 40 and 41. |
| **UGC campaigns**: 10 to 50 videos in steps of 5, one creator per video; platforms the creator can connect (TikTok, Instagram, Snapchat), several allowed, the creator posts on **one** chosen when picking; the full amount held at posting; the brand picks an **upload deadline** (2, 3, 5, 7 or 10 days) and the campaign shows a 14-day window; the brand can remove a creator or reject a video and the slot reopens; approved money is **pending** and released **7 days after the post is verified** (tag + paid-partnership label) with the post kept up 30 days; the price can only be raised, for unpicked slots | PM round 1, then the legal pack and the answers. Constants in `lib/taxonomy.tsx` (`CAMPAIGN_*`); pure logic in `lib/campaigns.ts`. Still `null` placeholders: `CAMPAIGN_REJECTION_PENALTY`, `CAMPAIGN_MAX_REASSIGNMENTS`. |
| **In-platform only**: the store masks phone numbers, emails, links and handles in everything people type (`lib/contact.ts`), comments included; a campaign's brand handle is allowed through | PM: "All communication and account viewing happen inside the platform only." |
| **One set of page margins**: every page reads `--y-gutter` (20px phones, 24px tablets, 72px from 1024px, where it matches the header), through `WidePage` on the redesigned pages and `Page` on the others | Lead's call in stage 2: the pages that weren't redesigned sat 32px wider than the new header on each side. |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (includes React Compiler rules: no setState in effect bodies, etc.)
npm run build
```

Demo entry points: `/` (the signed-out welcome) → either button opens sign-in, where Nour and Layla
are one tap away as saved accounts (any plausible phone number with code 123456 also works). On
desktop Nour lands on Discover and Layla on Work; on a phone both land on the feed. Account menu
(desktop: the avatar; phone: Profile tab → Account) → **Switch account (demo)**, **Skip 7 days
(demo)** (releases pending campaign earnings whose posts are verified and live), **Reset demo
data** (restores the seed and the saved accounts; asks first).

Records worth opening: `/work/c-201` (a delivery in review with a comment thread, both sides),
`/work/c-206` (ad copy in review), `/orders/r-150` (Daftar's campaign, 10 × $120: the owner screen
as Nour, the job page as Layla), `/orders/r-251` (a two-platform campaign), `/orders/r-213` and
`/orders/r-214` (open ad-copy orders).

## Architecture

```
app/                      Next.js App Router pages (all client pages read the store); one set of
                          routes for every account (lib/paths.ts), pages adapt to the viewer's side
  page.tsx                HomeRoute: bubbles signed out; Discover or Work on desktop; the feed on phones
  signin/, signup/        the welcome with the panel up
  discover/               Discover (public; the desktop home is the same page at "/")
  app-preview/            the phone feed, read-only, for Discover's phone frame
  services/<slug>/, for/tech-teams/     the five service pages (static folders, one template)
  about/, for-creators/, how-it-works/, legal/, not-found.tsx    marketing; legal lists documents only
  home/                   the reels feed (phones)
  more/, alerts/          the phone's More page; notifications
  work/, work/[id]/       Work (Find work | Ordered | Making) and the order page
  orders/, orders/new/, orders/[id]/    orders you placed; the wizard; one address per order
                          (owner screens for its owner, the job page for everyone else)
  productivity/           statistics for both sides
  explore/, creators/, creators/[handle]/, creators/[handle]/commission/   creators, profile, direct order
  pitches/, messages/, profile/ (+edit/), wallet/, billing/, products/ (+new, [id]), saved/,
  settings/, onboarding/
components/
  ui/        design-system primitives and the stage 2 kit (WidePage, ActionPill, PickNowButton,
             SlotBar, StageBars, Stepper, DefinitionList, KpiCard, LineChart, ConfirmModal, Sheet,
             Dropdown, NextStep, StickyActionBar, DeltaChip, SampleChip…) and brand.tsx
  shell/     AppRoot (+simulation tick), SiteHeader, AppShell, PublicShell, nav, home-route,
             account-menu and account-sheet, services, site-footer, more-page, notifications
  discover/  Discover: hero, cabinet, explore strip, stories, sections, side panel, app preview;
             data.ts (real derivations) and sample.ts (every sample figure)
  work/      Work page, Find work (find-query.ts owns the URL filters), job cards, the job page,
             take-work.tsx (Pick now and Pitch now), Ordered and Making
  commission/ the order page: header, next-step, deliveries, order-player, comments-panel, tabs,
             side panels, sheets (approve, review, request changes, deliver, post link)
  new-order/ the wizard: model.ts (form, validation, drafts, posting), one file per step, summary
  productivity/  the Productivity page;  marketing/  marketing blocks and the service pages
  domain/    shared marketplace pieces (VideoThumb, VideoPlayer, CreatorCard, ThreadView, badges…)
  feed/      reels feed;  landing/  signed-out welcome;  auth/  sign-in and onboarding
  campaigns/ the owner's campaign screen and sheets;  requests/  the owner's custom-order screens,
             the orders list, pitch pieces;  creator/, discovery/, explore/, inbox/, money/,
             settings/, business/, products/, account/
lib/
  types.ts       domain model (read this first)
  taxonomy.tsx   formats, platforms, languages, categories, job types, usage options, status labels
                 and chip tones, fee and price constants, follower tiers, campaign constants
  pricing.ts     the campaign price guidance (factors per category and tier)
  data/          seed data (fictional people and companies) from a shared story bible
  store.ts       client store: useDemo(), useHydrated(), actions.* (all mutations), simulationTick()
  selectors.ts   pure derivations: me.*, sideOf, findWork, fit, earnings, receipts, reliability…
  campaigns.ts   pure campaign logic;  comments.ts  comment helpers and permissions
  productivity.ts  every figure on the Productivity page, and productivityChip() for the menu
  preview.ts     read-only preview mode (on at /app-preview);  files.ts  brief attachment checks
  contact.ts     contact masking;  paths.ts  every in-app URL;  static-params.ts  pre-rendered ids
  format.ts      money, dates, priceBreakdown (the one place the 80/20 split is computed)
  clock.ts, prefs.tsx, saved-accounts.ts, site.ts (base path, asset(), the pre-paint script)
app/globals.css  Tailwind v4 + the design system (tokens, blocks, pills, chips, forms, the kit)
app/styles/      one stylesheet per area: shell, discover, work, order, new-order, productivity,
                 services, landing, auth (all imported by globals.css)
public/brand/    the 11 logo master SVGs, byte-identical to the brand package
```

Data flow: `lib/data` seed → copied into the store on first load → persisted to localStorage
(`yapp-demo-v1`). Pages call `useDemo()` and derive with selectors; they mutate only through
`actions.*`. Bump `VERSION` in `lib/store.ts` (now 9) when the seed shape changes (old saved state
is discarded). Per-account data lives in records keyed by account id (`saved`, `settings`,
`orderDrafts`, `hidden`); notifications carry `accountId`. "Who is acting" is `activeIds(s)` /
`me.ids(s)`; never assume a creator profile (`me.creator(s)` can be undefined: show
`CreatorSetupSheet`).

## Conventions (summary — full rules in DESIGN.md)

- Exactly **one green action per view**; DESIGN.md's "Pages" section says which. Blocks are white
  (`paper`), meaning comes from an icon and a label.
- Status chips have five looks: waiting = `neutral`, moving = `active`, done = `success`, needs
  attention = `warning`, negative or closed = `danger`. The side that has to act sees "needs attention".
- Fixed names: "Pick now", "Custom order", "UGC campaign", "Productivity", "Request changes".
- Money comes from `lib/` (`priceBreakdown`, `creatorNet`, `priceWithNet`, `campaignMoney`): a
  creator always sees the net beside a price, a brand never sees a fee line.
- The logo comes only from `components/ui/brand.tsx`; static files in `public/` go through `asset()`.
- Build pages from the kit and `y-` classes; colours only via tokens; light only (no `dark:` styles).
- Signed-in pages wrap in `<AppShell>` (`focus` for wizards, `fullscreen` for the feed); public pages
  in `<PublicShell>`; redesigned pages use `WidePage`, the others `Page` / `PageHeader`.
- Link only through `lib/paths.ts`. Derive the viewer's side with `sideOf(s, item)`; no self-dealing
  (nobody pitches on, picks a slot on, or orders from themselves).
- Dynamic routes: `useParams()`; ids created at runtime exist only after hydration, so show a
  skeleton while `!useHydrated()` and a not-found `EmptyState` after.
- `useSearchParams()` consumers must be inside `<Suspense>`.
- Copy: plain, warm, specific, sentence case, no emoji, no exclamation marks; Canadian spelling
  with "-ize" (colour, centre, authorized). Status = icon + label.
- Lint is strict (React Compiler rules). Derive state during render instead of syncing it in
  effects; use `useSyncExternalStore` for browser-only values.
- When several agents share the tree, keep it compiling at every step: one missing export makes
  the dev server return 500 on every route for everyone. Keep an old export until every importer
  is updated.

## Deployment (GitHub Pages)

The app must stay **static-exportable**. `npm run build:pages` (`GITHUB_PAGES=true`) switches
`next.config.ts` to `output: "export"`, `trailingSlash`, and `basePath` from
`NEXT_PUBLIC_BASE_PATH` ("/yap" on `saadals.github.io/yap`). The workflow
`.github/workflows/deploy-pages.yml` builds and deploys on push to `main` (it also deploys `V2/`).
Rules that keep it working:

- No server-only APIs: no `cookies()`/`headers()`, route handlers, server actions, middleware or
  `next/image` optimisation. The session is read in the browser (`lib/prefs.tsx`, with a pre-paint
  script from `lib/site.ts` in the root layout).
- Every dynamic segment needs `generateStaticParams`. They live in each segment's `layout.tsx`
  using `lib/static-params.ts` (seed ids + `RUNTIME_SLOTS` sequential slots per prefix: 40 orders,
  200 commissions, 30 products; plus each demo account's reserved creator handle). Ids created in
  the browser are sequential (`r-n1`, `c-n1`, `p-n1`) so they land on a pre-rendered page. The
  service pages are plain folders, one per slug, so a hidden service has no page at all.
- Never hard-code the origin or a leading "/" in raw URLs. `<Link>` and `router` add the base path;
  for copy-link and share text use `absoluteUrl()` from `lib/site.ts`. Find work writes its filters
  with `history.replaceState`, which keeps the base path because it only changes the query.
- `useSearchParams()` consumers must sit inside `<Suspense>` (the export fails otherwise).

## QA tooling

```bash
npm run build && npx next start -p 3123            # QA runs against a production server
npm run qa:sweep                                   # every route × 3 sessions (signed out / Nour / Layla) + 404s
npm run qa:flow scripts/qa/flows/core-loop.json    # scripted browser flow (headless Chrome via CDP)

# Against a running dev server (only one `next dev` per project — reuse it, e.g. port 3000):
BASE_URL=http://localhost:3000 node scripts/qa/cdp.mjs scripts/qa/flows/core-loop.json

# Exactly as GitHub Pages serves it (static export under /yap):
NEXT_PUBLIC_BASE_PATH=/yap npm run build:pages
mkdir -p /tmp/site && ln -sfn "$PWD/out" /tmp/site/yap && python3 -m http.server -d /tmp/site 4100 &
scripts/qa/sweep.sh http://localhost:4100/yap
BASE_URL=http://localhost:4100/yap node scripts/qa/cdp.mjs scripts/qa/flows/cross-role.json

# Every route at every width: overflow, fonts, emoji, exclamation marks, a dark-mode switch
node scripts/qa/gen-audit.mjs nour /tmp/audit-nour.json          # also: layla, none (signed out)
BASE_URL=http://localhost:4100/yap node scripts/qa/cdp.mjs /tmp/audit-nour.json
```

`scripts/qa/cdp.mjs` is a dependency-free Chrome DevTools driver: it clears the app's storage,
sets the account cookie (`account: "nour" | "layla"` per flow), then runs steps: `go`, `click` by
visible text (prefers on-screen controls), `clickSel`, `type`, `text` / `notText` assertions,
`eval` (with `equals` to assert), `path` (assert the address), `shot` → `.qa/shots/` (`full: true`
for the whole page), `account` to switch the signed-in demo account, `viewport` to resize, `key`,
and `swipe` for touch gestures in `mobile` flows. `reducedMotion: true` on a flow emulates the
system setting. Flows in `scripts/qa/flows/`:

- The loop: `core-loop` (approve → pay → review → learning → commission again → wallet),
  `cross-role` (Layla pitches → Nour hires → Layla delivers → Nour reviews), `simulated-delivery`,
  `order-comments` (comment at a timestamp, reply, resolve, re-open, request changes with ticked
  comments), `order-adcopy`, `masking`.
- Orders: `new-order` and `new-order-mobile` (both kinds, validation, a price under the range,
  a restored draft), `request-wizard`, `campaign-owner`, `campaign-creator` (pick → review copy →
  approve → post link → verified → skip 7 days → withdrawable).
- Finding work: `find-work` and `find-work-phone` (filters, facet counts, the URL, pick, Making).
- Shell: `discover`, `discover-phone`, `phone-shell`, `logout`, `welcome-signin`,
  `account-switch`, `feed-mobile`, `productivity`, `productivity-phone`, `visual`.
- `route-smoke-nour` / `route-smoke-layla`: every route in a real browser, catching runtime errors
  the curl sweep can't.

Flows click by visible label, so renaming a button means updating the flow JSON. They use fixed
waits: under CPU load, or as the first run against a freshly started server, one occasionally fails
on its first page load and every later step cascades. If a flow fails from its first step, rerun
it before debugging; a first screenshot in a cold browser can be blank. `.qa/` (screenshots, Chrome
profiles) and `out/` are gitignored and excluded from ESLint and TypeScript. Each run deletes its
own Chrome profile; if `.qa/profiles/` ever grows, a run was killed mid-flight: its headless Chrome
may still be running (`pkill -f "user-data-dir=.*/.qa/profiles/"`) and the folder is safe to empty.
Screenshots accumulate in `.qa/shots/` (about 830 MB after stage 2) and are safe to delete.

The dev server: one compile error anywhere makes `next dev` answer 500 on every route until it is
fixed, and it sometimes keeps a stale error; restart it with `rm -rf .next/dev` if a fixed error
persists. `devIndicators` is off so the dev badge doesn't cover the phone tab bar in screenshots.
Agents and the dev server pause while the Mac sleeps: a long multi-agent run needs the lid open,
and on battery `caffeinate -i`.

## Status (updated 10 Nov 2026, after feedback round 3, stage 2)

**Round 3 is built in full: stage 1 (9 Nov) and stage 2 (10 Nov).** Every rule in the answers
file's "Current rules at a glance" is in the app, and every screen in the two previews is
replicated in the main site: Discover, the shell (nav, Services, footers, account menu, the six-tab
phone bar, More, Alerts), Work with Find work, the job page, the order page with two-way comments,
the one new-order wizard, and Productivity. Ad copy writing works end to end. `V2/` was not touched.

Verified at the end of stage 2:
- `typecheck`, `lint`, `build` and `build:pages` are clean.
- The static export (412 pages) served under `/yap`: `qa:sweep` passes (63 routes × 3 sessions,
  plus the 404s, hidden services included) and **all 26 flows pass** against it (`core-loop` and
  `welcome-signin` on their second run: the first-page-load flake).
- The audit (`scripts/qa/gen-audit.mjs`): 47 routes × 5 widths (390, 768, 1024, 1280, 1440) × 3
  sessions, with no horizontal overflow, Inter only, no emoji, no exclamation mark and no dark-mode
  switch. It reads pages as they load, not sheets or modals.
- Money, by hand on the export: a $200 custom order shows $200 on Billing and adds $160 to the
  creator's wallet ($592 → $752); cancelling a $380 order refunds $380 and the held total drops by
  the same; Daftar's campaign holds 10 × $120 = $1,200 and a creator sees "you earn $96".
- The 11 logo files match the brand package's checksums in `public/brand/` and in the export.
- Design: the lead read each replicated screen beside its preview at 1440 (Discover, the Services
  menu, the footer, Find work, Ordered, the job page, the order page, the wizard, Productivity)
  and the main phone screens at 390; the agents compared the rest, every sheet and wizard step
  included. The differences that remain are the ones the answers file asks for (see DESIGN.md,
  "Pages") and real seed data in place of the previews' samples.

Not verified: a real phone or GPU (blur, safe areas, the Back gesture); Safari, in particular
`display: contents` on the job page's side column between 1024 and 1180px; a real trackpad or
touch screen on Discover's cabinet and strip; RTL; a screen reader; and the non-English seed
scripts by a native speaker.

**Session history.**
1. First build: lead agent wrote the foundation (`lib/`, `components/ui|domain|shell`, design
   system); 9 subagents built the feature areas.
2. Owner feedback: "cluttered, too much going on at once". The "Calm first" rules (DESIGN.md) and a
   simplification pass by 7 subagents.
3. GitHub Pages: static export, client-side prefs, pre-rendered dynamic routes, deploy workflow.
4. PM feedback round 1 (`docs/`): accounts fully merged, campaigns alongside custom requests, the
   reels feed; lead rewrote `lib/` and the shell, 6 subagents built the areas.
5. Feedback round 2 (`feedback_docs/`): the phone feed and tab bar, the bubble welcome, one sign-in
   flow with saved accounts.
6. Feedback round 3, stage 1 (9 Nov): the lead reviewed the documents, the owner chose to build
   only what held under any reading: the brand and restyle, the legal pack's rules, the market
   switch and all seed data rewritten from a story bible. Committed by the owner as `bfcbb45`.
7. Feedback round 3, stage 2 (10 Nov): the sender's answers arrived. All by Opus subagents at
   xhigh effort, as the owner asked. Wave 0, one after the other: the money rules (20% from the
   creator's side, no tier prices, usage options), then the model (comments, job types, text
   deliveries, campaign platforms, drafts, preview mode, `findWork`) and the shared kit. Wave 1,
   six agents in parallel, one area each with its own files and stylesheet: shell and services,
   Discover, Work and the job page, the order page, the new-order wizard, Productivity. Wave 2,
   the lead: read every screen beside its preview, polish fixes back to the agents, one set of
   page margins, the builds, the export sweep, flows and audit, this handoff. What went wrong on
   the way: twice an agent removed an export another file still imported, which took the shared
   dev server down for all six until the lead restarted it.

**Known gaps and simplifications (deliberate for a prototype):**
- No backend, auth, payments, uploads, media, social APIs or post verification: all simulated. The
  store is client-only (localStorage `yapp-demo-v1`, `VERSION` 9). Other keys: billing details
  (`yapp-billing-details-v2`), saved sign-in accounts (`yapp-saved-accounts-v2`), the feed's
  position, the region chosen on More (`yapp-region-v1`, which changes only the footer and More
  text), Find work's last filters (sessionStorage).
- `V2/` was ported to the stage 2 rules on 11 Nov 2026 (its `lib/` synced from this repo at
  `9e183d3`; see V2/CLAUDE.md, "Round 3 stage 2 port"). It keeps its own layouts and navigation.
- Shown but not enforced, because the demo clock never moves: auto-approval, upload deadlines, the
  14-day campaign window, comments closing 30 days after completion, the reminders before
  auto-approval. Nothing in the interface can take a post down, so the "post removed" path is
  reachable only through the store. Post verification always passes; only a bad link can fail.
- Discover: the stat cabinet, the stories and the comparison table are sample data (labelled).
  Hot categories show order counts, not growth. Signed out, Live briefs show the default demo
  account's view, so Daftar's own orders never appear there.
- Productivity counts only records in the store, so it can disagree with seeded profile figures:
  Layla's profile says 98% on time from 112 orders, while her four seeded orders give 75% over 12
  months. Layla's buyer side has no orders, so it shows an empty state. The spec's ad, video,
  category and benchmark sections are not built.
- Ad copy writing: no creator lists it as a format, so its budget has no market range (it starts at
  $300 with a plain note). The whole flow predates its design.
- Find work: job type has two values (full video, ad copy writing), not the preview's eight
  services; there is no category chip row; no rating or trend chip on a card.
- The service pages' copy is a draft. The price guidance cites no source.
- The brand's pitch-review and campaign-management screens are restyled, not redesigned.
- Store gaps: a paid extra revision isn't charged (copy only); a campaign's review copy reuses the
  creator's first portfolio video, so a slot's clip can show another brand's script; no "uninvite";
  removing a creator has no undo; offers have no reply deadline.
- Leftovers: Settings still has a "Change password" button although sign-in is phone and code;
  payouts have no country field; the "Spent this month" card on Billing has a large empty area;
  `ThreadView`'s incoming bubbles are grey where the preview has white with a shadow;
  `requests/opportunity-view.tsx` and `TakeView` in `campaigns/take-view.tsx` are no longer routed
  to (the feed still uses `TakeSlotSheet` from that file).
- Onboarding: "Make videos" continues as Layla and saves nothing; "Order videos" saves the product
  and continues as Nour; "Both" also creates Nour's creator profile. Sign-up doesn't create accounts.
- Connected accounts get a deterministic simulated follower count per handle (6K–36K).
- The UI is English-only. City and country pickers offer only the seed's values.
- A long-running `next dev` keeps the old route list in `.next/dev/types`; if `npm run build` fails
  on `.next/dev/types/validator.ts`, delete that folder (or restart the dev server) and rebuild.

**Open questions.**
1. For the lawyer and the owner (answers, section G3): who returns which share when a post is
   removed early and the brand is refunded; sales tax on the 20%; whether a creator's reportable
   income is the price or the net; the wording of the fee disclosure. Also still open there: the
   refund period for unpicked slots after a campaign closes, and the 14-day window.
2. From the sender: the abstract illustrations for confirmations and empty states; the designs for
   the brand's pitch-review and campaign-management screens; the design for ad copy writing.
3. For the owner: the five service pages' copy (V2 uses the same draft).
4. The name: when "Yapping" is cleared, does interface copy change from "Yapp"?
5. Still placeholders in `lib/taxonomy.tsx`: the penalty for repeated rejections
   (`CAMPAIGN_REJECTION_PENALTY`) and the maximum reassignments of one slot
   (`CAMPAIGN_MAX_REASSIGNMENTS`).

**Suggested next steps (owner to prioritise):**
1. Review stage 2 on desktop and on a real phone; edit the service pages' copy.
2. Send the lawyer the legal pack with section G of the answers, and keep `/legal` as it is until
   the review is done.
3. Ask a native speaker to check the Chinese, Korean, Hindi and new Arabic video scripts (from
   stage 1: v-layla-5, and one line each in v-sara-2 and v-lina-1).
4. Backend: the types in `lib/types.ts` map to tables; replace `actions.*` in `lib/store.ts` with
   API calls (keep the selectors and `priceBreakdown`). Real auth, team members.
5. Payments with held funds through a licensed provider (the legal pack requires it), payouts,
   invoices with tax IDs, and the 20% fee on the creator's statement.
6. Real video: resumable uploads, transcoding, a watermarked review copy, frame-accurate comments.
7. Connected ad accounts, which unlock the ad metrics on Productivity, "Shares results" on a
   brand, and the real figures behind Discover's stat cabinet.
8. Trust and safety: ID and brand verification, the dispute process (reply in 48 hours, decision,
   one appeal), daily post checks for campaigns, usage-rights records per order.

Git: the owner commits and pushes their own changes. Round 3 stage 1 is committed (`bfcbb45`); at
the end of the stage 2 session all of it was uncommitted on `main` (about 240 changed or new
paths, including deleted wizard files), alongside another session's uncommitted `V2/` work. Check
`git status` before assuming anything is deployed.
