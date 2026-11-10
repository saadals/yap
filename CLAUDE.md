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

- Businesses (segment: **tech brands**, e.g. app makers; **US and Canada by default, built for a
  global audience**; the writeup's "Arabic-speaking audiences" was a starting hypothesis and was
  dropped in round 3) post a **content request** (product, audience, desired content, budget,
  deadline) or commission a creator **directly** from their profile.
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
  price per follower tier, first come first served, posted to the creator's own account; the pay
  rule was "month end" then and is now 7 days after a verified post, see round 3). Both docs are
  .docx in `docs/` (`textutil -convert txt -stdout`).
- **Feedback round 2 (`feedback_docs/`, Nov 2026)**: two specs and two HTML previews that redesign
  the phone feed and tab bar, the signed-out landing (creator bubbles) and sign-in. Most of it was
  built as written. Where it contradicted the app, round 1 or itself, it was changed; the table
  below says how and why. The specs remain the reference for the real auth, media and native work.
- **Feedback round 3 (`feedback_docs_2/`, Nov 2026)**: three specs (Discover, Site-wide, Work), two
  HTML previews, a brand package (new logo, colours, brand book) and a legal pack of 12 drafts. The
  specs contradict each other heavily, and the owner suspects they were sent as examples to draw
  from, not as a spec. So the round is split: **stage 1 (built)** is what holds under both readings:
  the new logo, the new look on every existing page with layouts unchanged, the legal pack's rules,
  and the market switch. **Stage 2 (on hold until the sender answers)** is every new page and
  redesign. The full review, with file and section for each conflict and the questions for the
  sender, is `feedback_docs_2/ROUND_3_DOCUMENT_ISSUES.md`; the approved plan is
  `~/.claude/plans/checkout-the-feedback-docs-2-feedback-do-bubbly-wall.md`.

## Decisions already made (and why) — don't relitigate without the owner

| Decision | Why |
| --- | --- |
| **Round 3 feedback is direction, not a spec** (owner's guess, unconfirmed). Firm either way: the brand package and the legal pack's rules. Everything else in the three specs and two previews is on hold as stage 2 | The documents carry four different logos, two files both called "Part 6" and two pay rules. Only the sender can say what they are; the questions are at the end of `feedback_docs_2/ROUND_3_DOCUMENT_ISSUES.md`. Don't build stage 2 pieces (Discover, the Work redesign, the single wizard, two-way comments, Productivity, Services, footer and More page, tab reorder, feed leaving desktop) until the owner says so. |
| The logo is the brand package's **clapper over a speech bubble, wordmark "yapping"**, rendered only from the master SVGs in `public/brand/` through `components/ui/brand.tsx` (never redrawn, retyped, recoloured or minified). **Interface copy still says "Yapp"** | Brand spec: "Yapp" is filed by others and "Yapping" isn't legally cleared, so only the logo changed. The header reads "yapping" above pages that say "Yapp" on purpose. `tone="auto"` renders the light and on-dark files and CSS shows one (`html.dark`, `data-reel-tone`); `asset()` in `lib/site.ts` adds the base path (the package's own component 404s under `/yap`). |
| Styling is the **brand package's look** (round 3): #F7F7F9 canvas, white cards with a soft shadow, pills, Inter 400/500/600, light big numbers, the dark primary button (green on hover), glass header and sticky bars, five status-chip looks. Layouts are still our own. It replaced the V10 "Stack" styling of the first build; class names (`y-`, `.yapp`) are unchanged | Owner's rule from the first build still holds: a design reference means colour and styling, not layout. Deliberate departures from the package's values: paper stays opaque (90% white shows content through sheets and sticky bars); readable text never uses `--y-ink-3` (2.6:1); success, danger and warning text are darker than the package's so chips reach 4.5:1; dark mode is kept with derived values (the package has none). Details in DESIGN.md. |
| **Pastels are illustration-only** (characters, avatars, reel covers). The `lavender` / `butter` / `sky` block tones render as plain white; an icon and a label carry what the colour used to mean. **One green action per view** | Brand book: "Green is a signal, not a wallpaper… one primary action per view", no extra brand hues. Don't use the pastel tones for new blocks (`paper` instead). |
| **Market: US and Canada by default, built for a global audience** (owner, round 3). English, US dollars, +1, US date formats, Eastern demo clock. Nothing in copy or controls limits anyone by country. A **video language** list (English, Spanish, French, Arabic, Portuguese, Hindi, Korean, Chinese) replaced the eight Arabic dialects; a video that isn't in English shows a translation toggle | All of round 3's documents target tech brands in the US and Canada; the owner added "global". The legal pack limits accounts to the US and Canada outside Quebec, which is narrower: the prototype doesn't enforce it. The CSS stays RTL-safe (`[dir=rtl]` rules kept); Arabic text falls back to system fonts. |
| Launch content set: **8 formats** (app demo, screen walkthrough, unboxing, problem → solution, comparison, testimonial, talking head, voiceover) **plus the ad hook pack**, and **8 tech categories** (AI tools, consumer apps, SaaS & B2B, fintech, gadgets & audio, gaming, health tech, e-commerce tech) | The round 3 documents' lists; the legal pack names the formats. The hook pack stays as a format until stage 2 decides whether it becomes a service. Physical products are never shipped: briefs say the creator needs their own or works from the companion app. |
| Economics: creators keep **100%**; the business pays a **10% service fee on custom orders, direct orders and campaigns**, charged with the payment (at hire, or when a campaign is published), **held**, and refunded with it; **released on approval**; **auto-approve 3 days** after delivery (campaign review copies too); full refund if not delivered; price limits **$30 to $5,000 per video**, $30 minimum pitch, $50 minimum budget; organic usage rights always included, **paid-ads usage is an add-on** (the legal pack's four usage options are a stage 2 question) | Writeup: "simple and dependable". Round 3: the legal pack's numbers, which the owner chose to follow (campaigns had no fee before). Constants in `lib/taxonomy.tsx` (`SERVICE_FEE_RATE`, `CAMPAIGN_FEE_RATE`, `PRICE_MIN_PER_YAPP`, `PRICE_MAX_PER_YAPP`, `PITCH_MIN`, `AUTO_APPROVE_DAYS`); `priceLimits()` in `lib/format.ts`. |
| **The legal pack's drafts are not published.** `/legal` lists the twelve documents as "in legal review" with no text; the zip is in `.gitignore` | Owner's choice: the pack's own readme requires a lawyer's review first, and the zip contains a file marked do-not-publish. The app follows the pack's rules and numbers anyway. |
| **Brands are shown by reliability** (review speed, share of versions approved by the timer, hires), not a star rating. `Business.reliability`, `reliabilityLine()` | Legal pack: a creator's feedback about a client is private; the app used to show a seeded "client rating" beside that promise. |
| Seed brands and people are **invented names**, checked by web search against the same field: Roundleaf, Tablecrew, Notewren, Wayfolk, Brindle, Wrenlow Audio, Pixel Arcade (plus Daftar, Qalamy, Wasla and Souqly from the first build) | The Discover spec's "fictional" list included real companies (Fynd, Stackline) and a real earbuds product name (Orbit); the Work preview used real companies as customers. No real company is ever a customer or a subject; payment options are generic ("Bank account", "Digital wallet"). |
| **Product profiles + learnings** carried into every new brief and "Commission again" | Writeup: "product context and previous feedback carrying forward into subsequent commissions". |
| **One account type** (PM round 1): every account can order (its buyer profile, `businessId`: a company or the person themselves) and make videos (its creator profile, `creatorId`, once set up). "Role" (`business`/`creator`) is only **the viewer's side of a deal**, derived per item with `sideOf()`. A "Business account" (company, invoices with a tax ID, team) is an optional upgrade | PM: "no need for two types of accounts… like Instagram". Owner chose the fully merged app over a mode switch. |
| Two demo people sharing **one store**: **Nour Haddad** (business account, Daftar, Toronto; no creator profile until she sets one up) and **Layla Mansour** (personal account, buyer profile `b-layla`, creator @laylatalks, Vancouver, English and Arabic). Account sheet (desktop: avatar; phone: Profile tab → Account) → **Switch account (demo)**. The signed-in account is **tab-local** (sessionStorage), so two windows can play both sides | Lets a reviewer play both sides; actions by one show up for the other. |
| Other creators **auto-respond** (simulated replies, auto-accept offers after ~7s, auto-deliver versions after ~20–25s). Never for a demo person (`isDemoCreator`): switch account to answer as them. Campaigns created in the browser are driven by a resumable `simulationTick` (mounted in `AppRoot`, one visible tab at a time): creators join every ~6s (stopping one slot short while Layla could still join), upload review copies after ~16s, redo them after changes, and post approved videos; post verification takes ~3s | So the flows can be demoed end to end. See `scheduleReply` / `simulateDelivery` / `simulationTick` in `lib/store.ts`. Seeded campaigns stay still (deterministic QA). |
| **Fixed demo clock** (`NOW` = Wed 4 Nov 2026 10:00 Eastern, `lib/clock.ts`); dates display in a fixed UTC−5 zone (`Etc/GMT+5`, so there is no daylight-saving logic) and in US formats ("Nov 7", "2:30 PM") | Deterministic UI and no server/client hydration mismatches. Never use `new Date()` in render. Because the clock never moves, nothing happens "by itself" on a date: auto-approval, the 14-day campaign window and upload deadlines are shown but not enforced, and "Skip 7 days (demo)" stands in for time passing on campaign pay. |
| **No real media**: `VideoThumb` composes generated scenes (creator face, mock phone/laptop UI, palette tints; a microphone for voice-only videos); `VideoPlayer` simulates playback against each video's script with captions, plus a translation for videos that aren't in English | No assets/backend; still makes portfolios, pitches and delivery review feel real. |
| Session/theme in **cookies** (`yapp_account`, `yapp_theme`, `yapp_logged_out`), read in the browser (`lib/prefs.tsx`) plus a pre-paint script that sets the theme and a `y-session` class on `<html>` | Static-exportable, so no middleware (the spec asked for it): `y-session` hides the welcome before paint while the client redirects to the feed. Which account a tab acts as lives in the store (`activeAccountId`, tab-local). A signed-in page opened from a shared link signs the visitor in; after a real logout it goes to the welcome instead. |
| **Calm over complete**: one job per screen, ≤5 blocks on dashboards, quiet cards (one meta line, ≤2 badges), details behind a click, nothing said twice | Owner feedback after the first build: "cluttered at times, too much going on at once". Rules are at the top of DESIGN.md ("Calm first"); a simplification pass applied them everywhere. Don't add blocks back to make screens "complete". |
| **Home is a reels feed** (`/home`). Phones: full-bleed reels with no header; logo and "+" (Create sheet) float on top, Mix · Yapps · Orders stack on the right, the name sits top start, and text, fades and tab icons follow the reel (`data-reel-tone` on `<html>`). Desktop keeps the header and a 9:16 column. Creator videos get **Order**; orders and campaigns are light canvases with tappable characters and a topic prop, with **Pitch** / **Make a Yapp** ("N of T remaining" inside the button). Pill, swipe left or keyboard opens an in-feed details layer with a sticky button (`?details=`, so Back closes it). The old dashboards became **Work** (`/work`) | PM round 1: card lists let people skim past offers. Round 2 restyled it. Deliberate changes from the spec: "Make a Yapp" (the spec also wrote "Make Yapp now"), "Order from Layla" (not "Commission"), slot bar only in details (the chip already says it), "Your Yapp · due {date}" once you hold a slot (the brand sets the deadline since round 3), ⋯ moved to the bottom row (its corner now holds "+" and the tabs), tab icons follow the reel (ink on clear glass was about 2:1 on dark video), safe-area guide 880 × 1600 (phones crop the sides, not the top). |
| **Signed-out welcome** at `/`: a field of creator bubbles (`components/landing/`), hover or tap for a two-video preview, two buttons, glass nav. **Signed-out only on both phone and desktop**; `/signin` and `/signup` are the same scene with the panel open. The previous marketing page moved to `/about` | Round 2. The spec kept bubbles as the signed-in desktop home; a returning buyer needs their work and the feed, so desktop goes to `/home`. To follow the spec literally, change the redirect in `components/landing/welcome-scene.tsx` and `homeFor` in `nav.tsx`. A one-line description and "What is Yapp?" were added because the spec's page never says what Yapp is; the signed-out nav keeps public links instead of Work/Messages/Profile. |
| Welcome buttons are **Ask for Yapps** and **Make Yapps** | The spec's "Get Yapps (UGC Campaign)" was marked "assumption; confirm" and read as a buyer action (campaigns are something a business buys), leaving creators no clear way in. The button sets only where you land and, in the demo, who you become (Ask = Nour, Make = Layla), never an account type (round 1 merged accounts). |
| Phone bar: **Home · Work · Discover · Inbox · Profile**. Inbox holds Messages and Alerts (`/messages?tab=alerts`). Desktop keeps the Messages link and bell; "Discover" is the label on both (route stays `/explore`). Profile opens the hub; its Account row opens the account sheet | The spec dropped Messages because "there is no messaging yet", but messaging is built and central, and the desktop spec kept it. Inbox is the spec's own plan for when messaging exists. A tab can't both navigate and open a sheet, and the sheet alone would hide Wallet, Billing and Products. |
| **One sign-in and sign-up flow** (`components/auth/sign-in-panel.tsx`): phone and code first (default +1 since round 3, with a global country list), then Apple, TikTok, Instagram, Google, all simulated; **saved accounts** in `lib/saved-accounts.ts` (seeded with Nour and Layla, which replaces the old demo tiles); "Log out" keeps the row, "Log out and forget" removes it. Full glass page on phones, side panel on desktop | Round 2 (which defaulted to +966 while the market was Arabic-speaking). Email and password screens were retired. The spec has no first-run step; "New here?" keeps `/onboarding` reachable, and real auth will need it. |
| **Glass floats, content doesn't**: glass is for the welcome, sign-in, the reels chrome and details, and since round 3 the header pill, the tab bar and sticky or fixed bars (`.y-glass`, `.y-bar`, `--y-glass*`). Cards, sheets and page content stay solid | Round 2's specs scoped glass to the first group; the brand package adds "glass that floats". Cards and sheets must stay opaque or content shows through. |
| **No 3D or animation libraries**: the bubble field is pooled DOM elements with a small perspective calculation | The spec listed three, R3F, drei, framer-motion, hls.js and simplex-noise, but its own preview only draws flat camera-facing sprites with fog. This reuses `FaceAvatar`, follows dark mode and needs no WebGL fallback. |
| **UGC campaigns** sit **alongside** custom requests and direct orders ("New order" asks the type first). Min 10 videos, steps of 5, one creator per video; tier sets the price (10–20K $30, 20–50K $40; higher tiers are placeholders); budget **plus the 10% fee** held up front; the brand picks an **upload deadline** (2, 3, 5, 7 or 10 days after a slot is taken) and the campaign shows a **14-day window**; eligible creators (verified followers within the tier, via a read-only connected account) take slots first come, first served; the business can remove a creator or reject a video and the slot reopens automatically; approved money is **pending** in the creator's wallet and is released **7 days after the post is verified** (tag + paid-partnership disclosure) if it is still up, with the post kept up for 30 days; tier can change once (taken slots keep their price) | PM spec "UGC Campaign Flow", then round 3's legal pack for the fee, the deadline, the window and the pay rule (the owner chose 7 days over the Work spec's "month end"). Constants in `lib/taxonomy.tsx` (`CAMPAIGN_*`). Still `null` placeholders: repeated-rejection penalty, max reassignments per slot. |
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
**Switch account (demo)**, **Skip 7 days (demo)** (releases pending campaign earnings whose posts
are verified and live; `actions.skipSevenDays()`), **Reset demo data** (restores the seed and the
saved accounts).

## Architecture

```
app/                      Next.js App Router pages (all client pages read the store); one set of
                          routes for every account (lib/paths.ts), pages adapt to the viewer's side
  page.tsx                the signed-out welcome (bubbles); signin/, signup/ open it with the panel up
  about/, for-creators/, how-it-works/, not-found.tsx         marketing
  legal/                  one page listing the legal documents as "in legal review" (no text)
  favicon.ico, icon.png, apple-icon.png, manifest.ts          app icons from the brand package
  onboarding/             one onboarding (order / make / both)
  creators/, creators/[handle]/, creators/[handle]/commission/ discovery, profile, direct order
  home/                   the reels feed
  explore/                Creators | Orders tabs (cards)
  work/, work/[id]/       merged dashboard (Ordered | Making) and the commission workspace
  orders/, orders/new/, orders/[id]/   orders you placed; type picker + wizards; one order page
                          (owner manages pitches/slots; others read, pitch or take a slot)
  pitches/, messages/, profile/ (+edit/), wallet/, billing/, products/ (+new, [id]), saved/, settings/
components/
  ui/        design-system primitives (Block, PillButton, Badge, Sheet, Toast, Character…) and
             brand.tsx (Brand, Lockup, BrandMark, Wordmark: images of the master SVGs, never drawn)
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
  taxonomy.tsx   formats, platforms, languages, categories (niches), add-ons, status labels and
                 their chip tones, fee and price constants, follower tiers and campaign constants
                 (incl. the PM's deferred placeholders)
  data/          seed data (fictional people/companies); `index.ts` exports accounts + everything;
                 `campaigns.ts` seeds the UGC campaigns and their slot commissions. Rewritten in
                 round 3 for the new market; ids of requests, commissions, pitches and reviews
                 are unchanged since round 1
  store.ts       client store: useDemo(), useHydrated(), useTyping(), actions.* (all mutations),
                 activeIds()/activeAccount(), simulationTick()
  selectors.ts   pure derivations: me.*, sideOf, fit, earnings (incl. pending), receipts, campaigns…
  campaigns.ts   pure campaign logic (slots, eligibility, money) shared by store and selectors
  contact.ts     contact masking (in-platform only)
  paths.ts       every in-app URL
  format.ts      money/date/duration formatting (`money`, `moneyExact`, `priceLimits`, `quoted`,
                 `plural`, `timeAgoInline`…); clock.ts the demo clock (`at`, `localDay`, `atLocal`);
                 prefs.tsx theme + session; saved-accounts.ts this device's sign-in list;
                 site.ts base path, `asset()` for files in public/, the pre-paint script
app/globals.css  Tailwind v4 + the design system (tokens, blocks, pills, chips, forms, motion, reels)
app/styles/      landing.css, auth.css (imported by globals.css)
public/brand/    the 11 logo master SVGs, byte-identical to the brand package (checksums in
                 feedback_docs_2/Yapping-Developer-Brand-Package/CHECKSUMS.txt); icon-192/512.png
```

Data flow: `lib/data` seed → copied into the store on first load → persisted to localStorage
(`yapp-demo-v1`). Pages call `useDemo()` and derive with selectors; they mutate only through
`actions.*`. Bump `VERSION` in `lib/store.ts` when the seed shape changes (old saved state is
discarded). Per-account data lives in records keyed by account id (`saved`, `settings`,
`requestDrafts`, `hidden`); cards and payouts carry `businessId` / `creatorId`; notifications carry
`accountId`. "Who is acting" is `activeIds(s)` / `me.ids(s)`; never assume a creator profile
(`me.creator(s)` can be undefined: show `CreatorSetupSheet`).

## Conventions (summary — full rules in DESIGN.md)

- Exactly **one green action per view**. Pastels are illustration-only: blocks are white (`paper`),
  one dark block (`night`) for a stage moment, and meaning comes from an icon and a label.
- Status chips have five looks: waiting = `neutral`, moving = `active`, done = `success`, needs
  attention = `warning`, negative or closed = `danger`. The side that has to act sees "needs attention".
- The logo comes only from `components/ui/brand.tsx`; static files in `public/` go through `asset()`.
- Use the system components and `y-` classes; colours only via tokens so dark mode works.
- Signed-in pages wrap in `<AppShell>` (`focus` for wizards, `fullscreen` for the feed); public pages
  in `<PublicShell>`; structure with `Page` / `PageHeader` / `SectionLabel`.
- Link only through `lib/paths.ts` (no hard-coded app routes). Derive the viewer's side with
  `sideOf(s, item)`; no self-dealing (nobody pitches on, takes a slot on, or orders from themselves).
- Dynamic routes: `useParams()`; ids created at runtime exist only after hydration — show a
  skeleton while `!useHydrated()`, a not-found `EmptyState` after.
- `useSearchParams()` consumers must be inside `<Suspense>`.
- Copy: plain, warm, specific, sentence case, no emoji, no exclamation marks; Canadian spelling
  with "-ize" (colour, centre, authorized). Status = icon + label.
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
mkdir -p /tmp/site && ln -sfn "$PWD/out" /tmp/site/yap && python3 -m http.server -d /tmp/site 4100 &   # any empty folder works
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
approves → post → verified → skip 7 days → withdrawable), `feed-mobile` (swipes on the reels feed),
`welcome-signin` (welcome → button → phone and code → feed → log out → saved account → back in),
`masking`, and `route-smoke-nour` / `route-smoke-layla` (every route in a real browser, catching
runtime errors the curl sweep can't). Read a screenshot with your image viewer to check layout.
Use these after any change to flows. Flows click by visible label, so renaming a button means
updating the flow JSON. `.qa/` (screenshots, Chrome profiles) and `out/` are gitignored and
excluded from ESLint/TypeScript.

Each run uses its own Chrome profile (about 35 MB) and deletes it when it ends. Before round 3 the
driver left them behind, and 395 of them filled 14 GB: if `.qa/profiles/` ever grows, a run was
killed mid-flight and the folder is safe to empty. Screenshots accumulate in `.qa/shots/`; the
round 3 sets are `r3b-*` (before the restyle) and `r3z-*` (after, from the static export).

Agents and the dev server pause while the Mac sleeps. A long multi-agent run needs the lid open,
and on battery `caffeinate -i` to stop idle sleep.

## Status (updated 9 Nov 2026, after feedback round 3, stage 1)

**Round 3, stage 1: built and verified. Stage 2 is on hold** until the owner hears from the
sender whether the round 3 documents are a spec or a direction (see the first row of the decisions
table).

Stage 1 is: the new logo, favicon, app icons and manifest; the new look on every existing page with
layouts unchanged (light and dark); the legal pack's rules (10% fee on campaigns, campaign pay 7
days after a verified post with a 30-day keep-live period, a brand-set upload deadline and a 14-day
campaign window, price limits, money wording, brands shown by reliability); the market switch
(languages, categories, formats, Eastern clock, US date formats, +1, and all seed data rewritten
from a shared story bible); the `/legal` page.

`typecheck`, `lint`, `build` and `build:pages` are clean. The static export (395 pages) was served
under `/yap`: `qa:sweep` passes (53 routes × 3 sessions) and all 13 flows pass against it
(`account-switch` on its second run: the first-page-load flake described below). The 11 exported
logo files match the brand package's checksums.

Not verified: a real phone or GPU (safe areas, the Back gesture, glass blur performance), RTL, and
the non-English seed scripts by a native speaker (the writer asked for a check of the Chinese,
Korean and Hindi videos and of three new Arabic passages: v-layla-5, and one line each in v-sara-2
and v-lina-1). The new bank-account fields in onboarding's payout step were type-checked but not
looked at in a browser.

**Round 2, still in place.** The signed-out bubble welcome; one sign-in and sign-up flow with
saved accounts; the full-bleed phone feed with light canvases, the in-feed details layer and the
Create sheet; the glass tab bar with Inbox (Messages | Alerts); the Profile hub's Account row.
One caveat on flows from that round still applies: they use fixed waits, so under CPU load, or as
the first run against a freshly started server, one occasionally fails on its first page load and
every later step cascades (seen on `masking`, `welcome-signin`, `campaign-owner`,
`account-switch`; each then passed on rerun). If only one flow fails from its first step, rerun it
before debugging. The same applies to screenshots: a first shot taken in a cold browser can be blank.

**Round 1, still in place.** One account type with switchable demo people; the reels Home feed; Explore
(creators | orders); Work (Ordered | Making); one order page per order (custom request or UGC
campaign, owner vs everyone else); the campaign wizard, owner view (slots, review copies, remove
creator, reject, tier change once, close) and take-a-slot view; campaign slots in the commission
workspace (watermarked review copy, approve with a quick rating / ask for changes / reject, post
step with simulated verification); the wallet with pending earnings and the "Skip 7 days" demo
control (it was "Jump to month end" before round 3); connected social accounts with verified followers; the creator-profile setup sheet;
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
6. Feedback round 3 (`feedback_docs_2/`), stage 1. The lead reviewed the documents (the review is
   `feedback_docs_2/ROUND_3_DOCUMENT_ISSUES.md`), the owner chose to build only what holds whether
   they are a spec or a direction, and asked for implementation by Opus subagents at xhigh effort.
   In order: brand and class-level restyle, in parallel with the money and campaign rules; the
   market switch (types, taxonomy, pickers, clock, phone, id renames); three page-by-page restyle
   sweeps, in parallel with a story bible for the seed data; four content writers working from the
   bible; a final polish pass. Two things went wrong and were fixed on the way: the lead's first
   cast used brand names from the Discover spec's "fictional" list that turned out to be real
   companies (renamed before the writers started), and the QA driver had been leaving a Chrome
   profile behind on every run (14 GB; it now cleans up).

**Known gaps and simplifications (deliberate for a prototype):**
- No backend, auth, payments, uploads, media, social APIs or post verification: all simulated. Store
  is client-only (localStorage key `yapp-demo-v1`; saved state carries `VERSION` 6). Billing legal
  name, tax ID and country live in `yapp-billing-details-v2`, keyed by buyer profile (cleared by
  Reset). Saved sign-in accounts live in `yapp-saved-accounts-v2`.
- Round 3 rules that are shown but not enforced, because the demo clock never moves: nothing
  auto-approves, a missed upload deadline triggers nothing (the brand can still remove a creator
  before an upload, which reopens the slot), and a campaign doesn't close itself after 14 days.
  Nothing in the interface can take a post down, so the "post removed" path (48 hours to restore,
  then the slot's money goes back and the slot reopens) is reachable only through the store, and
  the remedies for a post that comes down after payment aren't built.
- Round 3 leftovers: payouts are a bank account or a digital wallet with an optional routing
  number (there is no country field, so it can't be required); Settings still has a "Change
  password" button although sign-in is phone and code; offers have no reply deadline
  (`MARKETING.offerExpiryDays` is unused); a campaign's review copy reuses the creator's first
  portfolio video, so a slot's clip can show another brand's script; Layla has two completed
  commissions as a creator, which is thin for a statistics page; learning `ln-1` is dated before the
  results it mentions; the "Spent this month" card on Billing has a large empty area; card brands
  (Visa, Mastercard, American Express, Apple Pay) are named as accepted cards.
- The signed-in account is tab-local; a new tab opens as the last account signed in (cookie).
- Onboarding: "Make videos" continues as Layla and saves nothing; "Order videos" saves the product
  and continues as Nour; "Both" also creates Nour's creator profile (handle `nourhaddad`). Sign-up
  doesn't create new accounts (prototype).
- Connected accounts get a deterministic simulated follower count per handle (6K–36K), so some
  handles qualify for a campaign tier and some don't.
- Campaigns: no drafts/autosave (they publish in one go); removing a creator has no undo; the
  explainer is a simulated file (no playable video); seeded campaigns never move on their own
  (only campaigns created in the browser are simulated).
- The UI is English-only. No other locale is implemented (CSS is RTL-ready; the feed's swipe
  mirrors under `dir=rtl`). City pickers offer only the 17 seed cities and the billing country list
  only the 8 seed countries.
- Marketing stats that can't be derived from the store are constants in
  `components/marketing/platform.ts`.
- Store gaps the agents worked around: no "uninvite" action; asking for changes after the
  included revisions are used doesn't charge the extra-revision price (the cost is explained in
  copy only); delivery notes are visible to the creator immediately (no draft state); creator
  alert preferences (formats/languages), auto-reply text and sign-in devices are local component
  state only.
- Creator earnings: seeded payouts represent work before the seed window. `creatorEarnings()` in
  `lib/selectors.ts` estimates earlier lifetime/monthly figures deterministically. See its comment.
- Round 2 limits: sign-in is simulated (Instagram's Creator-or-Business rule is a static note, not
  a tested error); white feed tab words get faint on very bright video frames (the spec's soft
  shadow, kept as asked); feed tab rows are 32px, under the 44px rule; the bubble field repeats its
  16 seed creators more closely than the spec's 15-unit spacing on desktop.
- A long-running `next dev` keeps the old route list in `.next/dev/types`; if `npm run build` fails
  on `.next/dev/types/validator.ts`, delete that folder (or restart the dev server) and rebuild.

**Open questions.** The twelve for whoever wrote the round 3 documents are at the end of
`feedback_docs_2/ROUND_3_DOCUMENT_ISSUES.md`; the first decides everything else: is round 3 a
specification to build as written, or a direction to draw from? The ones that touch what is
already built:
1. Campaign pay: the Work spec says month end, the legal pack says 7 days after a verified post.
   Built: 7 days (owner's choice). One of the two documents has to change.
2. The legal pack serves the US and Canada outside Quebec only; the owner wants a global audience.
3. Usage rights: four options chosen per order (legal pack), "included" (Discover spec), or a
   priced add-on (the app today)?
4. "$5,000 maximum per Yapp" is applied per video, so a two-video pitch can reach $10,000. Confirm.
5. The name: when "Yapping" is cleared, does interface copy change from "Yapp"?
6. A missed campaign upload deadline: is "remove the creator, the slot reopens" the campaign
   equivalent of the legal pack's "cancel for a full refund"?
7. Still open from round 1 (placeholders in `lib/taxonomy.tsx`): penalty for repeated rejections
   (`CAMPAIGN_REJECTION_PENALTY`), maximum reassignments of one slot
   (`CAMPAIGN_MAX_REASSIGNMENTS`), prices for tiers above 50K ($50 / $60 / $75).
8. Still open from round 2: the Inbox tab instead of an Alerts tab with Messages behind Work;
   "Make Yapps" instead of "Get Yapps (UGC Campaign)".

**Suggested next steps (owner to prioritise):**
1. Review stage 1 with the owner. Send the sender `feedback_docs_2/ROUND_3_DOCUMENT_ISSUES.md` and
   get answers to its questions.
2. Stage 2, piece by piece, only as the answers come in. The approved plan lists each piece with
   the shape it should take if it is wanted: Discover as the desktop home with the feed on phones
   only; the Work sidebar and one job board; the redesigned job and order pages on the existing
   URLs; two-way comments on deliveries; one six-step new-order wizard that keeps the product
   picker and learnings; a Productivity page built on numbers the store can compute; a Services
   menu limited to what real flows back; footer and More page; the account dropdown with a single
   "Log out". Stay front-end only until the prototype is approved.
3. Ask a native speaker to check the Chinese, Korean, Hindi and new Arabic video scripts.
4. Backend: the types in `lib/types.ts` map to tables; replace `actions.*` in `lib/store.ts` with API
   calls (keep the selectors). Real auth (business vs creator accounts, team members).
5. Payments with held funds through a licensed provider (the legal pack requires it), plus creator
   payouts to bank accounts and wallets, and invoices with tax IDs.
6. Real video: uploads (resumable), transcoding, a watermarked review copy, a real player with
   frame-accurate timestamped notes, and caption files.
7. Trust and safety: ID and brand verification, the dispute process in the legal pack (reply in 48
   hours, decision, one appeal), daily post checks for campaigns, usage-rights records per order.
8. Analytics on the success metrics in the brief: completed commissions, satisfaction, repeat
   purchases, coordination needed (messages per commission, revisions per commission).

Git: the owner commits and pushes their own changes. Rounds 1 and 2 are committed; at the end of
the round 3 stage 1 session all of it was uncommitted on `main` (about 180 changed or new paths),
with `feedback_docs_2/` untracked. Check `git status` before assuming anything is deployed.
