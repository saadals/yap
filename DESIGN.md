# Yapp — design system and build conventions

Yapp is a marketplace where small businesses (initially small software teams building for
Arabic-speaking audiences) commission creators to make social video content for the business's
own accounts and ads. This file is the contract for everyone building screens.

Colour and styling come from the "Stack" language (design V10 of the jobPlatform prototype):
bold rounded blocks, huge friendly type, black/white structure, a pastel trio, one neon green
action per screen, and a cast of blob characters. Layouts are our own.

## Vocabulary

| Term               | Meaning                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Content request    | A business describes product, audience, desired content, budget and deadline.                |
| Pitch              | A creator's response to a request: message, angle (hook idea), quote, turnaround, samples.    |
| Commission         | Agreed work between one business and one creator (hired pitch, direct offer, or repeat).      |
| Offer              | A direct commission sent from a creator's profile; the creator accepts or declines.           |
| Delivery           | A versioned video upload on a commission. The business approves or requests changes.         |
| Product            | Saved product context (audience, tone, dos/don'ts, assets, learnings) reused in every brief. |
| Learnings          | Feedback saved to a product after a commission so it carries into the next one.              |
| Payment protection | Payment is held when work starts and released only on approval. Full refund if not delivered. |
| Account            | One account type: every account can **order** (its buyer profile: a company or the person) and **make** videos (once it has a creator profile). A "Business account" adds company details, VAT invoices and a team. |
| Side               | Which side of a deal the viewer is on: ordering ("business") or making ("creator"). Derived per order or commission (`sideOf`), never an account type. UI copy: "You ordered" / "You're making". |
| Order              | What a buyer places: a **custom request** (creators pitch), a **UGC campaign**, or a direct order from a creator's profile. |
| UGC campaign       | 10+ videos (steps of 5), each from a different creator, at a fixed price per video set by the **follower tier**. Budget held up front; creators **take a slot** first come, first served. |
| Slot / Yapp        | One creator's place on a campaign; in campaign and feed copy one video is "a Yapp" ("Make a Yapp", "1 of 10 remaining"). Other surfaces still say "video". |
| Review copy        | A campaign video before approval: watermarked, low quality. Approval unlocks the full-quality file. |
| Wallet             | Where a creator's money sits: **pending** (approved campaign videos, unlocks at month end if the post stays up), **available** (withdraw), paid out. |

Economics: creators keep 100% of their price and add-ons. The business pays a 10% service fee,
charged only when work completes (custom and direct orders; **no fee on UGC campaigns** for now).
Deliveries auto-approve 3 days after delivery if the business doesn't respond. Organic use on the
business's own accounts is always included; paid-ads usage is an add-on. Campaign pay lands in the
creator's wallet as pending and unlocks at month end if the post (with the brand tag and the paid
partnership label) is still up.

## Calm first (owner feedback: "cluttered, too much going on at once")

These rules override anything below when they conflict. The product promise is that outsourcing
feels simple; every screen must feel that way too.

1. **One job per screen.** Each screen answers "what should I do here?" with one thing: it's the
   first thing you see and it holds the only neon. Everything else is clearly secondary.
2. **Show less, link more.** If information lives on another page (activity → notifications,
   stats → their list page, recommendations → Find creators), don't repeat it here. Dashboards
   have at most ~5 blocks; detail pages one main column plus at most one slim side column.
3. **Say it once.** A fact (due date, price, status, "review this") appears once per screen.
4. **Progressive disclosure.** Lists show a summary row; details open on click (detail page, sheet,
   or "Show more"). Long forms and briefs hide secondary sections behind a disclosure.
5. **Quiet cards.** One title, one plain-text meta line ("Selfie demo · Saudi · 2 × 45s"), at most
   two badges/chips, one key number. Pick one way to show status (badge *or* bar, not both).
6. **Few colours.** Default to paper blocks. Use a pastel only when its meaning matters on that
   screen, max two per screen, never stacked back to back. No night block unless it is the single
   highlighted thing.
7. **Short copy.** Headings say it; drop helper sentences that restate the heading. One line of
   description at most under a page title.
8. **Few actions.** One primary, up to two secondary; anything more goes in a "More" menu or the
   detail view.
9. **Room to breathe.** Prefer fewer, larger blocks with generous padding over many small tiles.
   Avoid tiles inside tiles inside blocks.
10. **One character moment per screen at most, and none on data-heavy screens.**

## Colour

Tokens are CSS custom properties on `.yapp` (see `app/globals.css`), redefined for dark mode under
`html.dark .yapp`. Use them through Tailwind arbitrary values: `bg-(--y-neon)`, `text-(--y-ink-2)`.

- Structure: `--y-canvas` (page), `--y-paper` (default block), `--y-mist` (secondary), `--y-night`
  (black blocks), `--y-ink`, `--y-ink-2`, `--y-ink-3`, `--y-line`.
- Pastels (always dark text): **lavender = fit, matching, AI/brief help** · **butter = money,
  budgets, earnings, progress** · **sky = trust, protection, verification, info**.
- **Neon `--y-neon`: exactly ONE primary action per screen** (per viewport on long marketing pages).
  Neon buttons always carry ink text and usually the black arrow circle (`arrow` prop).
  Selection and active navigation use black/white, never neon.
- Semantic: `--y-success | warning | danger | info` each with a `-soft` background. Status is never
  colour alone; badges always pair an icon and a label.
- Illustration tints (`--y-c-violet | sun | sea | coral | mint | blush`) are for characters,
  avatars and thumbnails only, never behind text.
- **Glass** (`.y-glass`, `data-glass="clear|strong"`, `--y-glass*`, background `--y-soft`) belongs
  only to the signed-out welcome, sign-in, the reels chrome and the feed's details layer. Every
  other page stays on `--y-canvas` with solid blocks.
- **Order and campaign reels** are light pastel canvases with soft glows and film grain, and they
  stay light in dark mode (they count as media, like video). Their characters use the illustration
  tints and never sit behind text.

## The reels feed (Home)

Home (`/home`) is the one full-bleed screen. Rules:
- Layers, back to front: media or canvas, reel content, short fades, floating controls. Nothing
  covers the logo, "+", tabs or the tab bar.
- Phones: no header. The reel fills the screen under a floating logo and "+", and the glass tab bar
  floats over its foot. Desktop keeps the header and a centred phone-width 9:16 column with ↑/↓
  buttons; logo and "+" are hidden there.
- Mix · Yapps · Orders is a plain vertical word stack on the right, with the name at the top start
  on the same level. Rows are 32px with a wide start edge (the spec's own tight stack can't reach
  44px; this is the one accepted exception to the touch-target rule).
- Colour follows the reel in view: `data-reel-tone="dark|light"` on `<html>` drives the logo, tabs,
  fades and tab bar icons. Video is dark; canvases are light. Use this attribute, not `data-tone`
  (which sets a block's surface).
- One template per reel type, never free-form: creator video (generated scene + captions), custom
  request and campaign (light canvases with five tappable characters and one topic prop picked by
  niche; characters drop out on short screens). One neon pill per reel: **Order** (video), **Pitch**
  (custom request), **Make a Yapp** with "N of T remaining" inside it (campaign). Other states are
  non-neon: **Manage** (your own), **Your Yapp · in progress**, **See details** plus one line why,
  **Campaign full**.
- Swipe up for the next reel. Swipe left, tap the pill, or press → opens the details layer with one
  sticky button; Back closes it. Respect reduced motion (no autoplay, no follow-finger animation).
  The ⋯ menu sits at the end of the bottom row and holds secondary actions (Not interested, Share,
  Report; Edit and Close on your own order).
- Every other page stays card-based and calm.

## The block system

`<Block tone pad as>` (`components/ui/block.tsx`) is the container. Tones: `paper | mist | canvas |
night | lavender | butter | sky | neon`. Each tone sets local `--b-bg`, `--b-fg`, `--b-fg-2`,
`--b-fg-3`, `--b-line`, `--b-chip`, `--b-chip-fg`, and every primitive inside adapts (a `contrast`
pill is black on paper and white on night). Use `.y-fg-2` / `.y-fg-3` for secondary text inside
blocks, `.y-tile` for an inner tile, `border-(--b-line)` for hairlines.

Rules:
1. Blocks stack with an **8px gap** (`gap-2`). Unrelated groups get 32px plus a `SectionLabel`.
2. Never two adjacent blocks of the same pastel; never two adjacent night blocks; max two pastels
   per screen.
3. One hero block per screen carries the h1 at display size; everything else is `y-title` or less.
4. Blocks are flat (no shadows). Only floating UI (sheets, toasts, header, bottom bar) is elevated.
5. Desktop composes blocks into a 12-column grid (`lg:grid-cols-12 gap-2`), max width 1360px.
   Running text stays under ~62ch.
6. Clickable blocks/tiles get `.y-hoverable` (hairline ring on hover). Make the whole card
   clickable with the "stretched link" pattern (`after:absolute after:inset-0`) and keep secondary
   buttons above it with `relative z-[3]`.

## Type

Funnel Display (headings, numerals) + Funnel Sans (UI). Arabic content uses Zain / Rubik
automatically. Classes: `y-display` (display face) combined with a size: `y-hero` (landing only),
`y-t-display` (page h1), `y-title`, `y-head`, `y-lead`, `y-body`, `y-small`, `y-micro`. `y-strong` for
the bold words in mixed-weight headlines ("Get your app **talked about**"). `y-num` for
tabular numerals. KPI numerals: `y-display y-num text-[44px] font-semibold tracking-[-0.04em]`.
Sentence case everywhere, no tracked caps, no emoji.

Arabic snippets inside the English UI (hooks, captions, names, dialect samples) must be wrapped
with `<Ar>` (`components/ui/page.tsx`) or `dir="rtl" lang="ar"`.

## Shape and motion

Radii: blocks `--y-r-block` (28/32px), tiles/inputs `--y-r-tile` (20px), small `--y-r-sm` (12px),
pills `999px`. Motion tokens: `--y-dur-1/2/3`, `--y-ease`, `--y-ease-pop`. Buttons press to 0.97.
`.y-enter` rises a block in. Everything respects `prefers-reduced-motion`.

## Components (import from `@/components/...`)

UI primitives (`components/ui/`):
- `Block`, `PillButton` (`neon | contrast | soft | outline | ghost | whatsapp`, sizes `sm 40 / md 48 /
  lg 56`, `arrow`, `icon`, `href`), `RoundIconButton` (label required), `Chip`, `FilterChip`
  (toggle with count), `Badge` (tone + icon), `SegmentedToggle` (radiogroup), `Sheet` (bottom sheet
  on mobile, side panel/centred dialog on desktop; focus trap, Esc, `footer` slot), `useToast()`
  (`toast({ message, tone, action: { label, onClick } })`), `Skeleton`, `EmptyState`
  (character + title + body + action), `Celebrate` (success cast pop-in), `Character`, `Cast`
  presets (`heroCast`, `successCast`, `duoCast`, `teamCast`), `FaceAvatar` / `AvatarStack`
  (generated faces from an id), `Crowd`, `TextField`, `TextArea`, `SelectField`, `FieldShell`,
  `OtpInput`, `MatchScore`, `MatchExplain`, `StackedBar`, `MiniBars`, `Sparkline`, `ThemeToggle`,
  `Brand` / `BrandMark` / `Wordmark`, `Page`, `PageHeader`, `SectionLabel`, `Ar`.
- Form classes: `.y-input` (pill input; textarea gets tile radius), `.y-label`, `.y-check`,
  `.y-switch`, `.y-range`, `.y-dropzone`.

Domain (`components/domain/`):
- `VideoThumb` (generated thumbnail; `frame` to crop, `playable`, `decorative`), `VideoPlayer`
  (simulated playback with captions, translation, seek, note markers; `onTime`, `seek`).
- `CreatorCard`, `CreatorRow`, `SaveCreatorButton`, `RequestCard` (`perspective`), `BusinessLogo`.
- `CommissionBadge`, `RequestBadge`, `PitchBadge`, `DueBadge`, `Rating`, `StarRow`, `StarInput`.
- `FormatChip`, `LanguageChips`, `PlatformChips`, `languageList`, `platformList`.
- `BriefSummary`, `FitPanel`, `PriceSummary` (hides the fee row when the fee rate is 0),
  `ProtectedNote`, `PaymentMethodPicker` (the signed-in account's cards), `paymentLabel`.
- `CommissionBadge` (`side` changes "Offer sent" / "New offer"), `SlotBadge` / `slotStatus` (campaign
  slot: Filming → Review copy ready → Approved, post due → Posted), `RequestBadge` (`campaign`
  wording: Taking creators / Full), `StageTrack` (`campaign` track: Slot taken → … → Posted).
  `RequestCard` renders campaigns ("$30 per yapp", slots left); `BusinessLogo` shows a face for
  someone ordering in their own name.

Feature entry points: `components/feed` (`ReelFeed`), `components/campaigns` (`CampaignWizard`,
`CampaignOrderView`), `components/account` (`CreatorSetupSheet`: open it whenever an account
without a creator profile tries to pitch or take a slot), `components/work`, `components/explore`.

Shell (`components/shell/`):
- `AppShell` for signed-in pages (desktop header: Home, Discover, Work, Messages, Profile, plus
  bell and avatar; phone glass tab bar: Home, Work, Discover, Inbox, Profile, with the header down
  to logo and "+"; `focus` hides the tab bar for wizards/checkout that own the bottom edge;
  `fullscreen` for the feed).
- `PublicShell` for marketing, browsing and profiles (header adapts to the session;
  `footer={false}` for focused pages). The signed-out welcome and sign-in use neither: they are
  their own full-screen scene (`components/landing`, `components/auth/sign-in-panel.tsx`).

## Data and state

- Types: `lib/types.ts`. Taxonomy labels/icons: `lib/taxonomy.tsx`. Formatting: `lib/format.ts`
  (`money`, `moneyRange`, `priceBreakdown`, `timeAgo`, `stamp`, `dueLabel`, `shortDate`,
  `weekdayDate`, `clock`, `lengthLabel`, `plural`, `compact`). Demo clock: `lib/clock.ts`
  (`NOW` = Wed 4 Nov 2026 10:00 Riyadh; build dates with `at(days, "HH:MM")`; never `new Date()`
  in render).
- Store: `lib/store.ts`. `const s = useDemo()` returns the whole state; derive with
  `lib/selectors.ts` (pure). Mutate only via `actions.*` (in event handlers). State persists in
  localStorage; Account menu → "Reset demo data" restores the seed.
- Accounts: Nour Haddad (business account, Daftar; no creator profile until she sets one up) and
  Layla Mansour (personal account, creator @laylatalks). Read the signed-in account with
  `me.ids(s)` / `me.account(s)`; `me.creator(s)` and `me.member(s)` can be undefined. Derive the
  viewer's side of an order or commission with `sideOf(s, item)`. Link through `lib/paths.ts`.
- Dynamic routes are client pages using `useParams()`. Ids created at runtime only exist after
  hydration: if an entity is missing and `useHydrated()` is false, show a skeleton; if it's still
  missing after hydration, show an `EmptyState` "not found" with a way back.

## Writing

Plain, warm, specific. Say what happens next ("Payment is held until you approve"). Buttons are
verbs ("Send pitch", "Approve and release $286", "Take a slot", "Hold $300 and publish"). Rejection
and removal copy is respectful and never blames ("Daftar went with another creator for this
slot"). Empty states explain and offer the next action.
Errors say how to fix. No lorem ipsum, no emoji.

## Accessibility

Visible labels on every input; `aria-label` on icon-only buttons; status = icon + text; focus
rings come from the system (`:focus-visible` uses the block's foreground); keyboard support for
custom controls; `aria-live` for async results; 44px minimum touch targets.
