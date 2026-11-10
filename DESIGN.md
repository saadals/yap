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
| Order              | What a buyer places: a **custom order** (creators pitch; a video or **ad copy writing**), a **UGC campaign**, or a direct order from a creator's profile. Interface names are fixed: "Custom order", "UGC campaign", "Pick now", "Productivity". |
| UGC campaign       | 10+ videos (steps of 5), each from a different creator, at one price per video the **brand sets** ($30 floor, guidance range from `lib/pricing.ts`); the **follower tier** only decides who can take a slot. The full amount is held when it's posted; creators **take a slot** first come, first served. |
| Slot / Yapp        | One creator's place on a campaign; in campaign and feed copy one video is "a Yapp" ("$140 per Yapp", "3 of 10 left"). Taking one is always **Pick now** (`PICK_NOW` in `lib/taxonomy.tsx`). Other surfaces still say "video". |
| Find work          | Every open campaign and custom order in one place (`/work?tab=find`, `findWork()`); it never lists the signed-in brand's own orders. |
| Job page           | An open order as everyone but its owner sees it (`/orders/[id]`): the brief, the price with the creator's net, the brand's reliability, Pick now or Pitch now. The owner gets the management screens at the same address. |
| Order page         | Work in progress between one brand and one creator (`/work/[id]`, a commission): stages, deliveries with comments, tabs, details. |
| Comment            | A note on a delivery, pinned to a second of the video or general; either side writes, replies, resolves and re-opens. Requesting changes sends a chosen set of open comments. |
| Review copy        | A campaign video before approval: watermarked, low quality. Approval unlocks the full-quality file. |
| Wallet             | Where a creator's money sits: **pending** (approved campaign videos, released 7 days after the post is verified, as long as it stays up), **available** (withdraw), paid out. |

Economics (round 3 answers, item 6): Yapp keeps 20% of every transaction, deducted from what the
creator is paid. The brand pays the listed price and nothing on top; the creator receives 80%, and
sees that net beside every price ("$140 per Yapp · you earn $112"). The split is computed only by
`priceBreakdown()` in `lib/format.ts`. Custom and direct orders are charged at hire and held; a
campaign is charged in full when it's posted and held; money is released on approval (campaign
slots: 7 days after the post, with the brand tag and the paid-partnership label, is verified; the
post stays up for 30 days). A refund returns the price paid. Deliveries auto-approve 3 days after
delivery if the business doesn't respond. Every order carries one of four usage options (paid ads
12 months, paid ads 6 months, organic only, paid ads with no end date), part of the price; raw
footage comes with every approved video. Brands are shown to creators by five reliability
figures (pays on time, review speed, hire rate, auto-approved, shares results; "—" until there is
data), not by a star rating. Constants live in
`lib/taxonomy.tsx`; the campaign price guidance in `lib/pricing.ts`.

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
10. **One character moment per screen at most, and none on data-heavy screens.** Characters are
    out of confirmation screens and empty states altogether (round 3 answers, item 15); they stay
    in the phone feed and on the marketing pages until abstract artwork replaces them.

## Colour

**Light only.** Dark mode is paused (round 3 answers, item 49): nothing turns it on. The pre-paint
script no longer reads the `yapp_theme` cookie, `usePrefs()` always reports `light`
(`DARK_MODE_ENABLED = false` in `lib/prefs.tsx`), `ThemeToggle` renders nothing and no screen places
it, and the browser theme colour is the canvas. The dark values stay in `app/globals.css` under
`html.dark .yapp`, dormant, so it can be switched back on later; don't add dark values for new
tokens meanwhile.

Tokens are CSS custom properties on `.yapp` (see `app/globals.css`). Use them through Tailwind arbitrary values: `bg-(--y-neon)`, `text-(--y-ink-2)`.
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
- **Status** (round 3 answers, item 51): small chip text is `--y-success` #0A7A33, `--y-danger`
  #B42318 and `--y-warning` #92400E, each with a `-soft` tint; `--y-info` #1F55C9. On their own tint
  they measure 5.1 / 5.8 / 6.4 to 1 over white and 4.8 / 5.4 / 6.0 over the canvas (all at least
  4.5:1). The package's #16A34A and #E5483B are for icons, bars and text at 18px and above only.
  **Red #E5483B (`--y-red`) is the notification dot and urgent marks.**
- **Illustration palette:** `--y-lavender | butter | sky`, `--y-c-*` and `--y-reel-*` are for
  characters, avatars, thumbnails and reel covers only, never a page, card or button fill. Block
  tones `lavender`, `butter` and `sky` still exist for compatibility but render as plain white
  cards; an icon and a label carry the meaning.
- **Dark mode** (paused, values kept): a matching neutral set, canvas #0B0B0C, cards #161618,
  secondary text #A1A1A6. Not reachable while the app is light only.
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

Home (`/home`) is the one full-bleed screen, and since round 3 stage 2 it is **phone only**: at
1024px and up `/home` goes to `/` (Discover or Work). The same feed runs read-only inside Discover's
phone frame (`/app-preview`, `lib/preview.ts`). Rules:
- Layers, back to front: media or canvas, reel content, short fades, floating controls. Nothing
  covers the logo, "+", tabs or the tab bar.
- No header. The reel fills the screen under a floating logo and "+", and the glass tab bar floats
  over its foot.
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
  (custom order), **Pick now** with "N of T left" inside it (campaign). Other states are
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
`ghost` is text-only. Ghost pills are 500, the primary ones 600. One green per view.

**Status chips** (`Badge`), five looks, always icon + label: `neutral` waiting on someone, `active`
moving (black on a green tint), `success` done (green text on a light green tint), `warning` needs
attention, `danger` negative or closed. `info`, `ink` and `neon` are for non-status labels.

**Inputs** (`.y-input`): 48px, radius 14, white fill, 1px border; focus is a dark green line with a
soft green halo; errors use the danger colour.

## The kit (round 3, stage 2)

Shared pieces of the Discover and Work designs, used by every redesigned page (Discover, Work and
Find work, the job page, the order page, New order, Productivity, the shell). Each is in
`components/ui/` with its styles in the "Kit" section at the end of `app/globals.css`. Build pages
from these rather than redrawing a button, chart, modal or slot bar. To see one in use, open the
page that uses it (the list below names the props).

Layout and heads
- `WidePage` (`page.tsx`): the 1520px container of the redesigned pages, 72px sides from 1024px,
  20px on phones, 36px under the header. Restyled pages keep `Page` (1360px).
- `BackPill` (`page.tsx`): "← Work" above a detail page; 36px drawn, 44px to tap.
- `SectionHead` (`page.tsx`): eyebrow, H2 (34/26) and an end-side item, 26px below.
- `CardHead` (`page.tsx`): 18px card title, a muted count, a link or meta on the end side.
- Figures: `.y-fig-s | m | l | xl | xxl` (18, 26, 34, 40, 52 → 44 on phones), always 400 and
  tabular; `.y-fig-unit` for "per Yapp" after a figure.

Buttons
- `PillButton` (existing): `contrast` is the dark primary (green on hover), `neon` the green
  primary, `soft` the ghost pill. `sm` grows to 44px on touch screens.
- `ActionPill` (`action-pill.tsx`): full-width pill with a label, a count pill and a round arrow;
  `tone="neon"` (Pick now) or `"dark"` (the job page's "Pitch now · 2 min"); md 52, lg 56.
- `PickNowButton` (`action-pill.tsx`): the campaign action, worded once: "Pick now", "6 of 10 left"
  or "6 left", red on the last slot, "All slots taken" disabled at zero, `aria-label` "Pick now, 6 of
  10 remaining". A list of job cards repeats this one green button; everything else stays dark or
  ghost.
- `ArrowCircle` (`action-pill.tsx`): the round arrow inside a link ("Review now →"); dark, neon or
  light; decorative. Standalone round buttons are `RoundIconButton`.

Tags, chips, tiles
- `Tag` (`tags.tsx`): 26px card tag; `neutral` (format, platform, New), `green` (order type),
  `dark` (a job type that isn't a video: Ad copy writing).
- `TypeTag` ("UGC campaign" / "Custom order"), `TierTag` (people icon + "10K–20K", no emoji).
- `DeltaChip`: "↗ 18%"; green when good, red when not (`good` for down-is-better figures), black
  on a green block.
- `SampleChip`: the dashed "Sample" chip every sample figure carries, on every screen size.
- `StatusChip`: status by meaning (waiting, moving, done, attention, negative) with a default icon;
  built on `Badge`. The domain badges keep their own mapping.
- `BrandTile` (`brand-tile.tsx`): a brand's colour and initial, radius 30% of the size (22–52).
  For a `Business` use `BusinessLogo`, which draws the same tile and a face for a personal buyer.

Progress
- `SlotBar` (`progress.tsx`): one segment per campaign slot, taken dark, open green (Work spec
  6.5.9); sm/md/lg; one continuous track above 40 slots; decorative unless given a `label`.
- `Progress`: plain track with a fill (countdowns, demand bars); green, ink or gradient; grows once
  on first view.
- `StageBars`: thin segments with labels under them; done green, current half filled and bold
  (order header, New order header).
- `Stepper`: the numbered stepper with a track (Discover "How it works", service pages); plays
  through while on screen, pointing pins a step, no autoplay under reduced motion, a vertical list
  on phones. Every step's text stays at full contrast.

Data
- `DefinitionList` (`data.tsx`): term over detail, two columns, hairlines; for briefs.
- `DetailRows`: label and value on one line with hairlines and an optional bold total; money
  details and summaries.
- `StatBox` + `StatGrid`: a light value over a label in a quiet tile, optional green or red sub-line;
  "—" until there's data.
- `Checklist`: green ticks, `plain` (CTA cards) or `circle` (what happens, in a sheet).
- `Note` (`note.tsx`): an icon and one line in a tinted tile ("$570 held · released when you
  approve"; `sm` for "Private · only you and Maya see these comments").

Figures and charts
- `KpiCard` (`kpi-card.tsx`): label, light 34px value, delta chip, sparkline; `tone="neon"` for the
  one highlighted figure; `value={null}` + `empty` for a figure the platform can't compute
  ("Connect an ad account").
- `LineChart` (`charts.tsx`): smooth (Catmull-Rom) line or area, optional dashed comparison, grid,
  axis and legend; draws in once with a clip-path (never `stroke-dasharray` on a non-scaling
  stroke), end dot after it, hover snaps a read-out to the nearest point (clamped 12–88%); a
  sentence plus a hidden table for screen readers. Change its `key` to draw it again.
- `Sparkline` (`charts.tsx`): the same line at 34px, full width, decorative.
- `CountUp` (`count-up.tsx`): a number that counts up once on first view and ends exactly on the
  value; final value under reduced motion and for screen readers.

Controls
- `SegmentedToggle` (existing, extended): the dark selected pill; `md` 40 (Work tabs, order tabs,
  role switch), `lg` 44 (type bar), counts per option, `fill` to span the row on phones,
  `phoneCounts={false}`; scrolls inside itself when it can't fit.
- `FilterChip size="sm"` (existing, extended): the small pressed pill (filters, platforms,
  deadlines), 32px on desktop, 44px under 1024px.
- `SelectPill` (`select-pill.tsx`): a native select as a quiet pill; lg 64 (finder), md 52, sm 44.

Overlays
- `ConfirmModal` (`confirm-modal.tsx`): centred 440px (a bottom sheet on phones): title, body,
  optional fields, one full-width primary (dark; `neon` only when it's the view's green action) and
  a text link. No illustration. Focus on the title, Esc and the scrim close, focus returns.
- `Sheet` (existing, restyled): side sheet 16px from the edges with radius 30, 22px title, glass head
  with a hairline, sticky glass foot; `step` draws the two-segment progress; `SheetActions` lays out
  "Not yet" + the primary filling the row. Widths `sm 420 | md 480 | wide 560 | lg 640`. Two modals
  can stack: only the top one answers Esc and Tab (`useModal` in `dialog.tsx`).
- `Dropdown` (`dropdown.tsx`) with `DropdownColumns`, `DropdownColumn`, `DropdownItem` (Services:
  icon tile that turns green, title, one line, "Most popular" chip), `DropdownRow` (account rows,
  `tone="danger"` for Log out), `DropdownHeader`, `DropdownSeparator`, `DropdownFooter`: the glass
  panel under a nav item. Opens on click, and with `hover` after 120ms (closes 200ms after the
  pointer leaves; a bridge covers the gap); Enter, Space or ↓ opens and focuses the first item,
  arrows move (↑↓ in a column, ←→ across), Esc closes and returns focus, tabbing out or clicking
  outside closes, one open at a time. Desktop only.

Page furniture
- `NextStep` (`next-step.tsx`): label, one sentence, a clock line (amber, red, green or muted) with
  an optional countdown track, and the actions; `look="quiet"` when there's nothing to do;
  `phoneActions={false}` when a sticky bar carries the buttons.
- `StickyActionBar` (`sticky-bar.tsx`): the phone's glass action bar above the tab bar (job page,
  order page); hidden from 1024px.
- `EmptyState` (existing): title, one sentence, one action, optional line `icon`; no character.
- `.y-hit`: stretches a small link's tap area to 44px without changing how it's drawn.

Left out on purpose (one area each, so they belong to that page): the Find work job card itself,
its list row, the finder bar and format tabs, sidebar filter options, the pager, the "Needs you"
card, the comments panel and composer, version tabs, the activity timeline, the Discover file
cabinet, explore strip, stories fan and reviews, the footer. Toasts stay `useToast()`.

## Components (import from `@/components/...`)

UI primitives (`components/ui/`):
- `Block`, `PillButton` (`neon | contrast | soft | outline | ghost | whatsapp`, sizes `sm 40 / md 48 /
  lg 56`, `arrow`, `icon`, `href`), `RoundIconButton` (label required), `Chip`, `FilterChip`
  (toggle with count), `Badge` (tone + icon), `SegmentedToggle` (radiogroup), `Sheet` (bottom sheet
  on mobile, side panel/centred dialog on desktop; focus trap, Esc, `footer` slot), `useToast()`
  (`toast({ message, tone, action: { label, onClick } })`), `Skeleton`, `EmptyState`
  (title + body + action, optional line `icon`; no character), `Celebrate` (renders nothing until the
  abstract confirmation artwork arrives), `Character`, `Cast`
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

Feature entry points: `components/feed` (`ReelFeed`), `components/discover` (`DiscoverPage`, brings
its own shell), `components/work` (`WorkPage`, `JobPage`, `take-work.tsx` for the Pick now and
Pitch now modals), `components/commission` (`CommissionWorkspace`: the order page),
`components/new-order` (`NewOrderPage`: the one wizard), `components/productivity`,
`components/campaigns` (`CampaignOrderView`: the owner's campaign screen), `components/account`
(`CreatorSetupSheet`: open it whenever an account without a creator profile tries to pitch or pick
a slot), `components/explore` (creators only).

Shell (`components/shell/`):
- `AppShell` for signed-in pages; `PublicShell` for marketing, browsing and profiles (its header
  adapts to the session). Both take `footer: "full" | "compact" | "none"`: signed-in pages default
  to the compact footer (logo, "All legal documents", the © line), public pages to the full dark
  one; phones never get a footer (its links live on `/more`). `focus` hides the tab bar for
  wizards and checkout that own the bottom edge; `fullscreen` is the feed.
- Desktop header (a glass pill, 72px from the sides): Discover, Services (dropdown), Work,
  Messages, Profile, with a green dot under the current page; then New order (dark), the bell and
  the avatar, which opens the account dropdown. Signed out: Discover, Services, How it works, Sign
  in, Get started. The service list lives once in `components/shell/services.tsx`; a service
  appears in the menu, the footer and `/more` only when its page exists.
- Phone: a header with the logo, "+" and More; a six-tab glass bar, Home · Discover · Work ·
  Messages · Alerts · Profile, icons only with the label on the active tab (icon only below 375px).
- The account menu (`account-menu.tsx`, shared by the desktop dropdown and the phone sheet):
  Productivity with its change chip, Wallet, Billing & receipts, Products, Saved creators,
  Settings, the demo controls, then one "Log out" that asks first.
- Where "/" goes is decided in `home-route.tsx`: bubbles signed out; signed in on desktop,
  Discover, or Work for a personal account with a creator profile (`desktopHomeOf(s)`); the feed on
  phones. The signed-out welcome and sign-in are their own full-screen scene
  (`components/landing`, `components/auth/sign-in-panel.tsx`).
- A backdrop filter on an element stops glass inside it from blurring the page. The header's glass
  is therefore a pseudo-element behind its content (`app/styles/shell.css`); do the same for any
  glass element that holds a dropdown.

## Pages (round 3, stage 2)

The redesigned pages replicate the sender's two previews (`feedback_docs_2/DISCOVER PAGE.html`,
`YAPPS_WORK (7).html`) with the rulings in `YAPPS_ROUND_3_ANSWERS.md` applied. When they disagree:
the answers file, then the spec text, then the preview.

- **One set of margins.** Every desktop page sits on the header's 72px sides, 1376px of content at
  most: redesigned pages through `WidePage` (`.y-wide`), the others through `Page`
  (both read `--y-gutter`: 20px on phones, 24px on tablets, 72px from 1024px).
- **Breakpoints.** 1024px switches phone and desktop. Work and the order page go to one column
  below 1180px (the sidebar becomes a segmented control and a Filters sheet).
- **Green, per page** (one green action per view): Find work and the job page, Pick now; the
  order page, the stage's main action (Approve and release, Upload version, Add post link); the
  wizard, Post order on the last step only; Ordered, the plus on "Post a new order"; a service
  page, Start an order. Search, Continue, Pitch now, "Review now" in the Needs you card and the
  comment composer's send button are dark.
- **Needs you** is a white card with a 4px `--y-warning` bar, never a green block.
- **Prices always show the creator's net** to a creator ("$120 per Yapp · you earn $96"), and never
  a fee line to a brand.
- **Sample figures carry `SampleChip`** on every screen size, one chip per group. Figures that need
  a connected ad account (CAC, ROAS, CTR, hook rate, reach) show "Connect an ad account" or "—",
  never a number.
- **Filters live in the URL** on Find work (`type, q, cat, job, fmt, plat, pay, within, sort, view,
  page`), written with `history.replaceState` so a click doesn't wait for the router; Back and a
  shared link both work. The order page reads `?version=`, `?comment=` and `?tab=`.
- **No illustration in confirmations or empty states.** `ConfirmModal` and `EmptyState` take a line
  icon at most.
- **A change with no better direction is neutral.** `DeltaChip good={null}` (spend, videos
  delivered) is grey; green and red are for figures where one direction is better.

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
verbs ("Send pitch", "Approve and release", "Pick now", "Post order"). Rejection
and removal copy is respectful and never blames ("Daftar went with another creator for this
slot"). Empty states explain and offer the next action.
Errors say how to fix. No lorem ipsum, no emoji.

## Accessibility

Visible labels on every input; `aria-label` on icon-only buttons; status = icon + text; focus
rings come from the system (`:focus-visible` uses the block's foreground, inputs a dark green line)
and keep 3:1 against their background, so never a neon-only outline on a light surface; keyboard
support for custom controls; `aria-live` for async results; 44px minimum touch targets. Text keeps
4.5:1 (body) and 3:1 (large text, icons) in both themes.
