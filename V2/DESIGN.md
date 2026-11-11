# Yapp V2 — design system and build conventions

The contract for every V2 screen. V2 keeps V1's brand and tokens (the Yapping brand package:
near-white canvas, white cards, Inter 400/500/600, pills, glass that floats, green as a signal)
and V1's component library, at a product scale. V1's [DESIGN.md](../DESIGN.md) is still the
reference for anything not restated here (colour tokens, status colours, logo rules, the block
tones, writing, accessibility). Where the two differ, this file wins inside V2.

## Principles

1. **One job per screen.** The first thing you see answers "what should I do here?". It holds the
   only green. Everything else is clearly secondary.
2. **The next step is always visible.** Every order and job shows its single next action at the
   top (desktop) or in a sticky bar (phones). People should never hunt for the button.
3. **Rows before cards.** Lists are rows in one white card (`<List>` / `<Row>`): one title, one meta
   line, at most one badge or number at the end. Cards are for things you look at (videos,
   creators, pitches), not for every list item.
4. **Say it once.** A fact (price, due date, status) appears once per screen.
5. **Details behind a click.** Secondary information goes in a side rail on desktop, a sheet, or a
   disclosure ("Show brief"). No tabs to hunt through when one timeline will do.
6. **Show the work.** This is a video marketplace: wherever a video exists (portfolio, pitch
   sample, delivery, library), show its thumbnail and let it play.
7. **Few colours.** White cards on the canvas. Green only for the one primary action. Meaning comes
   from an icon and a label, never from a coloured card. No pastel blocks (pastels are for
   illustration: avatars, characters, video scenes).
8. **Plain words.** "Get pitches from creators", not "Custom request" alone; "Approves itself on
   Fri" rather than "Auto-approves"; buttons are verbs with the amount when money moves
   ("Approve and release $300").
9. **Calm motion.** Short fades and rises; nothing bounces; respect reduced motion.
10. **Phones first-class.** Every page works at 375px: one column, sticky action bar, 44px targets,
    no horizontal page scroll.

## Scale (the V2 refresh, `app/globals.css` → "V2 refresh")

| | V2 | V1 |
| --- | --- | --- |
| Body text | 15px / 1.5 (`.y-body`), lead 17px | 16px |
| Page title (`PageHeader`, `.y-t-display`) | 26px phones → 32px desktop, 600 | 34 → 52 |
| Section / block title (`.y-title`) | 20 → 24 | 26 → 34 |
| Card title (`.y-head`) | 16 / 600 | 18 |
| Meta (`.y-small`, `.y-micro`) | 13, 12 | 14, 12 |
| Marketing hero (`.y-hero`) / section (`.y-t-section`) | 40 → 72 / 28 → 42 | 38 → 64 |
| Buttons (`PillButton` sm / md / lg) | 34 / 40 / 48 (44 / 40 min on touch) | 40 / 48 / 56 |
| Inputs | 44 (48 on touch), radius 12 | 48, radius 14 |
| Card radius / tile / sheet | 20 / 14 / 24 | 28 / 18 / 30 |
| Content width | 1200px (`Page`), narrow 760. Every page, Discover included, shares the header's 1200px column | 1360 / 880 |
| Header | full-width glass bar, 60px (`.y-header`) | floating pill, 64px |
| Phone tab bar | five fixed slots, icon over a label on every tab, 60px (`--y-bar-h`) | six tabs, label on the active one |

Big numbers (money, KPIs) stay light: `y-display y-num` renders at 400 (V1 rule). Use them sparingly:
one per card at most.

## Layouts

Pick one per page:

- **Today** (`/home`, `/studio`): a greeting line, then at most four sections: *Needs you* (a
  `<List>` of `attention()` rows, or an "all caught up" line), *In progress* (rows with a thin
  `ProgressBar`), one *start something* block (Ordering: start an order; Studio: find work), one
  rail of things to look at (creators that fit; open work that fits). Desktop may use a main
  column plus a 340px right column for money or shortcuts. No more than five blocks.
- **List page** (`/orders`, `/studio/jobs`, `/library`, `/products`, `/studio/work`, `/discover`):
  `PageHeader` with one primary action, underline `Tabs` or filter chips, then rows (or a grid for
  videos and creators). Empty states explain and offer the next action.
- **Detail page** (`/orders/[id]`, `/jobs/[id]`, `/creators/[handle]`, `/products/[id]`): a header
  (back link, title, one meta line, status chip, the one next action), a main column, and on
  desktop a sticky 340px side rail (`.y-rail`) with money, dates and details. On phones the rail
  content moves below or into a sheet, and the next action sits in a sticky bottom bar
  (`.y-bar`, glass). **One bottom bar per phone screen:** a page with an action bar has no tab
  bar. Pass `<AppShell detail back={{ href, label }}>`: the tab bar goes, the phone header shows
  the back link in place of the logo (give the page's own back link the class `y-backlink` so
  phones don't show two), and the bar uses `bottom: var(--y-bar-bottom)` with no spacer.
- **Focused flow** (`/orders/new`, `/creators/[handle]/order`, `/onboarding`, sign-in): `<AppShell
  focus>` (no tab bar; the header shows only the logo, plus the avatar on desktop), a step
  indicator, one question per step, and a live preview on desktop. The bottom bar spans the page:
  Back at its left edge, Continue at its right. Continue is never dimmed; a click with something
  missing shows what is missing.
- **Full screen** (`/discover/watch`): `<AppShell fullscreen detail>`, the vertical video viewer.
- **Marketing** (`/`, `/how-it-works`, `/for-creators`, `/legal`): `PublicShell`, marketing type
  scale, generous spacing, the dark footer.

Spacing: 8px between related cards, 24–32px between groups (`SectionLabel` gives 32px), 20–24px
card padding (`pad="md"`). Desktop grids use `lg:grid-cols-12 gap-4`; rails are `lg:col-span-4`
or a fixed `w-[340px]`.

## Components

From V1 (`components/ui`, `components/domain`; see V1's DESIGN.md for each): `Block`,
`PillButton`, `RoundIconButton`, `Badge`, `Chip`, `FilterChip`, `SegmentedToggle`, `Sheet`,
`useToast`, `Skeleton`, `EmptyState`, `Celebrate`, `Character`, `FaceAvatar`, `AvatarStack`,
`TextField`, `TextArea`, `SelectField`, `FieldShell`, `OtpInput`, `MatchScore`, charts, `Brand` /
`Lockup` / `BrandMark`, `Page`, `PageHeader`, `SectionLabel`, `InLang`; `VideoThumb`,
`VideoPlayer`, `CreatorCard`, `CreatorRow`, `RequestCard`, `CommissionCard`, `BusinessLogo`,
status badges, `StageTrack`, `ThreadView`, `BriefSummary`, `FitPanel`, `PriceSummary`, chips,
stars, money pieces.

New in V2:
- `List`, `Row` (`components/ui/list.tsx`): rows in one card. `Row` props: `title`, `meta`, `lead`,
  `end`, `below`, `href` | `onClick`, `chevron`.
- `Tabs` (`components/ui/tabs.tsx`): underline tabs, link (`href`) or state (`onSelect`).
- `ProgressBar`, `KeyValues` (`components/ui/progress.tsx`).
- `.y-header`, `.y-modepill`, `.y-bubble` (count), `.y-rail`, `.y-kv`, `.y-tabs`, `.y-list` /
  `.y-row`, `.y-progress`: CSS in the V2 refresh section.
- Shell: `AppShell` (`mode`, `focus`, `fullscreen`), `PublicShell` (`footer`, `bottomBar`, `mode`),
  `AccountMenuBody` (the account menu, used by the avatar sheet and `/account`),
  `useSwitchMode()`, `switchCopy`.
- `CreatorSetupSheet` (`components/account/creator-setup-sheet.tsx`): open it whenever an account
  without a creator profile tries to pitch, take a slot or use Studio.

Shared code rules: `components/ui`, `components/domain`, `components/shell` and `lib/` belong to
the lead. Build what you need in your own feature folder (a local row, a local card); if a shared
component has a bug or truly needs a new prop, keep the change small and backward-compatible and
mention it in your report.

## Status chips

Five looks, always icon + label: `neutral` waiting on someone else, `active` moving, `success`
done, `warning` needs your attention, `danger` negative or closed. The side that has to act sees
"needs attention" (warning); the other side sees "waiting" (neutral). Labels and tones live in
`lib/taxonomy.tsx` (`commissionStatus`, `requestStatus`, `pitchStatus`).

In V2 the `active` look is drawn like `neutral` (grey, with its icon), so a list of work in
progress doesn't compete with the one green action. This is a V2-only deviation from round 3
answers item 51, decided by the owner on 10 Nov 2026 and waiting on the sender; the tones stay
separate in the taxonomy and one CSS rule in `app/globals.css` restores the mint.

## Writing

V1's rules: plain, warm, specific, sentence case, no emoji, no exclamation marks, Canadian
spelling with "-ize" (colour, centre, authorized). Say what happens next ("Payment is held until
you approve"). Rejection copy never blames. Copy says "Yapp"; the logo says "yapping". In V2,
prefer the plain names: "Get pitches" (custom request), "UGC campaign" with a one-line
explanation ("10 or more creators post on their own accounts"), "Order from Layla" (direct).

## Accessibility

Visible labels on inputs; `aria-label` on icon-only buttons; status = icon + text; keyboard
support for custom controls; `aria-live` for async results; 44px touch targets; text 4.5:1 (3:1
for large text and icons) in both themes; never `--y-ink-3` for readable text.

---

## Appendix: the V2 build map (10 Nov 2026)

Each area was built by one agent, who owns the listed routes and folder. Shared files are the
lead's.

| Area | Routes | Folder |
| --- | --- | --- |
| brand-home | `/home`, `/orders`, `/library`, `/products`, `/products/new`, `/products/[id]`, `/billing` | `components/brand-home/` (+ `library/`, `products/`, `billing/`) |
| ordering-flows | `/orders/new`, `/creators/[handle]/order` | `components/new-order/`, `components/direct-order/` |
| order-owner | `/orders/[id]` owner view (custom request pitches; campaign management) | `components/order-owner/` |
| job | `/jobs/[id]` (both sides) | `components/job/` |
| discover | `/discover`, `/discover/watch`, `/creators/[handle]` | `components/discover/`, `components/watch/`, `components/creator-profile/` |
| studio-work | `/studio`, `/studio/work`, `/orders/[id]` opportunity view, creator setup | `components/studio-home/`, `components/find-work/`, `components/opportunity/`, `components/account/` |
| studio-business | `/studio/jobs`, `/studio/earnings`, `/studio/profile` | `components/studio-jobs/`, `components/earnings/`, `components/studio-profile/` |
| public-account | `/`, `/signin`, `/onboarding`, `/how-it-works`, `/for-creators`, `/legal`, 404, `/messages`, `/account`, `/settings` | `components/landing/`, `components/marketing/`, `components/auth/`, `components/inbox/`, `components/settings/`, `components/account-page/` |
