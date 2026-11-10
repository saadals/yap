# Yapp — design system and build conventions

Yapp is a marketplace where tech brands (initially apps, AI tools, SaaS and gadgets, with the US
and Canada as the default market and a global audience) commission creators to make short social
videos for the brand's own accounts and ads. This file is the contract for everyone building
screens.

Colour, type and styling come from the **Yapping brand package** (round 3,
`feedback_docs_2/Yapping-Developer-Brand-Package/`): a near-white canvas, white cards with a soft
shadow, Inter, pills, glass that floats, and green as a signal. The structure (blocks, tiles, the
cast of blob characters) is the earlier "Stack" system; layouts are our own.

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
| Account            | One account type: every account can **order** (its buyer profile: a company or the person) and **make** videos (once it has a creator profile). A "Business account" adds company details, invoices with a tax ID and a team. |
| Side               | Which side of a deal the viewer is on: ordering ("business") or making ("creator"). Derived per order or commission (`sideOf`), never an account type. UI copy: "You ordered" / "You're making". |
| Order              | What a buyer places: a **custom request** (creators pitch), a **UGC campaign**, or a direct order from a creator's profile. |
| UGC campaign       | 10+ videos (steps of 5), each from a different creator, at a fixed price per video set by the **follower tier**. Budget held up front; creators **take a slot** first come, first served. |
| Slot / Yapp        | One creator's place on a campaign; in campaign and feed copy one video is "a Yapp" ("Make a Yapp", "1 of 10 remaining"). Other surfaces still say "video". |
| Review copy        | A campaign video before approval: watermarked, low quality. Approval unlocks the full-quality file. |
| Wallet             | Where a creator's money sits: **pending** (approved campaign videos, released 7 days after the post is verified, as long as it stays up), **available** (withdraw), paid out. |

Economics: creators keep 100% of their price and add-ons. The business pays a 10% service fee on
every order, UGC campaigns included. The price and the fee are charged at hire (custom and direct
orders) or when a campaign is posted, held while the work is made, and released on approval; a
refund returns the fee too. Deliveries auto-approve 3 days after delivery if the business doesn't
respond. Organic use on the business's own accounts is always included; paid-ads usage is an
add-on. Campaign pay lands in the creator's wallet as pending and is released 7 days after the
post (with the brand tag and the paid-partnership label) is verified; the post stays up for 30
days. Brands are shown to creators by reliability (review speed, share approved by the timer,
hires), not by a star rating. Constants live in `lib/taxonomy.tsx`.

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
5. **Quiet cards.** One title, one plain-text meta line ("App demo · English · 2 × 45s"), at most
   two badges/chips, one key number. Pick one way to show status (badge *or* bar, not both).
6. **Few colours.** White cards on the canvas. Green only for the one primary action (and the rare
   highlight that earns it). No night block unless it is the single highlighted thing. Meaning is
   carried by an icon and a label, never by a coloured card.
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
Never a raw hex in a component.

**Proportion (brand book): about 70% light, 20% dark, 10% green. Green is a signal, not a
wallpaper.** One primary action per view; no gradients behind content; no extra brand hues.

- **Surfaces:** `--y-canvas` #F7F7F9 (page), `--y-paper` #FFF (cards, sheets, opaque on purpose),
  `--y-mist` (5% ink: chips, tracks, quiet fills), `--y-night` #0B0B0C (dark stages),
  `--y-footer` #141416 (footer only), `--y-field` (input fill).
- **Text:** `--y-ink` #1D1D1F; `--y-ink-2` #6E6E73 is **the** secondary text colour (4.7:1 on the
  canvas); `--y-ink-3` #9A9AA0 is 2.6:1, so it is for **decorative marks only** (chevrons, axis
  ticks, dividers), never text people must read. `.y-fg-3` on text renders in the secondary colour;
  on an `svg` it keeps the tertiary tone. Placeholders use the secondary colour.
- **Green:** `--y-neon` #34F06C for fills (buttons, the logo's stick); text and icons on green are
  always `--y-on-color` #0B0B0C, never white. Green **text** on light uses `--y-green-text`
  #0A7A33; chart lines `--y-green-line` #1FC75A; soft fills `--y-green-tint`. Never neon as text on
  a light surface. Selection and active navigation use black and white, never green.
- **Status** (text colours reach 4.5:1 on their own `-soft` fill, on white and on the canvas):
  `--y-success` #0A7A33, `--y-warning` #A14A08, `--y-danger` #C22A1E, `--y-info` #1F55C9, each with
  `-soft`; `--y-active-soft` / `--y-active-fg` for "moving". These are darker than the package's
  #16A34A / #B45309 / #E5483B, which miss 4.5:1 as small chip text. **Red #E5483B (`--y-red`) is only
  for the notification dot and urgent marks.**
- **Illustration palette:** `--y-lavender | butter | sky`, `--y-c-*` and `--y-reel-*` are for
  characters, avatars, thumbnails and reel covers only, never a page, card or button fill. Block
  tones `lavender`, `butter` and `sky` still exist for compatibility but render as plain white
  cards; an icon and a label carry the meaning.
- **Dark mode** is a matching neutral set (the package has none): canvas #0B0B0C, cards #161618,
  secondary text #A1A1A6, status colours lightened to read on their tints. The primary dark button
  turns light. Logos switch to their on-dark files.
- **Glass** (`.y-glass`, `data-glass="clear|strong"`, `--y-glass*`): white 60% with
  `blur(24px) saturate(180%)`, a 1px white border and a soft shadow (`--y-glass-strong`, 78%, where
  the surface carries text). It belongs to floating chrome: the header pill, sticky phone action
  bars (`.y-bar`), the tab bar, the signed-out welcome, sign-in, the reels chrome and the feed's
  details layer. Page content stays on `--y-canvas` with solid white cards.
- **Order and campaign reels** are light illustrated canvases with soft glows and film grain, and
  they stay light in dark mode (they count as media, like video). Their characters use the
  illustration tints and never sit behind text.

## Logo

Every logo comes from `components/ui/brand.tsx`, which only shows the master SVGs in
`public/brand/` (byte for byte as delivered; `CHECKSUMS.txt` in the package). `Brand` (lockup as a
link home), `Lockup`, `BrandMark`, `Wordmark`; `size` is the height in px; `tone="light" | "dark"`
pins a file, the default `"auto"` renders both and lets CSS show one (`.y-logo`): it follows
`html.dark`, and inside the feed's floating top it follows `data-reel-tone`. URLs go through
`asset()` from `lib/site.ts` so they work under the GitHub Pages base path.

- **Never** redraw the mark, retype the wordmark, recolour, stretch, or add shadows or glows.
  Never on busy video without a scrim (the feed's top fade is the scrim).
- Sizes: lockup at least 96px wide (`Lockup` enforces 24px tall); the mark with dots from 20px tall;
  below 20px `BrandMark` switches to the small mark (no dots).
- On dark (footer, dark stages, video) the bubble and word are white and the stick stays green:
  that is the `-on-dark` file, never a CSS filter.
- The logo's accessible name is "Yapping". The interface still says "Yapp" everywhere else until the
  name is cleared.
- Favicon, app icons (`app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, `public/icon-*.png`)
  and `app/manifest.ts` come from the package's `app-icons/`; they are opaque on purpose.

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
- Colour follows the reel in view: `data-reel-tone="dark|light"` on `<html>` drives the logo (light
  or on-dark file), tabs, fades and tab bar icons. Video is dark; canvases are light. Use this
  attribute, not `data-tone` (which sets a block's surface). Over video the top fade is stronger:
  it is the logo's scrim.
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

Each tone also sets `--b-line-strong` and `--b-btn` / `--b-btn-fg` (the primary dark button for that
surface: dark on light cards, light on night blocks and video).

Rules:
1. Blocks stack with an **8px gap** (`gap-2`). Unrelated groups get 32px plus a `SectionLabel`.
2. Never two adjacent night blocks; at most one green block per screen.
3. One hero block per screen carries the h1 at display size; everything else is `y-title` or less.
4. White cards (`paper`, and the retired pastel tones) carry `--y-shadow-card`: a hairline ring plus
   a soft drop shadow. White on #F7F7F9 is almost invisible, so the shadow is what defines the
   card. `mist`, `canvas`, `night` and `neon` blocks are flat. Floating UI uses `--y-shadow-float`
   (menus, fixed bars), `--y-shadow-sheet` and `--y-shadow-toast`.
5. Desktop composes blocks into a 12-column grid (`lg:grid-cols-12 gap-2`), max width 1360px.
   Running text stays under ~62ch.
6. Clickable blocks/tiles get `.y-hoverable` (a white card deepens its shadow, a tile gets a
   hairline ring). Make the whole card clickable with the "stretched link" pattern
   (`after:absolute after:inset-0`) and keep secondary buttons above it with `relative z-[3]`.

## Type

**Inter, and nothing else**, weights 400, 500 and 600 only (loaded through `next/font` in
`app/layout.tsx`). `font-bold` and heavier utilities resolve to 600, and `th`, `b` and `strong` are
capped at 600. Arabic snippets fall through to the system's Arabic face. Sentence case everywhere.

| Class | Role | Size / weight |
| --- | --- | --- |
| `y-t-display` | H1, page title | 52 / 600, −0.038em (34 on phones) |
| `y-hero` | marketing hero | up to 64 / 600 |
| `y-title` | H2, section and block titles, sheet titles | 34 / 600, −0.032em (26 on phones) |
| `y-head` | H3, card titles | 18 / 600, −0.017em |
| `y-eyebrow` | label above a title or group | 12 / 500, uppercase, +0.08em, secondary colour |
| `y-lead`, `y-body` | body | 17 and 16 / 400, line height 1.55 |
| `y-small`, `y-micro` | meta | 14 and 12 (micro is 500) |

`y-display` sets the heading face (600, tight tracking); combine it with a size class. A headline
containing a `y-strong` part renders the rest at 400 so the strong words stand out ("Get your app
**talked about**"). **Big numbers are light:** `y-display y-num` always renders at 400, whatever
weight utility sits next to it (KPIs, prices, money). `y-num` gives tabular numerals. No emoji.

Text in a video's own language inside the English UI (hooks, captions, names) is wrapped with
`<InLang lang>` (`components/ui/page.tsx`), which sets `lang` and, for Arabic, `dir="rtl"`.

## Shape and motion

Soft corners: blocks `--y-r-block` (28px), sheets `--y-r-sheet` (30px on desktop, 28 top corners
on phones), inner tiles `--y-r-tile` (18px), inputs `--y-r-field` (14px), small `--y-r-sm` (12px).
**Every button, chip and tag is a pill** (999px). Motion tokens: `--y-dur-1/2/3`, `--y-ease`,
`--y-ease-pop`. Buttons press to 0.97; the primary dark button lifts 1px on hover. `.y-enter` rises
a block in. Everything respects `prefers-reduced-motion`.

**Buttons.** `PillButton` `contrast` is the primary dark button: a #2A2A2C → #0B0B0C gradient with
white text (light gradient with black text in dark mode and on night blocks); on devices with hover
it turns green with black text, lifts 1px and glows. `neon` is the primary green: solid, black
text. `soft` (quiet fill) and `outline` (white with a hairline) are the secondary ghost pills;
`ghost` is text-only. One green per view.

**Status chips** (`Badge`), five looks, always icon + label: `neutral` waiting on someone, `active`
moving (black on a green tint), `success` done (green text on a light green tint), `warning` needs
attention, `danger` negative or closed. `info`, `ink` and `neon` are for non-status labels.

**Inputs** (`.y-input`): 48px, radius 14, white fill, 1px border; focus is a dark green line with a
soft green halo; errors use the danger colour.

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
  `Brand` / `Lockup` / `BrandMark` / `Wordmark`, `Page`, `PageHeader`, `SectionLabel`, `InLang`.
- Form classes: `.y-input` (48px field, radius 14), `.y-label`, `.y-check`, `.y-switch`,
  `.y-range`, `.y-dropzone`.

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
  `RequestCard` renders campaigns ("$30 per Yapp", slots left); `BusinessLogo` shows a face for
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
  (`NOW` = Wed 4 Nov 2026 10:00 Eastern, a fixed UTC−5 offset; build dates with
  `at(days, "HH:MM")`; never `new Date()` in render).
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
rings come from the system (`:focus-visible` uses the block's foreground, inputs a dark green line)
and keep 3:1 against their background, so never a neon-only outline on a light surface; keyboard
support for custom controls; `aria-live` for async results; 44px minimum touch targets. Text keeps
4.5:1 (body) and 3:1 (large text, icons) in both themes.
