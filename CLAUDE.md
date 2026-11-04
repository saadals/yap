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

## Decisions already made (and why) — don't relitigate without the owner

| Decision | Why |
| --- | --- |
| Name **Yapp**, speech-bubble mark with three typing dots (last one neon) | Suggested in the product writeup; playful; mark echoes the source design's "three blocks, last neon". |
| Styling from **design V10 "Stack"** in the owner's `jobPlatform/frontend` repo, branch `prototype/new-designs`, folder `app/newdesigns/v10` | Owner's instruction. **He clarified: colour and styling only, not layout.** Tokens/classes were ported and renamed `v10-`→`y-`, `.ndv10`→`.yapp`. Layouts are our own, designed for a marketplace. |
| **English-first UI**; Arabic appears where the product needs it (dialect choices, Arabic hooks/captions with English translations, Arabic names) | The UI's users are business teams; the *content* targets Arabic speakers. A full Arabic locale wasn't requested; the CSS stays RTL-safe (logical properties, `[dir=rtl]` rules kept) so it can be added. |
| Launch content set: **6 formats** (selfie demo, screen walkthrough, honest review, problem skit, how-to tutorial, ad hook pack), **8 languages/dialects** (Saudi, Khaleeji, Egyptian, Levantine, Iraqi, Darija, Fusha, English) | Writeup: "a specific customer segment and a manageable set of content formats", software demos for Arabic audiences. |
| Economics: creators keep **100%**; business pays a **10% service fee only when work completes**; payment **held** at hire, **released on approval**; **auto-approve 3 days** after delivery; full refund if not delivered; organic usage rights always included, **paid-ads usage is an add-on** | Writeup: revenue = fee on completed commissions; "simple and dependable". Constants in `lib/taxonomy.tsx` (`SERVICE_FEE_RATE`, `AUTO_APPROVE_DAYS`). |
| **Product profiles + learnings** carried into every new brief and "Commission again" | Writeup: "product context and previous feedback carrying forward into subsequent commissions". |
| Two demo personas sharing **one store**: business **Nour Haddad @ Daftar** (invoicing app, Riyadh) and creator **Layla Mansour** (@laylatalks, Dubai). Switch via the account menu ("Demo view") | Lets a reviewer play both sides; actions on one side show up on the other. |
| Other creators **auto-respond** (simulated replies, auto-accept offers after ~7s, auto-deliver versions after ~20–25s) | So the business flow can be demoed end to end without switching roles. See `scheduleReply` / `simulateDelivery` in `lib/store.ts`. |
| **Fixed demo clock** (`NOW` = Wed 4 Nov 2026 10:00 Riyadh, `lib/clock.ts`); dates display in Riyadh time | Deterministic UI and no server/client hydration mismatches. Never use `new Date()` in render. |
| **No real media**: `VideoThumb` composes generated scenes (creator face, mock phone/laptop UI, palette tints); `VideoPlayer` simulates playback against each video's script with captions + translation | No assets/backend; still makes portfolios, pitches and delivery review feel real. |
| Session/theme in **cookies** (`yapp_role`, `yapp_theme`), read by the root layout | Server renders the right header and theme with no flash. |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (includes React Compiler rules: no setState in effect bodies, etc.)
npm run build
```

Demo entry points: `/` (marketing) → `/signin` has one-click "Explore the demo" tiles for both
personas. Account menu (avatar, top right) → **Demo view** switches role, **Reset demo data**
restores the seed.

## Architecture

```
app/                      Next.js App Router pages (all client pages read the store)
  page.tsx, for-creators/, how-it-works/, not-found.tsx       marketing
  signin/, signup/, onboarding/{business,creator}/            auth + onboarding (mock)
  creators/, creators/[handle]/, creators/[handle]/commission/ discovery, profile, direct offer
  business/…              Nour's workspace: home, requests (+new wizard, [id] pitches/hire),
                          commissions (+[id] workspace), messages, products, creators, billing, settings
  creator/…               Layla's workspace: home, opportunities (+[id] pitch), pitches,
                          commissions (+[id]), messages, profile, earnings, settings
components/
  ui/        design-system primitives ported from V10 (Block, PillButton, Sheet, Toast, Character…)
  shell/     AppRoot, SiteHeader, BottomBar, AppShell, PublicShell, AccountSheet, NotificationsSheet, SiteFooter
  domain/    shared marketplace pieces (VideoThumb, VideoPlayer, CreatorCard, RequestCard,
             CommissionCard, StageTrack, ThreadView, BriefSummary, FitPanel, PriceSummary, …)
  <feature>/ feature-specific components (requests, commission, inbox, money, settings, business,
             products, creator, discovery, marketing, auth)
lib/
  types.ts       domain model (read this first)
  taxonomy.tsx   formats, platforms, dialects, niches, creator kinds, add-ons, status labels, fee constants
  data/          seed data (fictional people/companies); `index.ts` exports ME + everything
  store.ts       client store: useDemo(), useHydrated(), useTyping(), actions.* (all mutations)
  selectors.ts   pure derivations (fit score, earnings, receipts, attention ordering…)
  format.ts      money/date/duration formatting; clock.ts the demo clock; prefs.tsx theme + role
app/globals.css  Tailwind v4 + the design system (tokens, blocks, pills, chips, forms, motion)
```

Data flow: `lib/data` seed → copied into the store on first load → persisted to localStorage
(`yapp-demo-v1`). Pages call `useDemo()` and derive with selectors; they mutate only through
`actions.*`. Bump `VERSION` in `lib/store.ts` when the seed shape changes (old saved state is
discarded).

## Conventions (summary — full rules in DESIGN.md)

- Exactly **one neon action per screen**; pastels carry meaning (lavender = fit/AI, butter =
  money/progress, sky = trust/protection).
- Use the system components and `y-` classes; colours only via tokens so dark mode works.
- Signed-in pages wrap in `<AppShell role>`; public pages in `<PublicShell>`; structure with
  `Page` / `PageHeader` / `SectionLabel`.
- Dynamic routes: `useParams()`; ids created at runtime exist only after hydration — show a
  skeleton while `!useHydrated()`, a not-found `EmptyState` after.
- `useSearchParams()` consumers must be inside `<Suspense>`.
- Copy: plain, warm, specific, sentence case, no emoji. Status = icon + label.
- Lint is strict (React Compiler rules). Derive state during render instead of syncing it in
  effects; use `useSyncExternalStore` for browser-only values.

## QA tooling

```bash
npm run build && npx next start -p 3123            # QA runs against a production server
npm run qa:sweep                                   # 48 routes × 3 sessions (signed out / business / creator+dark) + 404
npm run qa:flow scripts/qa/flows/core-loop.json    # scripted browser flow (headless Chrome via CDP)
```

`scripts/qa/cdp.mjs` is a dependency-free Chrome DevTools driver: it clears the app's storage,
sets role/theme cookies, then runs steps (`go`, `click` by visible text, `type`, `text` assertions,
`eval`, `shot` → `.qa/shots/`). Flows in `scripts/qa/flows/`:
`core-loop` (approve → pay → review → learning saved → commission again → creator earnings),
`cross-role` (creator pitches → business hires → creator delivers → business reviews),
`request-wizard`, `simulated-delivery`, `visual` (dark-mode screenshots). Read a screenshot with
your image viewer to check layout. Use these after any change to flows.

## Status (end of build session, 4 Nov 2026)

**Built and verified.** 33 routes covering marketing, auth and onboarding, discovery and profiles,
direct and repeat commissioning, the request wizard, pitches and hiring, the commission
workspace (both roles), messages, products and learnings, billing, earnings and settings.
`typecheck`, `lint` and `build` are clean. `qa:sweep` and all 5 QA flows pass. Desktop, mobile
(390px) and dark mode were checked by screenshot.

The work was split between the lead agent and 9 subagents. Ownership is visible in the folders:
`components/<feature>/` per area; shared `ui/ domain/ shell/ lib/` written by the lead.

**Known gaps and simplifications (deliberate for a prototype):**
- No backend, auth, payments, uploads or media. Store is client-only (localStorage key `yapp-demo-v1`; saved state carries `VERSION` 2).
  Billing legal name/VAT/country live in a separate key `yapp-billing-details-v1` (cleared by Reset).
- Creator onboarding is self-contained; it doesn't create a new creator (the demo continues as
  Layla). Business onboarding does save the product it collects.
- The UI is English-only. A full Arabic UI locale isn't implemented (CSS is RTL-ready).
- Marketing stats that can't be derived from the store are constants in
  `components/marketing/platform.ts`.
- Store gaps the agents worked around: no "uninvite" action; asking for changes after the
  included revisions are used doesn't charge the extra-revision price (the cost is explained in
  copy only); delivery notes are visible to the creator immediately (no draft state); creator
  alert preferences (formats/dialects), auto-reply text and sign-in devices are local component
  state only.
- Creator earnings: seeded payouts represent work before the seed window. `creatorEarnings()` in
  `lib/selectors.ts` estimates earlier lifetime/monthly figures deterministically. See its comment.
- Only the dev-mode "N" Next.js indicator appears bottom-left in `next dev`; not in production.

**Suggested next steps (owner to prioritise):**
1. Review with the owner; adjust copy, economics (fee %, auto-approve days) and the launch
   format/dialect set in `lib/taxonomy.tsx`.
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

The work is uncommitted on `main` (the owner asked for no commits unless requested).
