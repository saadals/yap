# Yapp — project guide for agents

Read this first. It explains what this repo is, why it looks the way it does, and how to work in
it without asking the owner (Saad) for context again. Design and component rules live in
[DESIGN.md](DESIGN.md); the original product brief is [product-writeup.txt](product-writeup.txt).

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

- Businesses (initial segment: **small software teams**, e.g. app makers, targeting
  **Arabic-speaking audiences**) post a **content request** (product, audience, desired content,
  budget, deadline) or commission a creator **directly** from their profile.
- **Creators** (everyday presenters, video producers, influencers — portfolio matters more than
  followers; posting to their own audience is an optional add-on) respond with a **pitch**.
- The business hires → a **commission** runs: messages → **delivery** (versioned) →
  timestamped notes → **revision** → **approve** → payment released → **review** →
  **learnings** saved to the product → **commission again** with context carried forward.
- North star: "the easiest, most dependable place for a particular type of business to get social
  content made." Success = completed commissions, satisfaction, repeat purchases, minimal
  coordination.
- **PM feedback round 1 (docs/, Nov 2026)** added: one account type that can both order and make;
  a reels-style Home feed; and **UGC campaigns** (10+ videos from different creators at a fixed
  price per follower tier, first come first served, posted to the creator's own account, paid at
  month end if the post stays up). Both docs are .docx in `docs/` (`textutil -convert txt -stdout`).
- **Feedback round 2 (`feedback_docs/`, Nov 2026)**: two specs and two HTML previews that redesign
  the phone feed and tab bar, the signed-out landing (creator bubbles) and sign-in. Most of it was
  built as written. Where it contradicted the app, round 1 or itself, it was changed; the table
  below says how and why. The specs remain the reference for the real auth, media and native work.

## Decisions already made (and why) — don't relitigate without the owner

| Decision | Why |
| --- | --- |
| Name **Yapp**, speech-bubble mark with three typing dots (last one neon) | Suggested in the product writeup; playful; mark echoes the source design's "three blocks, last neon". |
| Styling from **design V10 "Stack"** in the owner's `jobPlatform/frontend` repo, branch `prototype/new-designs`, folder `app/newdesigns/v10` | Owner's instruction. **The owner clarified: colour and styling only, not layout.** Tokens/classes were ported and renamed `v10-`→`y-`, `.ndv10`→`.yapp`. Layouts are our own, designed for a marketplace. |
| **English-first UI**; Arabic appears where the product needs it (dialect choices, Arabic hooks/captions with English translations, Arabic names) | The UI's users are business teams; the *content* targets Arabic speakers. A full Arabic locale wasn't requested; the CSS stays RTL-safe (logical properties, `[dir=rtl]` rules kept) so it can be added. |
| Launch content set: **6 formats** (selfie demo, screen walkthrough, honest review, problem skit, how-to tutorial, ad hook pack), **8 languages/dialects** (Saudi, Khaleeji, Egyptian, Levantine, Iraqi, Darija, Fusha, English) | Writeup: "a specific customer segment and a manageable set of content formats", software demos for Arabic audiences. |
| Economics: creators keep **100%**; business pays a **10% service fee only when work completes** (custom and direct orders; campaigns have no fee for now); payment **held** at hire, **released on approval**; **auto-approve 3 days** after delivery (campaign review copies too); full refund if not delivered; organic usage rights always included, **paid-ads usage is an add-on** | Writeup: revenue = fee on completed commissions; "simple and dependable". Constants in `lib/taxonomy.tsx` (`SERVICE_FEE_RATE`, `CAMPAIGN_FEE_RATE`, `AUTO_APPROVE_DAYS`). |
| **Product profiles + learnings** carried into every new brief and "Commission again" | Writeup: "product context and previous feedback carrying forward into subsequent commissions". |
| **One account type** (PM round 1): every account can order (its buyer profile, `businessId`: a company or the person themselves) and make videos (its creator profile, `creatorId`, once set up). "Role" (`business`/`creator`) is only **the viewer's side of a deal**, derived per item with `sideOf()`. A "Business account" (company, VAT invoices, team) is an optional upgrade | PM: "no need for two types of accounts… like Instagram". Owner chose the fully merged app over a mode switch. |
| Two demo people sharing **one store**: **Nour Haddad** (business account, Daftar; no creator profile until she sets one up) and **Layla Mansour** (personal account, buyer profile `b-layla`, creator @laylatalks). Account sheet (desktop: avatar; phone: Profile tab → Account) → **Switch account (demo)**. The signed-in account is **tab-local** (sessionStorage), so two windows can play both sides | Lets a reviewer play both sides; actions by one show up for the other. |
| Other creators **auto-respond** (simulated replies, auto-accept offers after ~7s, auto-deliver versions after ~20–25s). Never for a demo person (`isDemoCreator`): switch account to answer as them. Campaigns created in the browser are driven by a resumable `simulationTick` (mounted in `AppRoot`, one visible tab at a time): creators join every ~6s (stopping one slot short while Layla could still join), upload review copies after ~16s, redo them after changes, and post approved videos; post verification takes ~3s | So the flows can be demoed end to end. See `scheduleReply` / `simulateDelivery` / `simulationTick` in `lib/store.ts`. Seeded campaigns stay still (deterministic QA). |
| **Fixed demo clock** (`NOW` = Wed 4 Nov 2026 10:00 Riyadh, `lib/clock.ts`); dates display in Riyadh time | Deterministic UI and no server/client hydration mismatches. Never use `new Date()` in render. |
| **No real media**: `VideoThumb` composes generated scenes (creator face, mock phone/laptop UI, palette tints); `VideoPlayer` simulates playback against each video's script with captions + translation | No assets/backend; still makes portfolios, pitches and delivery review feel real. |
| Session/theme in **cookies** (`yapp_account`, `yapp_theme`, `yapp_logged_out`), read in the browser (`lib/prefs.tsx`) plus a pre-paint script that sets the theme and a `y-session` class on `<html>` | Static-exportable, so no middleware (the spec asked for it): `y-session` hides the welcome before paint while the client redirects to the feed. Which account a tab acts as lives in the store (`activeAccountId`, tab-local). A signed-in page opened from a shared link signs the visitor in; after a real logout it goes to the welcome instead. |
| **Calm over complete**: one job per screen, ≤5 blocks on dashboards, quiet cards (one meta line, ≤2 badges), details behind a click, nothing said twice | Owner feedback after the first build: "cluttered at times, too much going on at once". Rules are at the top of DESIGN.md ("Calm first"); a simplification pass applied them everywhere. Don't add blocks back to make screens "complete". |
| **Home is a reels feed** (`/home`). Phones: full-bleed reels with no header; logo and "+" (Create sheet) float on top, Mix · Yapps · Orders stack on the right, the name sits top start, and text, fades and tab icons follow the reel (`data-reel-tone` on `<html>`). Desktop keeps the header and a 9:16 column. Creator videos get **Order**; orders and campaigns are light canvases with tappable characters and a topic prop, with **Pitch** / **Make a Yapp** ("N of T remaining" inside the button). Pill, swipe left or keyboard opens an in-feed details layer with a sticky button (`?details=`, so Back closes it). The old dashboards became **Work** (`/work`) | PM round 1: card lists let people skim past offers. Round 2 restyled it. Deliberate changes from the spec: "Make a Yapp" (the spec also wrote "Make Yapp now"), "Order from Layla" (not "Commission"), slot bar only in details (the chip already says it), "Your Yapp · in progress" (campaigns have no deadline yet), ⋯ moved to the bottom row (its corner now holds "+" and the tabs), tab icons follow the reel (ink on clear glass was about 2:1 on dark video), safe-area guide 880 × 1600 (phones crop the sides, not the top). |
| **Signed-out welcome** at `/`: a field of creator bubbles (`components/landing/`), hover or tap for a two-video preview, two buttons, glass nav. **Signed-out only on both phone and desktop**; `/signin` and `/signup` are the same scene with the panel open. The previous marketing page moved to `/about` | Round 2. The spec kept bubbles as the signed-in desktop home; a returning buyer needs their work and the feed, so desktop goes to `/home`. To follow the spec literally, change the redirect in `components/landing/welcome-scene.tsx` and `homeFor` in `nav.tsx`. A one-line description and "What is Yapp?" were added because the spec's page never says what Yapp is; the signed-out nav keeps public links instead of Work/Messages/Profile. |
| Welcome buttons are **Ask for Yapps** and **Make Yapps** | The spec's "Get Yapps (UGC Campaign)" was marked "assumption; confirm" and read as a buyer action (campaigns are something a business buys), leaving creators no clear way in. The button sets only where you land and, in the demo, who you become (Ask = Nour, Make = Layla), never an account type (round 1 merged accounts). |
| Phone bar: **Home · Work · Discover · Inbox · Profile**. Inbox holds Messages and Alerts (`/messages?tab=alerts`). Desktop keeps the Messages link and bell; "Discover" is the label on both (route stays `/explore`). Profile opens the hub; its Account row opens the account sheet | The spec dropped Messages because "there is no messaging yet", but messaging is built and central, and the desktop spec kept it. Inbox is the spec's own plan for when messaging exists. A tab can't both navigate and open a sheet, and the sheet alone would hide Wallet, Billing and Products. |
| **One sign-in and sign-up flow** (`components/auth/sign-in-panel.tsx`): phone and code first (default +966), then Apple, TikTok, Instagram, Google, all simulated; **saved accounts** in `lib/saved-accounts.ts` (seeded with Nour and Layla, which replaces the old demo tiles); "Log out" keeps the row, "Log out and forget" removes it. Full glass page on phones, side panel on desktop | Round 2, with the +966 default and Gulf/Levant list instead of the spec's +1 because the market is Arabic-speaking. Email and password screens were retired. The spec has no first-run step; "New here?" keeps `/onboarding` reachable, and real auth will need it. |
| **Glass is scoped** to the welcome, sign-in, the reels chrome and details (`.y-glass`, `--y-glass*`, `--y-soft`). Other pages keep `--y-canvas` and solid blocks | The specs scope it that way; sheets already open as a side panel on desktop. |
| **No 3D or animation libraries**: the bubble field is pooled DOM elements with a small perspective calculation | The spec listed three, R3F, drei, framer-motion, hls.js and simplex-noise, but its own preview only draws flat camera-facing sprites with fog. This reuses `FaceAvatar`, follows dark mode and needs no WebGL fallback. |
| **UGC campaigns** sit **alongside** custom requests and direct orders ("New order" asks the type first). Min 10 videos, steps of 5, one creator per video; tier sets the price (10–20K $30, 20–50K $40; higher tiers are placeholders); budget held up front; eligible creators (verified followers within the tier, via a read-only connected account) take slots first come, first served; the business can remove a creator or reject a video and the slot reopens automatically; approved money is **pending** in the creator's wallet until month end and only unlocks if the post (tag + paid-partnership disclosure, verified) is still up; tier can change once (taken slots keep their price) | PM spec "UGC Campaign Flow". Owner decisions: alongside (not replacing) custom requests; **no service fee on campaigns for now**. Deferred by the PM and left as `null` placeholders in `lib/taxonomy.tsx`: deadline/late handling, repeated-rejection penalty, max reassignments per slot. |
| **In-platform only**: the store masks phone numbers (incl. Arabic-Indic digits), emails, links and handles in everything people type (`lib/contact.ts`), always; a campaign's brand handle is allowed through | PM: "All communication and account viewing happen inside the platform only." |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (includes React Compiler rules: no setState in effect bodies, etc.)
npm run build
```

Demo entry points: `/` (the signed-out welcome) → either button or the person circle opens sign-in,
where Nour and Layla are one tap away as saved accounts (any plausible phone number with code
123456 also works). Account sheet (desktop: avatar; phone: Profile tab → Account) →
**Switch account (demo)**, **Jump to month end (demo)** (unlocks pending campaign earnings whose
posts are live), **Reset demo data** (restores the seed and the saved accounts).

## Architecture

```
app/                      Next.js App Router pages (all client pages read the store); one set of
                          routes for every account (lib/paths.ts), pages adapt to the viewer's side
  page.tsx                the signed-out welcome (bubbles); signin/, signup/ open it with the panel up
  about/, for-creators/, how-it-works/, not-found.tsx         marketing
  onboarding/             one onboarding (order / make / both)
  creators/, creators/[handle]/, creators/[handle]/commission/ discovery, profile, direct order
  home/                   the reels feed
  explore/                Creators | Orders tabs (cards)
  work/, work/[id]/       merged dashboard (Ordered | Making) and the commission workspace
  orders/, orders/new/, orders/[id]/   orders you placed; type picker + wizards; one order page
                          (owner manages pitches/slots; others read, pitch or take a slot)
  pitches/, messages/, profile/ (+edit/), wallet/, billing/, products/ (+new, [id]), saved/, settings/
components/
  ui/        design-system primitives ported from V10 (Block, PillButton, Sheet, Toast, Character…)
  shell/     AppRoot (+simulation tick), SiteHeader, BottomBar, AppShell, PublicShell, AccountSheet,
             NotificationsSheet, SiteFooter, nav (desktop: Home, Discover, Work, Messages, Profile;
             phone `mobileNav`: Home, Work, Discover, Inbox, Profile)
  domain/    shared marketplace pieces (VideoThumb, VideoPlayer, CreatorCard, RequestCard,
             CommissionCard, StageTrack, ThreadView, BriefSummary, FitPanel, PriceSummary, badges…)
  feed/      reels feed (items, reels, light canvases, details layer, Create sheet, gestures)
  landing/   signed-out welcome (bubble field, reel preview, scene)
  campaigns/ campaign wizard, owner view, take-a-slot view, sheets
  work/      Work page blocks;  explore/  Explore page;  account/  creator setup sheet, profile hub
  <feature>/ requests, commission, inbox, money, settings, business, products, creator, discovery,
             marketing, auth
lib/
  types.ts       domain model (read this first): Account, Creator.socials, ContentRequest.campaign…
  taxonomy.tsx   formats, platforms, dialects, niches, add-ons, status labels, fee constants,
                 follower tiers and campaign constants (incl. the PM's deferred placeholders)
  data/          seed data (fictional people/companies); `index.ts` exports accounts + everything;
                 `campaigns.ts` seeds the UGC campaigns and their slot commissions
  store.ts       client store: useDemo(), useHydrated(), useTyping(), actions.* (all mutations),
                 activeIds()/activeAccount(), simulationTick()
  selectors.ts   pure derivations: me.*, sideOf, fit, earnings (incl. pending), receipts, campaigns…
  campaigns.ts   pure campaign logic (slots, eligibility, money) shared by store and selectors
  contact.ts     contact masking (in-platform only)
  paths.ts       every in-app URL
  format.ts      money/date/duration formatting; clock.ts the demo clock (+ monthKey/endOfMonth);
                 prefs.tsx theme + session; saved-accounts.ts this device's sign-in list
app/globals.css  Tailwind v4 + the design system (tokens, blocks, pills, chips, forms, motion, reels)
app/styles/      landing.css, auth.css (imported by globals.css)
```

Data flow: `lib/data` seed → copied into the store on first load → persisted to localStorage
(`yapp-demo-v1`). Pages call `useDemo()` and derive with selectors; they mutate only through
`actions.*`. Bump `VERSION` in `lib/store.ts` when the seed shape changes (old saved state is
discarded). Per-account data lives in records keyed by account id (`saved`, `settings`,
`requestDrafts`, `hidden`); cards and payouts carry `businessId` / `creatorId`; notifications carry
`accountId`. "Who is acting" is `activeIds(s)` / `me.ids(s)`; never assume a creator profile
(`me.creator(s)` can be undefined: show `CreatorSetupSheet`).

## Conventions (summary — full rules in DESIGN.md)

- Exactly **one neon action per screen**; pastels carry meaning (lavender = fit/AI, butter =
  money/progress, sky = trust/protection).
- Use the system components and `y-` classes; colours only via tokens so dark mode works.
- Signed-in pages wrap in `<AppShell>` (`focus` for wizards, `fullscreen` for the feed); public pages
  in `<PublicShell>`; structure with `Page` / `PageHeader` / `SectionLabel`.
- Link only through `lib/paths.ts` (no hard-coded app routes). Derive the viewer's side with
  `sideOf(s, item)`; no self-dealing (nobody pitches on, takes a slot on, or orders from themselves).
- Dynamic routes: `useParams()`; ids created at runtime exist only after hydration — show a
  skeleton while `!useHydrated()`, a not-found `EmptyState` after.
- `useSearchParams()` consumers must be inside `<Suspense>`.
- Copy: plain, warm, specific, sentence case, no emoji. Status = icon + label.
- Lint is strict (React Compiler rules). Derive state during render instead of syncing it in
  effects; use `useSyncExternalStore` for browser-only values.

## Deployment (GitHub Pages)

The app must stay **static-exportable**. `npm run build:pages` (`GITHUB_PAGES=true`) switches
`next.config.ts` to `output: "export"`, `trailingSlash`, and `basePath` from
`NEXT_PUBLIC_BASE_PATH` ("/yap" on `saadals.github.io/yap`). The workflow
`.github/workflows/deploy-pages.yml` builds and deploys on push to `main` (Pages source must be set
to "GitHub Actions" in repo settings). Rules that keep it working:

- No server-only APIs: no `cookies()`/`headers()`, route handlers, server actions, middleware or
  `next/image` optimisation. Theme/session are read in the browser (`lib/prefs.tsx`, with a
  pre-paint script from `lib/site.ts` in the root layout).
- Every dynamic segment needs `generateStaticParams`. They live in each segment's `layout.tsx`
  using `lib/static-params.ts` (seed ids + `RUNTIME_SLOTS` sequential slots per prefix: 40 orders,
  200 commissions, because every campaign slot and reassignment is a commission, 30 products; plus
  each demo account's reserved creator handle). Ids for requests, commissions and products created
  in the browser are sequential (`r-n1`, `c-n1`, `p-n1`) so they land on a pre-rendered page. Add a
  new dynamic route → add its layout with params.
- Never hard-code the origin or a leading "/" in raw URLs. `<Link>` and `router` add the base path;
  for copy-link/share text use `absoluteUrl()` from `lib/site.ts`.
- `useSearchParams()` consumers must sit inside `<Suspense>` (the export fails otherwise).

## QA tooling

```bash
npm run build && npx next start -p 3123            # QA runs against a production server
npm run qa:sweep                                   # every route × 3 sessions (signed out / Nour / Layla+dark) + 404s
npm run qa:flow scripts/qa/flows/core-loop.json    # scripted browser flow (headless Chrome via CDP)

# Against a running dev server (only one `next dev` per project — reuse it, e.g. port 3000):
BASE_URL=http://localhost:3000 node scripts/qa/cdp.mjs scripts/qa/flows/core-loop.json

# Exactly as GitHub Pages serves it (static export under /yap):
NEXT_PUBLIC_BASE_PATH=/yap npm run build:pages
mkdir -p /tmp/site && ln -sfn "$PWD/out" /tmp/site/yap && python3 -m http.server -d /tmp/site 4100 &
scripts/qa/sweep.sh http://localhost:4100/yap
BASE_URL=http://localhost:4100/yap node scripts/qa/cdp.mjs scripts/qa/flows/cross-role.json
```

`scripts/qa/cdp.mjs` is a dependency-free Chrome DevTools driver: it clears the app's storage,
sets the account/theme cookies (`account: "nour" | "layla"` per flow), then runs steps (`go`,
`click` by visible text (prefers on-screen controls), `type`, `text` / `notText` assertions,
`eval`, `shot` → `.qa/shots/`, `account` to switch the signed-in demo account, `key`, and `swipe`
for touch gestures in `mobile` flows). Flows in `scripts/qa/flows/`:
`core-loop` (approve → pay → review → learning saved → commission again → creator wallet),
`cross-role` (Layla pitches → Nour hires → Layla delivers → Nour reviews, switching accounts),
`request-wizard`, `simulated-delivery`, `visual` (dark-mode screenshots), `account-switch`,
`campaign-owner` (publish → creators join → approve / changes / reject → slot reopens → tier
change once), `campaign-creator` (Layla takes a slot on Daftar's campaign → review copy → Nour
approves → post → verified → month end → withdrawable), `feed-mobile` (swipes on the reels feed),
`welcome-signin` (welcome → button → phone and code → feed → log out → saved account → back in),
`masking`, and `route-smoke-nour` / `route-smoke-layla` (every route in a real browser, catching
runtime errors the curl sweep can't). Read a screenshot with your image viewer to check layout.
Use these after any change to flows. Flows click by visible label, so renaming a button means
updating the flow JSON. `.qa/` (screenshots, Chrome profiles) and `out/` are gitignored and
excluded from ESLint/TypeScript.

## Status (updated 8 Nov 2026, after feedback round 2)

**Round 2 built and verified.** The signed-out bubble welcome; one sign-in and sign-up flow with
saved accounts; the full-bleed phone feed with light canvases, the in-feed details layer and the
Create sheet; the glass tab bar with Inbox (Messages | Alerts); the Profile hub's Account row.
`typecheck`, `lint`, `build` and `build:pages` are clean; the static export (395 pages) was served
under `/yap` and `qa:sweep` (52 routes × 3 sessions) passes. All 13 flows pass, with one caveat:
flows use fixed waits, so under CPU load one occasionally fails on its first page load and every
later step cascades (seen on `masking`, `welcome-signin`, `campaign-owner`; each then passed
repeated reruns). If only one flow fails from its first step, rerun it before debugging.
Not verified: a real phone or GPU (safe areas, the Back gesture, smoothness of the bubble scene
behind the blurred sign-in), and RTL.

**Round 1, still in place.** One account type with switchable demo people; the reels Home feed; Explore
(creators | orders); Work (Ordered | Making); one order page per order (custom request or UGC
campaign, owner vs everyone else); the campaign wizard, owner view (slots, review copies, remove
creator, reject, tier change once, close) and take-a-slot view; campaign slots in the commission
workspace (watermarked review copy, approve with a quick rating / ask for changes / reject, post
step with simulated verification); the wallet with pending earnings and the "Jump to month end"
demo control; connected social accounts with verified followers; the creator-profile setup sheet;
contact masking; billing with campaign ledger lines; one onboarding (order / make / both); merged
settings and profile hub.

**Session history.**
1. First build: lead agent wrote the foundation (`lib/`, `components/ui|domain|shell`, design
   system); 9 subagents built the feature areas (`components/<feature>/`).
2. Owner feedback: "cluttered, too much going on at once". Lead added the "Calm first" rules
   (DESIGN.md) and simplified the shared cards/header; 7 subagents simplified every area with
   before/after screenshots (dashboards 9 → 4–5 blocks, pitch review as compact rows + side sheet,
   commission workspace as one header + one review area + one Details card, landing 10 → 8
   sections, etc.).
3. GitHub Pages: static export, client-side prefs, pre-rendered dynamic routes, deploy workflow.
   The owner's first Actions run failed because only the workflow and `build:pages` script were
   committed (not `next.config.ts` and the rest) — the workflow now fails early with a clear
   message if `out/` is missing.
4. PM feedback round 1 (`docs/`): plan approved by the owner (accounts fully merged, campaigns
   alongside custom requests, no campaign fee, feed contents left to us). Lead rewrote `lib/`
   (accounts, paths, campaign model, store actions, simulation, masking, selectors), the shell and
   shared domain pieces; 6 subagents built Work/workspace/messages, orders/Explore/pitches, campaign
   UI, discovery/products/wallet/billing, accounts/onboarding/settings/marketing, and the feed. The
   old `/business/*` and `/creator/*` routes were removed (no redirects).
5. Feedback round 2 (`feedback_docs/`): owner approved a plan that kept most of it and changed what
   contradicted the app (see the decisions table). Lead wrote the foundation (glass tokens, safe
   areas, logout and saved accounts, nav); 3 subagents built the feed and tab bar, the welcome, and
   sign-in. The email and password sign-in screens were removed; the previous landing moved to
   `/about`.

**Known gaps and simplifications (deliberate for a prototype):**
- No backend, auth, payments, uploads, media, social APIs or post verification: all simulated. Store
  is client-only (localStorage key `yapp-demo-v1`; saved state carries `VERSION` 3). Billing legal
  name/VAT/country live in `yapp-billing-details-v2`, keyed by buyer profile (cleared by Reset).
- The signed-in account is tab-local; a new tab opens as the last account signed in (cookie).
- Onboarding: "Make videos" continues as Layla and saves nothing; "Order videos" saves the product
  and continues as Nour; "Both" also creates Nour's creator profile (handle `nourhaddad`). Sign-up
  doesn't create new accounts (prototype).
- Connected accounts get a deterministic simulated follower count per handle (6K–36K), so some
  handles qualify for a campaign tier and some don't.
- Campaigns: no drafts/autosave (they publish in one go); removing a creator has no undo; the
  explainer is a simulated file (no playable video); seeded campaigns never move on their own
  (only campaigns created in the browser are simulated).
- The UI is English-only. A full Arabic UI locale isn't implemented (CSS is RTL-ready; the feed's
  swipe mirrors under `dir=rtl`).
- Marketing stats that can't be derived from the store are constants in
  `components/marketing/platform.ts`.
- Store gaps the agents worked around: no "uninvite" action; asking for changes after the
  included revisions are used doesn't charge the extra-revision price (the cost is explained in
  copy only); delivery notes are visible to the creator immediately (no draft state); creator
  alert preferences (formats/dialects), auto-reply text and sign-in devices are local component
  state only.
- Creator earnings: seeded payouts represent work before the seed window. `creatorEarnings()` in
  `lib/selectors.ts` estimates earlier lifetime/monthly figures deterministically. See its comment.
- Round 2 limits: sign-in is simulated (Instagram's Creator-or-Business rule is a static note, not
  a tested error); white feed tab words get faint on very bright video frames (the spec's soft
  shadow, kept as asked); feed tab rows are 32px, under the 44px rule; the bubble field repeats its
  16 seed creators more closely than the spec's 15-unit spacing on desktop.
- A long-running `next dev` keeps the old route list in `.next/dev/types`; if `npm run build` fails
  on `.next/dev/types/validator.ts`, delete that folder (or restart the dev server) and rebuild.

**Open questions for the PM (placeholders in `lib/taxonomy.tsx`):**
1. Campaign delivery deadline and how late delivery is handled (`CAMPAIGN_DEADLINE_DAYS`).
2. Penalty for repeated rejections, and who it applies to (`CAMPAIGN_REJECTION_PENALTY`).
3. Maximum reassignments of one slot (`CAMPAIGN_MAX_REASSIGNMENTS`).
4. Prices for tiers above 50K (placeholders $50 / $60 / $75), and whether a campaign fee comes later.
5. Assumptions made here, to confirm: tier change applies to open slots only (taken slots keep
   their price; a reopened slot uses the current price); review copies auto-approve after 3 days;
   closing a campaign refunds open slots while slots in progress continue; eligibility = verified
   followers on the campaign's platform within the tier band.
6. Round 2 calls to confirm with whoever wrote the specs: Inbox instead of dropping Messages; "Make
   Yapps" instead of "Get Yapps (UGC Campaign)"; bubbles for signed-out visitors only on desktop too.
7. Whether "Yapp" replaces "video" across the whole app (today: feed and campaign surfaces only).

**Suggested next steps (owner to prioritise):**
1. Review round 1 with the owner and PM: answer the open questions above, tune the feed mix
   (`components/feed/feed-items.ts`), campaign copy and tier prices, economics (fee %,
   auto-approve days) and the launch format/dialect set in `lib/taxonomy.tsx`. Stay front-end only
   until the prototype is approved.
2. Backend: the types in `lib/types.ts` map to tables; replace `actions.*` in `lib/store.ts` with API
   calls (keep the selectors). Real auth (business vs creator accounts, team members).
3. Payments with escrow-style holds: a MENA-friendly processor with mada and Apple Pay support,
   plus creator payouts (IBAN / wallet) and VAT invoices.
4. Real video: uploads (resumable), transcoding, a real player with frame-accurate timestamped
   notes, and caption files.
5. Arabic UI locale (`dir="rtl"`; the `[dir=rtl]` type rules already exist in `app/globals.css`).
6. Trust and safety: ID verification, dispute workflow for Yapp support, content usage-rights
   records per commission.
7. Analytics on the success metrics in the brief: completed commissions, satisfaction, repeat
   purchases, coordination needed (messages per commission, revisions per commission).

Git: the owner commits and pushes their own changes. Round 1 is committed; at the end of the round
2 session all of round 2 was uncommitted on `main`. Check `git status` before assuming anything is
deployed.
