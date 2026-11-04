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

Economics: creators keep 100% of their price and add-ons. The business pays a 10% service fee,
charged only when work completes. Deliveries auto-approve 3 days after delivery if the business
doesn't respond. Organic use on the business's own accounts is always included; paid-ads usage is
an add-on.

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
- `BriefSummary`, `FitPanel`, `PriceSummary`, `ProtectedNote`, `PaymentMethodPicker`, `paymentLabel`.

Shell (`components/shell/`):
- `AppShell role="business" | "creator"` for signed-in pages (header + mobile bottom bar; `focus`
  hides the bottom bar for wizards/checkout that own the bottom edge).
- `PublicShell` for marketing, browsing, profiles and auth (header adapts to the signed-in role;
  `footer={false}` for auth/focused pages).

## Data and state

- Types: `lib/types.ts`. Taxonomy labels/icons: `lib/taxonomy.tsx`. Formatting: `lib/format.ts`
  (`money`, `moneyRange`, `priceBreakdown`, `timeAgo`, `stamp`, `dueLabel`, `shortDate`,
  `weekdayDate`, `clock`, `lengthLabel`, `plural`, `compact`). Demo clock: `lib/clock.ts`
  (`NOW` = Wed 4 Nov 2026 10:00 Riyadh; build dates with `at(days, "HH:MM")`; never `new Date()`
  in render).
- Store: `lib/store.ts`. `const s = useDemo()` returns the whole state; derive with
  `lib/selectors.ts` (pure). Mutate only via `actions.*` (in event handlers). State persists in
  localStorage; Account menu → "Reset demo data" restores the seed.
- Personas: business = Nour Haddad at Daftar (`ME.businessId = "b-daftar"`, `ME.memberId`);
  creator = Layla Mansour (`ME.creatorId = "cr-layla"`). Both sides share one store, so actions
  done as one role appear for the other.
- Dynamic routes are client pages using `useParams()`. Ids created at runtime only exist after
  hydration: if an entity is missing and `useHydrated()` is false, show a skeleton; if it's still
  missing after hydration, show an `EmptyState` "not found" with a way back.

## Writing

Plain, warm, specific. Say what happens next ("Payment is held until you approve"). Buttons are
verbs ("Send pitch", "Approve and release $286"). Empty states explain and offer the next action.
Errors say how to fix. No lorem ipsum, no emoji.

## Accessibility

Visible labels on every input; `aria-label` on icon-only buttons; status = icon + text; focus
rings come from the system (`:focus-visible` uses the block's foreground); keyboard support for
custom controls; `aria-live` for async results; 44px minimum touch targets.
