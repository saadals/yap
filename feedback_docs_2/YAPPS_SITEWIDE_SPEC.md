# YAPPS — Site-wide spec (Part 5)

**For:** the developer (Claude Code) working in the existing Next.js repo (`saadals/yap`, branch `main`).
**Type:** descriptive spec only. There is no HTML preview for this part.
**Read with:**
- `YAPPS_DISCOVER_SPEC.md` (Part 4). This holds the design system (4.1), nav (4.2), side panel (4.12) and footer (4.11). Everything here reuses it.
- `YAPPS_MOBILE_SPEC.md` (Part 3) and `YAPPS_MOBILE.html`. These are the phone app, the feed (reels) and the tab bar.
- `YAPPS_DESKTOP_SPEC.md`. This is the landing page.

**Rule of precedence:** if this file conflicts with an older part, **this file wins**. Exceptions:
- design tokens: Part 4, section 4.1, wins;
- feed behaviour: Part 3 wins.

---

## 5.0 Summary of changes

| # | Change | Section |
|---|---|---|
| 1 | The feed (reels) exists **only on phone** (native app + phone web). Desktop never shows it; the desktop root is **Discover**. | 5.1 |
| 2 | Discover becomes the **2nd tab** on phone. | 5.2 |
| 3 | One visual system everywhere: the Discover/landing "vibe" (colours, glass, card shapes, type), plus the final logo. | 5.3 |
| 4 | Pages that were not redesigned keep their **elements and layout** and only change **style** (colours, gradients, glass, radii, type). | 5.4 |
| 5 | Every post-agreement interactive flow (deliveries, review window, auto-approval, payment release, revisions, disputes, posts, payouts) is **kept as is**, restyled only. Delivery comments become two-way threads; Messages stay. | 5.5 |
| 6 | Footer on **every desktop page**. **No footer on phone.** Its content moves to a phone **More (•••)** page. | 5.6 |
| 7 | Design-defect fixes (Hot categories shifted right, and all similar issues) plus an audit checklist. | 5.7 |
| 8 | New **Services** dropdown in the desktop nav (our own names; "UGC ads" stays). | 5.8 |
| 9 | New **Productivity** page (KPIs, reach, money, people) for brands and creators, opened from the account menu. | 5.9 |
| 10 | Data contracts, analytics, acceptance criteria and decisions. | 5.10–5.13 |

---

## 5.1 Platform split: what shows where

### 5.1.1 Definitions
- **Phone:**
  - the native app (iOS/Android shell);
  - the website when the viewport is **≤ 760px**.
- **Desktop:**
  - the website when the viewport is **≥ 761px**. Tablets fall in this group and get the desktop layout.
- The **initial render** decides the layout on the server, so the wrong screen never flashes:
  - Read `Sec-CH-UA-Mobile`, falling back to a User-Agent check, to choose phone or desktop.
  - The client confirms with `matchMedia('(max-width:760px)')`. If the result differs from the server's guess, swap the layout **once** on mount.
  - Resizing a desktop window later does **not** hot-swap the root page. It only changes the responsive layout of the current page.
- The native app sends the header `X-Yapp-Client: app/<version>`. Treat it as phone, always.

### 5.1.2 Root and feed routing
| Route | Phone | Desktop |
|---|---|---|
| `/` | **Home feed** (reels), exactly as `YAPPS_MOBILE.html` / Part 3 | **Discover** (Part 4) |
| `/home` | Home feed | **301 → `/`** (Discover). The feed is not rendered on desktop. |
| `/discover` | Discover (phone layout, Part 4 §4.14) | **308 → `/`** (one canonical URL) |
| `/v/[id]` (shared video link) | Opens the feed positioned at that video | Opens Discover with the **story/creator side panel** (4.12) for that video. Never the full-screen feed. |

- Desktop must not ship the feed bundle: three.js, the feed scroller and the swipe engine. Load them only in the phone route via dynamic import.
- The "Get the app" section on Discover (4.5.1) is the **only** place desktop sees the feed. It is the read-only Home preview inside a phone frame, as already specified.
- **SEO:** canonical for `/` is the Discover content. The phone feed sets `<meta name="robots" content="noindex">` on `/home`.

---

## 5.2 Phone: Discover becomes the 2nd page

### 5.2.1 Tab bar (new order)
| Pos | Tab | Icon | Destination |
|---|---|---|---|
| 1 | **Home** | house | Feed (reels), unchanged |
| 2 | **Discover** | compass | Discover, phone layout |
| 3 | **Work** | briefcase | Work, unchanged content, restyled |
| 4 | **Alerts** | bell (red dot when unread) | Notifications |
| 5 | **Profile** | avatar with account badge | Opens the account sheet (5.9.1) |

- **What changes:** only the order (the current HTML has Home, Work, Discover, Alerts, Profile). Swap **Work ↔ Discover**.
- **Everything else in the tab bar stays as in `YAPPS_MOBILE.html`:** glass bar; the active tab gets the dark gradient pill with its label animating in; badges; the `+` button in its current position and behaviour.
- **On the feed:** the tab bar uses the **dark tone** over video (`updateTone()` logic). On Discover and every other light page it uses the **light tone**.
- **Tapping the active Discover tab again:** scrolls to top. If already at top, it refreshes the Live briefs and ticker.

### 5.2.2 Discover on phone
- **Content:** same content as desktop, in the phone layout of Part 4 §4.14. Fixes:
  - **Top bar:**
    - No floating desktop nav.
    - Use the standard phone header: logo left; **search** icon and **More (•••)** icon right. The avatar lives in the tab bar.
    - Height 56, glass (`rgba(247,247,249,.72)` + `blur(20px) saturate(180%)`). It sticks to the top under the safe area.
  - **Bottom padding:** the page ends `tab-bar height + safe area + 24px` above the bottom, so the last card is never hidden behind the tab bar.
  - **File cabinet:** horizontal swipe flips files (Part 4 rules). A vertical swipe over the cabinet **scrolls the page** on phone. Only horizontal intent flips (|dx| > |dy| × 1.2 and |dx| ≥ 40).
  - **"Get the app" section (4.5.1):**
    - **Hidden inside the native app.**
    - On phone web it becomes a **compact banner**: icon, "Get the Yapp app", store button for the detected OS.
    - The phone-frame preview is not shown on phone (the user is already on a phone).
  - **No footer** (see 5.6).
- **Side panel → bottom sheet** (already in 4.12):
  - max height 88vh;
  - grabber;
  - drag down to close;
  - background page locked while open.

---

## 5.3 One design system everywhere ("the vibe")

All pages, sheets, modals, toasts, emails-in-app and empty states use **Part 4 §4.1**. In short:

- **Background:** `#F7F7F9` everywhere. No beige canvas (`#EEEEEA`) anymore. No background blobs behind content.
- **Cards ("blocks"):** `rgba(255,255,255,.90)`; radius **28**; soft layered shadow (`--card-shadow`); inner blocks radius 16–18.
- **Glass** (nav, tab bar, sticky headers, floating toolbars, sheet headers): `rgba(255,255,255,.6)` + `blur(24px) saturate(180%)`; 1px border `rgba(255,255,255,.7)`; shadow `0 8px 32px rgba(0,0,0,.07)`.
- **Accent:** Yapp green `#34F06C`, with **black text on green, always**; alternate white and green surfaces when 3+ cards sit in a row (white, green, white…); at most **one** solid-green card per viewport-height of content outside Discover, so green keeps its meaning.
- **Dark surfaces:** `#0B0B0C` for "stage" moments (e.g. completion celebration, CTA); `#141416` for the footer.
- **Type:** Inter 400/500/600 only; 700 only for the "yapp" wordmark. Big numbers (KPIs, prices, money) are **400**, not bold; H1 52 / H2 34 on desktop; on phone H1 34 / H2 26.
- **Pills:** every button, chip, tag, tab and segmented control is radius **999**; primary dark button: gradient `#2A2A2C → #0B0B0C`, white text; hover → green with black text and glow; primary green: solid `#34F06C`, black text.
- **Icons:** keep the current icon set (lucide), stroke 1.75, size 18/20.
- **Motion:** `--ease: cubic-bezier(.2,.8,.2,1)`; hover lift 3px; count-ups run **once**; honour `prefers-reduced-motion`.

### 5.3.1 Token mapping (repo `app/globals.css` → new values)
Change the **values** of the existing tokens so components restyle without being rewritten. Then add the new tokens.

| Existing token | Old | **New** | Note |
|---|---|---|---|
| `--y-canvas` | `#eeeeea` | **`#F7F7F9`** | page background |
| `--y-paper` | `#ffffff` | **`rgba(255,255,255,.90)`** | cards. Use solid `#fff` for inputs only. |
| `--y-mist` | `#e4e4df` | **`rgba(29,29,31,.05)`** | chips, tracks, input fill |
| `--y-ink` | `#0e0e10` | **`#1D1D1F`** | primary text |
| `--y-ink-2` | `#46464c` | **`#6E6E73`** | secondary text |
| `--y-ink-3` | `#616167` | **`#9A9AA0`** | tertiary text, axis labels |
| `--y-line` | `rgb(14 14 16/.12)` | **`rgba(29,29,31,.06)`** | hairlines |
| `--y-line-strong` | `.22` | **`rgba(29,29,31,.12)`** | input borders |
| `--y-night` | `#0e0e10` | **`#0B0B0C`** | dark stages |
| `--y-neon` | `#34f06c` | `#34F06C` (same) | accent |
| `--y-on-color` | `#0e0e10` | **`#0B0B0C`** | text on green |
| `--y-success` | `#137a3f` | **`#16A34A`** | positive text/deltas |
| `--y-success-soft` | `#d8f3e1` | **`rgba(52,240,108,.14)`** | positive chip fill |
| `--y-danger` | `#bf2e28` | **`#E5483B`** | negative, urgent |
| `--y-danger-soft` | `#fadbd7` | **`rgba(229,72,59,.10)`** | |
| `--y-warning` / `-soft` | keep | `#B45309` / `rgba(245,158,11,.14)` | deadlines, "needs you" |
| `--y-info` / `-soft` | keep | `#1F55C9` / `rgba(31,85,201,.10)` | |
| `--y-r-block` | 28px | 28px (same) | |
| `--y-r-tile` | 20px | **18px** | inner blocks |
| `--y-r-sm` | 12px | 12px | brand squares, thumbnails |
| `--y-shadow-float` | … | **`--card-shadow` from 4.1.1** | |
| `--y-ease` | same | same | |

**New tokens to add:**
- `--y-glass: rgba(255,255,255,.6)`
- `--y-glass-border: rgba(255,255,255,.7)`
- `--y-glass-blur: blur(24px) saturate(180%)`
- `--y-green-line: #1FC75A` (chart lines on light surfaces)
- `--y-green-tint: #D3FBE0`
- `--y-footer: #141416`
- `--y-btn-dark: linear-gradient(180deg,#2A2A2C,#0B0B0C)`

**Illustration palette stays:**
- `--y-lavender`, `--y-butter`, `--y-sky`, `--y-c-*` and `--y-reel-*` are **illustration and video-cover colours only**. Examples: the blob characters (5.5.3), creator avatars, reel placeholders.
- They must **never** be used as a page, card or button background.

### 5.3.2 Logo (final, everywhere)
- **Mark:** the chat bubble with three dots: two green `#34F06C` and one red `#E5383B`. The red one is the same red as the notification dot on the bell. Any order is fine; use green, green, red. No other variants.
- **On light surfaces:** black bubble `#0B0B0C` + green, green, red dots.
- **On dark surfaces** (footer, dark stages): white bubble + green, green, red dots.
- **Wordmark:** "yapp" 22/700, −0.03em, ink on light / white on dark.
- Replace every logo variant: the landing (three green dots), Discover (white, white, green), the footer, the app icon, the favicon, the splash screen and email headers. Export one SVG source (`public/brand/yapp-mark.svg` + `yapp-mark-dark.svg`) and use it everywhere.

---

## 5.4 Restyling pages that were not redesigned

### 5.4.1 Rule
For every page below:
- **Keep:** every element, its order, its layout grid, its copy, its states and its behaviour.
- **Change only:**
  - Surfaces: canvas → `#F7F7F9`; tiles → white 90% cards, radius 28/18, new shadow.
  - Sticky headers, toolbars, filter bars, bottom action bars and sheet headers → **glass**.
  - Buttons:
    - main CTA on a page → primary dark (or green if the page has no green card);
    - secondary → ghost pill (`rgba(29,29,31,.05)`).
  - Status chips → pill, colour by role (table 5.4.3).
  - Type → the Part 4 scale (KPI numbers weight 400).
  - Tables → no vertical lines; row hairlines `rgba(29,29,31,.06)`; header 12/500 uppercase +0.08em `--muted`; row hover `rgba(29,29,31,.03)`.
  - Inputs:
    - h48, radius 14, fill `#fff`, 1px `rgba(29,29,31,.12)`;
    - focus ring `0 0 0 4px rgba(52,240,108,.25)` + border `#1FC75A`;
    - error border `--y-danger` + 12px helper text.
  - Empty states:
    - centred, max-width 360;
    - small illustration (blob characters allowed);
    - one primary button.
- **No new features** on these pages unless listed in this file.

### 5.4.2 Page-by-page map (repo routes)
| Route | Component dir | Status | Notes |
|---|---|---|---|
| `/` desktop | discovery | **Redesigned** (Part 4) | |
| `/` phone, `/home` | feed | **Keep** (Part 3) | Feed, already in the new style |
| `/explore` | explore | Restyle | On desktop, its content is reachable from Discover's Explore strip. Keep the route. |
| `/work`, `/work/[id]` | work | Restyle | "Needs you" block → a white card with a 4px left accent bar `--y-warning`; rows as cards |
| `/orders`, `/orders/new`, `/orders/[id]` | requests | Restyle | The wizard keeps its steps. The step indicator uses the Discover **stepper** look (4.4): numbered circles, green when done, dark when current. |
| `/pitches` | requests | Restyle | Pitch cards → white cards. "Compare" uses the comparison-table style (4.9). |
| `/messages` | inbox | Restyle | Thread list on a white card. The conversation pane bubbles: **mine** = `#1D1D1F` with white text; **theirs** = white with ink text; system events = centred grey pill. |
| `/products`, `/products/new`, `/products/[id]` | products | Restyle | |
| `/creators`, `/creators/[handle]` | creator | Restyle | The public profile header becomes a 28-radius card. Stats row uses the KPI style (400 weight, delta chips). |
| `/creators/[handle]/commission` | commission | Restyle | |
| `/for-creators`, `/how-it-works` | marketing | Restyle | Section rhythm 96px, H2 34. `/how-it-works#faq` keeps the FAQ (accordion: white cards, + icon rotates 45°). |
| `/onboarding`, `/signin`, `/signup` | auth | Restyle | Centred 440px card on `#F7F7F9`. Logo above. Social buttons are ghost pills. |
| `/profile`, `/profile/edit` | account | Restyle | |
| `/saved` | creator | Restyle | |
| `/settings` | settings | Restyle | The section nav is a vertical pill list in a white card on desktop, and a list page on phone. |
| `/wallet` | money | Restyle | Balance KPIs use the KPI style. Payout sheet unchanged. |
| `/billing` | money | Restyle | Receipts table in the table style |
| **New** `/productivity` | productivity | **New** (5.9) | |
| **New** `/more` (phone) | shell | **New** (5.6.2) | |
| **New** `/services/*`, `/for/*` | marketing | **New** (5.8.4) | |

### 5.4.3 Status chips (one mapping, used everywhere)
All chips are 12.5/500 pills.

| Meaning | Statuses | Text / fill |
|---|---|---|
| Waiting on someone | `offered`, `sent`, `viewed`, `in_review`, `checking`, `authorized` | `#1D1D1F` / `rgba(29,29,31,.06)` |
| Active / moving | `open`, `in_progress`, `revision`, `shortlisted`, `held`, `due` | `#0B0B0C` / `rgba(52,240,108,.18)` |
| Done / good | `completed`, `approved`, `released`, `live`, `paid`, `hired` | `#16A34A` / `rgba(52,240,108,.14)` + ✓ |
| Needs attention | `delivered` (for the brand), `changes_requested`, `pending` (locked money) | `#B45309` / `rgba(245,158,11,.14)` |
| Negative / closed | `declined`, `cancelled`, `disputed`, `rejected`, `removed`, `refunded`, `returned`, `withdrawn`, `closed` | `#E5483B` / `rgba(229,72,59,.10)` |

### 5.4.4 Shared shell pieces
- **Desktop nav:** identical to Part 4 §4.2 on every page. Links: Discover, **Services ⌄** (5.8), Work, Messages, Profile; the active link gets the green dot; signed-out visitors see Discover, Services, **How it works**, then "Sign in" (ghost) and "Get started" (primary dark) instead of the bell and avatar.
- **Sheets/modals** (`components/ui` Sheet): white 96% surface, radius 30 (desktop centred) / 28 top corners (phone bottom sheet); glass header; grabber on phone; scrim `rgba(11,11,12,.42)` + `blur(4px)`.
- **Toasts:** dark pill `#1D1D1F`, white 14/500 text; an optional green dot for success; bottom-centre; above the tab bar on phone.
- **Notifications sheet:** restyled list rows with an unread green dot.

---

## 5.5 Post-agreement flows: keep everything, restyle only

These flows already exist in `components/commission`, `components/requests`, `components/money` and `lib/types.ts`. **Do not remove or simplify any step, state, copy or timer.** Only apply the 5.3/5.4 styling.

### 5.5.1 Flows that must keep working (checklist)
1. **Offer:** direct offer `offered` → accept / decline. Includes the business's attached offer message.
2. **Hire from pitches:** hire sheet → `hired` → `funded`. Payment `authorized` → `held`.
3. **In progress:** brief updates, due-date changes, messages thread linked by `threadId`.
4. **Delivery** (`deliver-sheet.tsx`): creator uploads version N with a note and files; checklist of the brand's open notes (resolve before sending); **success modal** (5.5.3).
5. **Review window:** the delivery is `in_review`; the brand reviews with **timestamped comments** on the video; approve or request changes (counts against `revisionsIncluded`); **auto-approval at `autoApproveAt`** if the brand does not respond (3 days); the countdown is visible to both sides.
6. **Revision loop:** `revision` → new version → review again. Shows the revisions used vs included.
7. **Approval and payment:** `approved` → payment `released` (direct orders); campaign slots go `pending` (locked until month end, and only if the post stays live) → `released`.
8. **Campaign posting:** the creator posts on their own account; verification: post status `due → checking → live`, `tagFound`, `disclosureFound`; "Removed" locks the payment; review copies are **watermarked and low-quality until approved**.
9. **Reviews:** the brand rates the creator (public); the creator gives private `clientFeedback` about the brand.
10. **Cancel / dispute:** `cancelled` with reason, `disputed`, refund → `refunded` / `returned`.
11. **Money:** wallet: pending, withdrawable, payouts (`processing`, `paid`); month close; billing receipts; payment and payout methods.
12. **"Needs you"** (`components/work/needs-you.ts`): every action item above still appears in Work, with the same priority.
13. **Next-step panel** (`components/commission/next-step.tsx`): every message and branch stays. Examples: "Their review copy comes here, watermarked until you approve it."; "If they don't respond, it's approved automatically on {date}."; the "post was taken down" lock message; "Keep it up until month end".

### 5.5.2 Visual treatment of these flows
- **Commission workspace** (`commission-workspace.tsx`):
  - Desktop: two columns. Left: video/review area on a white 28 card. Right: a sticky "Next step" card, then a timeline card.
  - Phone: one column. Next step as a **sticky bottom glass bar** with the primary action.
- **Next-step card:**
  - The **primary action** button is green, black text. Examples: "Approve", "Send version 2", "Mark as posted".
  - The secondary action is a ghost pill. Example: "Request changes".
  - The deadline line is shown with a small clock icon. It turns `--y-warning` within 24h and `--y-danger` when overdue.
- **Auto-approval countdown:** a progress track (6px, track `rgba(29,29,31,.06)`, fill `#34F06C`) plus the text "Auto-approves Sat 7 Nov".
- **Review area (`review-area.tsx`):**
  - comment pins on the video timeline are green dots;
  - resolved comments are grey with ✓;
  - the comment composer is an input pill with a "@ 0:12" time chip.
- **Version tabs:** a segmented pill control ("v1 · v2 · v3"). The current version is dark.
- **Timeline** (`events`):
  - vertical line `rgba(29,29,31,.08)`;
  - event dots 8px: green for money events, dark for actions, red for cancel/dispute;
  - text 14 `--ink`, time 12 `--soft`.
- **Money lines:**
  - KPI style;
  - "held" shows a lock icon;
  - "released" shows a green ✓ chip.

### 5.5.3 Celebration / confirmation modals (keep, restyle)
**Reference** (owner screenshot): title **"Version 1 is with Qalamy"**, an illustration of three blob characters (blue, green, yellow), and the body text below. Template: `deliver-sheet.tsx` line ~142.
> "We've let them know. They have until Sat 7 Nov to review. If they don't respond, it's approved automatically and $570 is released to you."

**Primary button:** black **Done** pill.

**Spec for every modal of this kind:**
- **Container:**
  - centred modal (desktop) 440px wide, radius 30, white 96%, `--card-shadow`, padding 28;
  - on phone a bottom sheet with radius 28 top corners;
  - scrim as in 5.4.4.
- **Illustration:**
  - **keep the blob characters** (blue `--y-c-sea`, green `--y-c-mint`, yellow `--y-c-sun`; also violet/coral where used);
  - 160px tall, centred;
  - a gentle entrance: blobs rise 12px with `--y-ease-pop`, staggered 60ms. No motion under reduced-motion.
- **Title:** 24/600, −0.5px, `--ink`, centred, max 2 lines.
- **Body:** 15/400, `--muted`, centred, line-height 1.55.
  - Dates are **dynamic**: weekday + day + month, e.g. "Sat 7 Nov".
  - Amounts are dynamic, e.g. "$570". Format by the account currency (USD/CAD).
- **Buttons:**
  - **Done:** full-width pill h50 in the **primary dark** style (gradient, white 600). The hover-to-green rule applies on desktop.
  - An optional secondary text link under it: "View order", in `--muted` with an underline on hover.
- **Variants that use the same template:**
  - "Version N is with {brand}" (direct);
  - the campaign "They see it watermarked…" version;
  - "Offer sent";
  - "You're hired";
  - "Approved, ${amount} released";
  - "Payout on its way";
  - "Post verified".
- **Accessibility:**
  - focus moves to the title on open;
  - Esc closes;
  - Done returns focus to the trigger;
  - the illustration is `aria-hidden`.

### 5.5.4 Comments on delivered videos (extend the existing notes)

**What exists today:**
- The repo already has **timestamped notes** on each delivery: `Delivery.comments`, `review-area.tsx`, `actions.addComment`.
- The brand adds them while a version is `in_review`.
- The creator can only see and resolve them, and they are used to request changes.

**What is missing, and what to add:**
- a two-way conversation per note;
- a clear comments area inside the order's **Deliveries** list;
- comments after approval.

**Where the comments appear.** In the order page (`/orders/[id]`, commission workspace), the **Deliveries** list shows one row per version. The row is created right after the creator taps **Send** in the deliver sheet. Each row shows:
- Thumb 9:16 (56px) and "Version N".
- Delivered date and status chip (5.4.3).
- A comment count badge: speech-bubble icon + number. Green dot when there are unread comments.
- Opening a row expands it, or opens the review area on phone. Inside:
  - the video player with the comment pins on its timeline;
  - the **Comments** panel beside it on desktop (right column, 360px), or under it on phone.

**Comment model.** Extend the current type; don't replace it.
```ts
export type DeliveryComment = {
  id: string;
  atSec: number | null;          // null = general comment on the whole video (new)
  text: string;
  author: Role;                  // "business" | "creator"
  authorId: string;              // member or creator id (new) → name + avatar
  resolved: boolean;
  createdAt: string;
  editedAt?: string;             // (new)
  replies: {                     // (new) one level deep, no nested threads
    id: string; author: Role; authorId: string; text: string; createdAt: string; editedAt?: string;
  }[];
  attachments?: { name: string; url: string; kind: "image" | "file" }[]; // (new) screenshot / reference
  reactions?: { emoji: "👍" | "🔥" | "✅"; by: string[] }[];             // (new, optional)
};
```

**Who can do what:**

| Action | Brand (any team member) | Creator |
|---|---|---|
| Add a timestamped or general comment | ✓ any version, any time until the order closes | ✓ any version, any time until the order closes (e.g. "I kept the hook here because…") |
| Reply to a comment | ✓ | ✓ |
| Edit / delete own comment or reply | ✓ within 15 min, or until the next version is sent; shows "edited" | same |
| Resolve a comment | ✓ | ✓ (as today, when working on the next version) |
| Re-open a resolved comment | ✓ | — |
| Request changes | ✓ (uses the open comments, as today) | — |

**Composer:**
- An input pill under the list: "Add a comment at 0:12…".
- The **time chip** (`@ 0:12`) is filled from the player position. Tap the chip to toggle it off, which makes a general comment.
- **Enter** sends; **Shift+Enter** adds a new line.
- Attach button: image or file, 10 MB max.
- Mentions with `@` for team members on the brand side.

**Comment item:**
- time chip (jumps the player) or a "General" chip;
- avatar 28, name, time ago;
- the text;
- actions: Reply · Resolve · •••;
- the replies indented under it (avatar 22), with a "Reply" input that opens inline.

**Resolved comments** collapse into a "N resolved" toggle at the bottom.

**Pins on the video timeline:**
- green dot = open, grey = resolved;
- hover shows the first line;
- click jumps and highlights the comment.

**Rules tied to the existing flow** (nothing in 5.5.1 changes):
- Comments on the **latest version while `in_review`** are what "Request changes" sends. That is today's behaviour.
- When version N+1 is sent, the open comments on version N are marked resolved, as today. The thread stays readable on version N.
- **Leaving a comment or reply does not stop the auto-approval timer.** Only "Approve" or "Request changes" does.
  - Show this under the composer: "Comments don't pause the review. Approve or request changes before Sat 7 Nov."
- **After approval / completion**, comments stay open for **30 days**. Use them for final feedback, small questions, and posting details. Then they become read-only.
- Campaign review copies stay watermarked. Comments work on them the same way.
- **Disputes:** all comments and replies are kept, never deleted from the server; a soft delete is shown as "Comment deleted". They are visible to Yapp support as evidence.

**Notifications:**
- A new comment or reply on your order → an Alerts item and a push: "{Name} commented at 0:12 on Version 2". It opens the order with the comment highlighted.
- Grouped when several are sent within 2 minutes ("Qalamy left 4 comments on Version 1").
- The thread in **Messages** gets a system line: "4 new comments on Version 1 · View". This links back; the comment text is not duplicated.

**"Needs you" (Work):**
- Brand: "Version N is ready: review before {date}" (existing).
- Creator: "{Brand} replied to your comment" when a reply is unread.

### 5.5.5 Messages (kept)
`/messages` **stays**. It is the only channel between brand and creator.

**Why it stays:**
- clarifying the brief before and during work;
- **pitches** and direct offers need a conversation;
- **payment protection and disputes** rely on the written record;
- the contact notice already stops people from sharing contact details to take deals off the platform.

**Rules:**
- **One thread per order.** It links to the order (`threadId`) and shows a mini order card at the top: title, status chip, next deadline, "Open order".
- **Video feedback lives in the comments (5.5.4), not in Messages.** Messages are for everything else. Messages only show a system line linking to new comments.
- **System lines:** short grey pills in the thread for order events (hired, version sent, changes requested, approved, payment released).
- **Pre-order messages:** allowed only around a request, a pitch or an offer. There are no cold DMs to creators without one, so creators aren't spammed.
- **Restyle only** (5.4.2):
  - thread list on a white card;
  - my bubbles `#1D1D1F` with white text, theirs white;
  - composer is an input pill with attach and send (send is a green circle).
- **Phone:** Messages is reached from the Work tab (a "Messages" chip at the top with an unread count) and from notifications. It does not get its own tab; the tab order in 5.2.1 stays.

---

## 5.6 Footer (desktop only) and the phone "More (•••)" page

### 5.6.1 Desktop footer
- **Where:** at the bottom of **every** desktop page. This includes logged-in pages: Work, Messages, orders, settings, wallet, billing, Productivity, products, profile, creators; auth pages (a compact version, below).
- **Design:** exactly Part 4 §4.11: `#141416` background, white links, hover `#34F06C`; 4 link columns + brand column; "© 2026 Line Node Technologies, Canada. All rights reserved." (Canada only).
- **Replace** the current `components/shell/site-footer.tsx` content with the Part 4 columns. Add a **Services** column:

| Services | Product | Company | Resources | Legal |
|---|---|---|---|---|
| Creator Network | Discover | About us | FAQ | Privacy policy |
| UGC ads | Work | Careers | Help center | Terms of service |
| Native posts | How it works | Press | Creator guide | Cookie policy |
| Amplified ads | Get the app | Contact us | Brand guide | Creator agreement |
| Hook Lab | Pricing | | Blog | Accessibility |
| Go to market | Success stories | | | |
| For tech teams | | | | |
| For growth agencies | | | | |

  (Grid becomes `1.2fr | repeat(5,1fr)`, gap 48.)
- **Pages with a full-height layout** (Messages, the commission workspace): the footer sits **below the fold** after the app area; the app area keeps `height: calc(100vh − nav − 32px)`, so the footer does not squeeze it; the user scrolls the page to reach it.
- **Auth/onboarding pages:** compact footer. A single row: logo, 4 links (Privacy, Terms, Help, Contact), © line.
- **Not rendered:** inside the native app, on any viewport ≤ 760px, and inside the "Get the app" iframe preview.

### 5.6.2 Phone "More (•••)" page — route `/more`
- **Entry points:**
  1. the **•••** icon at the top right of the Discover header (and of Profile and Work headers);
  2. the **"More"** row at the bottom of the account sheet (5.9.1).
- **Layout:**
  - **Header:** glass, back arrow, title "More".
  - **Body:** grouped list cards (white 90%, radius 28). Rows are h52, 15/500, with a chevron. Group titles are eyebrow style (12/500 uppercase `--muted`).
  - **Group order:**
    1. **Services:** Creator Network, UGC ads, Native posts, Amplified ads, Hook Lab, Go to market, For tech teams, For growth agencies.
    2. **Product:** How it works, Pricing, Success stories.
    3. **Get the app:**
       - **Phone web:** App Store and Google Play buttons (black pills with store logos), "Open in app" (deep link).
       - **Native app:** "Rate Yapp", "Share Yapp", "Check for updates".
    4. **Help:** FAQ, Help center, Creator guide, Brand guide, Contact us, Report a problem (opens a form with device info prefilled).
    5. **Company:** About us, Careers, Press, Blog.
    6. **Legal:** Privacy policy, Terms of service, Cookie policy (on web) / Data & tracking (in app), Creator agreement, Accessibility, **Licenses** (open-source notices).
    7. **Preferences:** Language (English; French ready for Canada later), Region (🇨🇦 Canada / 🇺🇸 United States), Currency (CAD/USD, follows the account), Appearance (System/Light).
    8. **Technical:** App version + build (e.g. "Yapp 1.4.0 (212)"), web build hash on web, status page link, Clear cache (app only, with a confirm sheet), Device ID copy (support).
  - **Social row:** 4 circles (TikTok, Instagram, LinkedIn, X), 44px. Hover/press → green fill, black icon.
  - **Bottom:** "© 2026 Line Node Technologies, Canada. All rights reserved." 12px `--soft`, centred, then padding for the tab bar and safe area.
- The tab bar stays visible on `/more`. No tab is highlighted.
- On desktop, `/more` → **301 to `/`** (the footer covers it).

---

## 5.7 Design-defect fixes and audit

### 5.7.1 Hot categories (Discover file 03): rows shift right / misalign
- **Cause:**
  - the grid `16px | 78px | 1fr | 46px` gives the name column 78px;
  - long names ("Gadgets & audio", "E-commerce tech", "Consumer apps") overflow it and push the bar and value right;
  - rows therefore don't line up, and the block looks shifted right inside the file.
- **Fix:**
  - Grid `20px | minmax(0,128px) | minmax(0,1fr) | 52px`, `column-gap:12px`, `align-items:center`.
  - Name: `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`, with a `title` attribute for the full name.
  - Rank: `font-variant-numeric: tabular-nums; text-align:right`.
  - Value: `tabular-nums; text-align:right; white-space:nowrap`.
  - The list block has **the same left/right padding as the file header** (24px). Remove any extra `margin-left` or `padding-left` on the list wrapper. Inspect for a stray 8–12px offset and delete it.
  - Bars all start at the same x. Their width is relative to #1 (unchanged).
- Re-check at 1280, 1440 and 1920 widths and on phone (390). The 4 columns must line up vertically across all 8 rows.

### 5.7.2 Same class of bug elsewhere (fix the same way)
Any row that has a **fixed-width text column followed by a bar or value** must use `minmax(0, Npx)` + ellipsis + tabular numbers:
- Live briefs rows (brand name / title column);
- Ad results rows (file 04) and the side panel "Metric" rows;
- creator rows (`prow`) and horizontal bars (`hb`) in the side panel;
- the comparison table first column;
- the Productivity tables and breakdown bars (5.9);
- Wallet and Billing rows (amount column right-aligned, tabular);
- Work rows (title truncates, status chip never wraps).

### 5.7.3 Global audit checklist (do it on every page after the restyle)
1. **No horizontal overflow** at 390, 768, 1024, 1280, 1440 and 1920. `document.documentElement.scrollWidth === innerWidth`.
2. **Alignment:** every section uses the page container (`max-width:1520`, side padding 72 desktop / 20 phone); card edges line up with the nav's left/right edges.
3. **Grids:** use `minmax(0,…)` columns and `min-width:0` on flex/grid children that contain text or media.
4. **Numbers:** `tabular-nums` everywhere digits change or line up (KPIs, money, tables, timers).
5. **Text:** no orphan single word on H1/H2 (`text-wrap: balance`); body text max 68ch; nothing touches a card edge (min padding 20 on phone, 24 on desktop).
6. **Fonts:** Inter only; no stray system font or 700 weight outside the wordmark. Check `getComputedStyle` on 20 random nodes per page.
7. **Colour:** no white text on green; no beige `#EEEEEA` left; contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and icons.
8. **Radii:** buttons, chips and inputs are pills (inputs 14); cards 28; inner blocks 16–18. No 6/8px leftovers.
9. **Spacing:** sections 96px apart (64 phone). Card padding 24–28. Consistent 12/16/24 gaps.
10. **Sticky and z-index:** order: nav (100) > sheet/modal (90) > side panel (80) > sticky bars (50) > content; nothing hides under the nav or tab bar.
11. **States:** hover, focus-visible (green ring), active (scale .98), disabled (40% opacity, no pointer), loading (skeletons with the card shape), empty, error.
12. **Motion:** count-ups run once; no infinite animation except intentional marquees (ticker, logo band, explore strip), and those pause on hover and under reduced-motion.
13. **Images and video:** `object-fit: cover`, fixed aspect boxes (9:16 for reels) so nothing jumps while loading.
14. **Console:** zero errors and zero hydration warnings on every route.

---

## 5.8 Services dropdown (desktop nav)

### 5.8.1 Naming (ours, not Billo's; "UGC ads" stays)
Nav trigger label: **Services ⌄**. Two columns.

**Column 1, "What we do":**

| Item | Description (one line) | Route |
|---|---|---|
| **Creator Network** | Work long-term with vetted tech creators | `/services/creator-network` |
| **UGC ads** | Scroll-stopping videos built for paid social | `/services/ugc-ads` |
| **Native posts** | Creators post your product on their own accounts | `/services/native-posts` |
| **Amplified ads** | Run creator posts as ads from their handle | `/services/amplified-ads` |
| **Hook Lab** | Test several openings on one video to find the winner | `/services/hook-lab` |
| **Go to market** | Launch a new product with a wave of creator videos on day one | `/services/go-to-market` |

**Column 2, "Who it's for":**

| Item | Description | Route |
|---|---|---|
| **For tech teams** | Apps, SaaS, AI tools and gadgets | `/for/tech-teams` |
| **For growth agencies** | Performance teams running many brands | `/for/agencies` |

**Bottom strip:** "New to Yapp? **See how it works →**" (link `/how-it-works`) on the left, and "**For creators →**" (link `/for-creators`) on the right.

- "Native posts" maps to the existing **campaign slots with posting + verification**.
- "Amplified ads" requires the creator to grant ad access (an add-on).
- "Hook Lab" is the hook-variation add-on.
- "Go to market" is a **launch bundle**: one order with several creators (default 5–10), the same launch date, a shared brief, and videos for both ads and native posts. It uses the existing campaign model (`source: "campaign"`, multiple slots); the order wizard opens with `?service=go-to-market` and preselects the campaign type and the launch date step.
- Use the existing `AddonId` list; if an add-on is missing, add it to `lib/taxonomy` / types.

### 5.8.2 Panel design
- **Panel:** anchored under the nav, aligned to the trigger's left edge, 12px gap; width 640; **glass** like the nav (`rgba(255,255,255,.72)` + blur 24 + saturate 180, 1px white 70% border), radius 24, shadow `0 24px 64px -16px rgba(20,20,40,.18)`; padding 12.
- **Columns:** grid `1.25fr | 1fr`, gap 8; each column has an eyebrow title (12/500 uppercase +0.08em `--muted`, padding 12 14 6).
- **Item:** padding 12 14, radius 16; grid `36px | 1fr`, gap 12; **Icon tile:** 36×36, radius 12, `rgba(29,29,31,.05)`, 18px ink icon. Icons: Creator Network = users, UGC ads = clapperboard, Native posts = send, Amplified ads = megaphone, Hook Lab = flask, Go to market = rocket, For tech teams = cpu, For growth agencies = briefcase; **Title:** 15/600 `--ink`; **Description:** 13.5/400 `--muted`, 1 line, ellipsis.
  - **Hover / focus:**
    - item background `rgba(255,255,255,.85)` + card shadow;
    - icon tile turns **green `#34F06C`** with a black icon;
    - title unchanged.
- **Featured item:** "UGC ads" carries a small "Most popular" chip (11/500 pill, black on `rgba(52,240,108,.2)`).
- **Bottom strip:** 13.5/500, radius 16, `rgba(29,29,31,.04)`, padding 12 16, `space-between`. The arrows move 2px on hover.
- **Trigger:** same style as the other nav links, with a 14px chevron that rotates 180° when open; while open, the trigger gets the pill hover background; the active-route green dot shows when the current route starts with `/services` or `/for/`.

### 5.8.3 Behaviour
- **Desktop (pointer):** opens on hover after **120ms** intent delay; closes 200ms after the pointer leaves both the trigger and the panel. Use a safe-triangle or bridge area so diagonal movement doesn't close it.
- **Click/tap and keyboard:** a click toggles it; **Enter/Space/↓** opens and focuses the first item; arrow keys move through items (↑↓ within a column, ←→ between columns); **Esc** closes and returns focus to the trigger; Tab past the last item closes it.
- **ARIA:** trigger `aria-haspopup="true"` + `aria-expanded`; panel `role="menu"` with `role="menuitem"` links. A navigation-disclosure pattern is also acceptable.
- **Animation:** opacity 0→1 and `translateY(-6px)`→0 plus scale .98→1 over 180ms `--ease`; close in 120ms; none under reduced-motion.
- **Other rules:** only one nav menu is open at a time. Opening the account menu closes Services; signed-in and signed-out users see the same menu.
- **Phone:** no dropdown. The same items are in **More → Services** (5.6.2). The marketing pages are reachable from there.

### 5.8.4 Service pages (template)
Each `/services/*` and `/for/*` page uses one **marketing template** built from Discover components (no new components):
1. **Hero:**
   - eyebrow (service name);
   - H1 (≤ 8 words);
   - 1 line of body;
   - primary green "Start an order" (→ `/orders/new?service=<id>`) + ghost "See creators" (→ Discover explore strip filtered);
   - right side: one file-style stat card relevant to the service (e.g. Hook Lab → hook rate; Amplified ads → CTR/CPA; Go to market → reach in the first 7 days).
2. **How it works:** the stepper (4.4) with 3–4 service-specific steps.
3. **Proof:** 3 story cards from the success-stories fan (4.7), filtered by service.
4. **What's included / pricing note:** white card with a ✓ list. Prices come from the existing package and add-on data, never hard-coded.
5. **FAQ:** 4–6 questions (accordion).
6. **Dark CTA** (4.10), then the footer.

Copy for these pages is supplied by the owner. Use clear placeholders marked `TODO(copy)`.

---

## 5.9 Productivity page (new) — `/productivity`

A detailed performance page for **both sides**:
- the **brand** (who orders and runs the ad);
- the **creator** (who makes it).

It covers reach, money, results, and the people they worked with. It goes deeper than the Discover file cabinet:
- CAC;
- Yapp index / spend;
- categories;
- ad results.

### 5.9.1 Entry point (account menu)
In the account sheet/menu (`components/shell/account-sheet.tsx`), the order becomes:
1. **Header tile:** avatar, **username / full name**, subtitle (unchanged).
2. **View your public account:** rename of "View public profile".
   - Creators → `/creators/[handle]`.
   - Business accounts → their public brand page if one exists; otherwise hide this row.
3. **Productivity** — **new**:
   - icon `chart-line`;
   - label "Productivity";
   - right side: a small delta chip with the main KPI vs last period, e.g. "↗ 12%" (creator: earnings; brand: CAC change, where lower is better, so it shows green when CAC goes down).
4. Then the existing `accountNav` items unchanged: Wallet, Billing & receipts, Products, Saved creators, Settings.
5. **More** (phone only, 5.6.2).
6. Switch account (demo, unchanged).
7. **Log out**: a single row, `--y-danger` text, with a confirm sheet ("Log out of Yapp?" · Log out / Cancel).
   - **Remove "Log out and forget this account"** everywhere: the account sheet (phone + desktop), the mobile app's `#acctSheet`, and Settings.
   - Logging out always keeps the remembered account on the device (the sign-in screen shows it for one-tap sign-in).
   - Removing a remembered account from a device is done only from the sign-in screen (••• on the remembered account → "Remove from this device").

On desktop, the account menu opens from the nav avatar as a dropdown panel. It uses the same glass panel style as Services (5.8.2), width 340, anchored right.

### 5.9.2 Roles and switching
- **Role is detected from the account:**
  - `creatorId` → creator view;
  - `memberId` / business → brand view.
- Accounts that are both (or switch accounts) see a **segmented pill** at the top: "As a brand · As a creator". The choice is remembered in `?as=` and local preference.
- **Team members of a business:**
  - every member sees brand metrics;
  - financial cards (5.9.4 §F) are visible only to roles with billing permission (`settings/team`);
  - others see "Ask an admin for access".

### 5.9.3 Page layout (both roles)
- **Desktop:** page container as Discover; content max-width 1376.
- **Header row:**
  - left: eyebrow "PRODUCTIVITY", H1 34/600 "How your Yapps are performing" (brand) / "How your work is performing" (creator);
  - right, the toolbar (glass pill bar):
    - **Date range** dropdown chip: Last 7 days / **30 days (default)** / 90 days / 12 months / Year to date / Custom (calendar popover);
    - **Compare** toggle ("vs previous period" / "vs same period last year");
    - **Filters** chip: opens a sheet with category, format, creator/brand, order/campaign, platform (TikTok, Instagram, YouTube, Meta ads, Google ads);
    - **Export** chip: CSV (all tables), PDF (page snapshot), and "Schedule weekly email";
    - brand only: **Connect ad accounts** chip, showing a green dot when connected.
- **Sticky sub-nav** (glass, under the main nav when scrolling). Anchor pills to the sections below. The active section gets the dark pill.
- **Phone:** header stacks; the toolbar becomes a horizontal scroll of chips; KPI strip = horizontal snap scroller (cards 78% width); tables become stacked cards (2–4 key fields + chevron → detail sheet); charts are full-width at 200px height.
- **Visual rules:**
  - KPI cards alternate white/green as on Discover. Only **one** green card in the KPI strip: the hero metric.
  - Charts use the Part 4 chart component (4.3.4): smooth Catmull-Rom lines, clip-path reveal, HTML hover overlay, green line `#1FC75A` on white and black on green.
  - Every metric has an **ⓘ** that opens the "Metric" side panel (4.12.3) with the definition (5.9.6), the 12-month trend and the benchmark.

### 5.9.4 Brand view — sections

**A. KPI strip** (8 cards, 4 per row on desktop). Each card shows:
- label;
- value (KPI style, weight 400, count-up once);
- delta chip vs comparison (green good / red bad, with the "good" direction per metric);
- 30-point sparkline.

Cards:
1. **CAC** (hero, green card): blended cost to acquire a customer from Yapp creatives. Needs a connected ad account and a conversion event; otherwise shows "Connect to see CAC".
2. **Spend on Yapp:** order totals + fees in the period.
3. **Videos delivered:** approved deliveries.
4. **Cost per video:** spend ÷ approved videos. Compared with the agency typical value (Yapp index benchmark).
5. **ROAS:** attributed revenue ÷ ad spend on Yapp creatives.
6. **CTR:** link clicks ÷ impressions.
7. **Hook rate:** 3-second views ÷ impressions.
8. **Reach:** unique people reached by Yapp creatives (ads + native posts).

**B. Spend & results over time.** Area/line chart with:
- a toggleable metric selector (Spend, CAC, CTR, Hook rate, Reach, Conversions);
- a second series for comparison (dashed `--soft`);
- order-approval events as small dots on the x-axis;
- hover shows all values for that day.

**C. Creators you worked with** (people performance). Table:

| Column | Notes |
|---|---|
| Creator | avatar 32, name, @handle, category chip |
| Orders | count in period (and lifetime on hover) |
| Videos | approved |
| On-time | % delivered by due date |
| First-pass approval | % of orders approved on version 1 |
| Avg revisions | used ÷ orders |
| Hook rate | of their videos (ad data) |
| CTR | |
| CPA | ad spend ÷ conversions for their videos |
| Spend | paid to them + fees |
| Your rating | stars you gave |
| Action | "Rehire" (→ `/creators/[handle]/commission`) and ••• (message, save, view orders) |

- Sort by any column; default sort is CPA ascending, where data exists, then spend.
- Row click opens the **creator side panel** (4.12.1) with a "With you" tab:
  - their videos for you;
  - per-video results;
  - the timeline of orders.
- **Top performer** badge (green pill) on the best CPA with ≥ 1,000 impressions.
- Rows below the data threshold show "—" with the tooltip "Not enough data yet".

**D. Ad results by video.** A grid of video cards (9:16 thumbs, 4 per row desktop / 2 phone). Each card has:
- creator;
- format chip;
- hook rate, CTR, CPA, spend;
- status (Live / Paused / Not running);
- actions: "Order a variation" (prefilled order, same creator) and "Run in Hook Lab".

Sort: best CPA, most spend, newest. Clicking a card opens the video in a story panel with a per-day chart.

**E. Categories & formats.** Two cards side by side (stacked on phone), both with the fixed grid from 5.7.1:
- **By tech category** (the 8 categories): horizontal bar rows — share of spend, CTR, CPA — plus a **Yapp benchmark** tick on each bar (the category median across the platform).
- **By format** (App demo, Screen walkthrough, Unboxing, Problem → solution, Comparison, Testimonial, Talking head, Voiceover): same rows.

A "What to try next" line under each card is generated from the data. Example: "Problem → solution beats your average CPA by 28%. Order 2 more."

**F. Money** (billing permission):
- **Cards:**
  - Spent (period);
  - **Held now** (money secured for active orders);
  - Released to creators;
  - Refunded;
  - Fees paid (service fee, charged only on completion);
  - **Releasing soon:** the sum of deliveries with an upcoming auto-approval, with the next date.
- **Chart:** monthly spend, stacked bars of creator pay vs fees.
- **Table:** invoices and receipts (date, order, amount, status, PDF link → `/billing`).
- **Budget:** optional monthly budget input. Shows a progress bar and a warning at 80% and 100%.

**G. Pipeline & speed** (how the brand itself works with creators):
- open orders by status (status chips 5.4.3 with counts);
- average turnaround (hire → approval);
- **your average review time**;
- **auto-approvals** (count of deliveries you didn't review in time; shown as a gentle warning);
- pitches received per request;
- time to hire.

**H. Benchmarks vs Yapp index.** One card:
- your CAC, cost per video, CTR and hook rate vs the platform median for your categories (dot-on-range bars);
- the Yapp index headline (e.g. "$15.2M spent on Yapp in the last 7 months");
- the line "Benchmarks use anonymised data from brands in your categories, minimum 20 brands."

### 5.9.5 Creator view — sections

**A. KPI strip** (8 cards):
1. **Earnings** (hero, green): released in the period. Creators keep 100% of their price.
2. **Pending:**
   - in review / held;
   - plus locked campaign money, with a breakdown on ⓘ: "In review $X · Locked until month end $Y".
3. **Withdrawable now**, with a "Withdraw" button (opens the existing payout sheet).
4. **Videos delivered**, approved.
5. **On-time rate.**
6. **First-pass approval.**
7. **Rehire rate:** brands who ordered again ÷ brands worked with.
8. **Reach:**
   - views of your Native posts (verified posts);
   - plus impressions of your videos run as ads, **only where the brand shares data** (5.9.7).

**B. Earnings over time.** A chart of earnings released vs pending. The payout events are marked.

**C. Brands you worked with.** Table:

| Column | Notes |
|---|---|
| Brand | logo square 32 (brand colour), name, category |
| Orders | in period / lifetime |
| Earned | from this brand |
| Their review speed | avg time to approve |
| Revisions asked | avg per order |
| Auto-approved | count, meaning they didn't review in time |
| Your rating from them | stars |
| Your private feedback | stars (only you see this) |
| Repeat | "Repeat client" chip if ≥ 2 orders |
| Results shared | ✓ if the brand shares ad results |
| Action | "Message" / "Pitch again" |

Row click opens a brand side panel: orders timeline, money, and the shared ad results per video.

**D. Your videos' performance.** The same video-card grid as the brand view, D, limited to:
- videos with shared ad data;
- verified native posts (views, likes, comments, saves, post status Live/Removed).

A creator **never** sees a brand's CAC, ROAS or revenue. Only creative-level metrics: impressions, hook rate, CTR, view-through.

**E. Categories & formats you win in.** Rows (fixed grid):
- orders, earnings and average hook rate per category and per format;
- the platform median tick for hook rate.

Tip line generated from the data, e.g. "Your Unboxing videos hook 1.4× the median. Add an Unboxing package."

**F. Pitches funnel.**
- Sent → Viewed → Shortlisted → Hired. Horizontal funnel bars with % between steps.
- Win rate.
- Average pitch price vs average hired price.
- Response time to new requests.

**G. Money.**
- Payouts table: date, method (last 4 only), amount, status `processing/paid`.
- Monthly earnings by brand (stacked bars).
- **Year-end statement** download (PDF/CSV).
- Payout method shortcut (→ `/wallet`).

**H. Reputation.** Rating (big number, 400 weight), review count, the last 3 public reviews (cards from 4.8), and the badges earned (e.g. "On-time 95%+").

### 5.9.6 Metric definitions (show in the ⓘ panel; compute exactly like this)
| Metric | Formula | Good direction | Min data |
|---|---|---|---|
| CAC | (Yapp spend + ad spend on Yapp creatives) ÷ new customers attributed | lower | 10 conversions |
| Spend on Yapp | Σ (price + add-ons + fees) of commissions **completed** in range (held money shown separately) | — | — |
| Cost per video | Yapp spend ÷ approved videos | lower | 1 video |
| ROAS | attributed revenue ÷ ad spend | higher | 10 conversions |
| CTR | link clicks ÷ impressions | higher | 1,000 impressions |
| Hook rate | 3-sec video views ÷ impressions | higher | 1,000 impressions |
| View-through | ThruPlays (15s or complete) ÷ impressions | higher | 1,000 impressions |
| CPC | ad spend ÷ link clicks | lower | 50 clicks |
| CPA | ad spend ÷ conversions (per creator / video) | lower | 5 conversions |
| Reach | unique accounts reached (platform-reported), ads + native posts | higher | — |
| On-time | deliveries of v1 on/before `dueDate` ÷ all v1 deliveries | higher | 3 orders |
| First-pass approval | orders approved on v1 ÷ approved orders | higher | 3 orders |
| Avg revisions | Σ `revisionsUsed` ÷ approved orders | lower | 3 orders |
| Rehire rate | brands with ≥ 2 completed orders ÷ brands worked with | higher | 3 brands |
| Review time (brand) | avg (approval or change-request time − delivery time) | lower | 3 deliveries |
| Earnings | Σ creator price + add-ons with payment `released` in range | higher | — |
| Pending | Σ `held` + `pending` (campaign locked) | — | — |
| Yapp benchmark | median of the metric across brands in the same category, last 90 days | — | 20 brands |

- Below the minimum: show "—" and "Not enough data yet". **Never** show a misleading 0% or 100%.
- Currency follows the account (USD/CAD). Mixed-currency data is converted at the day's rate, with a note.
- Time zone is the account's. Ranges include both ends.

### 5.9.7 Data sources and privacy
- **Platform data** (always available): orders, deliveries, revisions, timings, payments, reviews, pitches, native-post verification.
- **Ad accounts** (brand connects; optional):
  - read-only OAuth to **Meta Ads, TikTok Ads, Google Ads (YouTube)**;
  - matching ads to Yapp videos by:
    1. the Yapp video ID in ad name or UTM (`utm_content=yapp_<videoId>`);
    2. an uploaded-asset hash;
    3. manual linking in the video's ••• menu.
  - Sync every 6h, plus "Refresh now" (rate-limited to once per 15 min).
  - Show the "Last synced 2h ago" line under the toolbar.
  - Disconnect from Settings → Integrations at any time; the data is deleted after 30 days.
- **Conversions:** from the connected ad platform's conversion events, or the Yapp pixel/API (later). Until available, CAC/ROAS/CPA show the connect prompt.
- **Sharing with creators:**
  - per brand, **Settings → Sharing**: "Share video results with creators" (default **on**, creative-level metrics only);
  - it can be turned off per order.
  - Creators never see the brand's spend, revenue, CAC or ROAS.
- **Sample state:**
  - with no data at all (new account), the page renders with **sample data**;
  - every card carries the "● Sample data" chip (4.1.6);
  - a top banner: "This is what Productivity looks like. Place your first order to see your own numbers." with the primary button "Start an order" (brand) / "Find open orders" (creator).
- **Loading:** card-shaped skeletons. Charts show a flat grey line skeleton.
- **Errors:** an inline card per section ("Couldn't load ad results · Retry"). The rest of the page still renders.

### 5.9.8 Notifications tied to Productivity (optional, behind a flag)
- **Weekly summary:**
  - in-app notification and email, Monday 9am account time;
  - content: the hero KPI, best creator/video (brand) or earnings and best video (creator).
- **Alert:** "Your CPA on {video} doubled this week" (brand).
- **Alert:** "{Brand} shared results: your hook rate is 1.6× the median" (creator).

---

## 5.10 Data contracts (TypeScript, add to `lib/types.ts`)

```ts
export type Range = { from: string; to: string; compare?: "prev" | "yoy" | null };
export type Delta = { value: number; pct: number | null; good: boolean | null };
export type Kpi = {
  id: "cac"|"spend"|"videos"|"costPerVideo"|"roas"|"ctr"|"hookRate"|"reach"
     |"earnings"|"pending"|"withdrawable"|"onTime"|"firstPass"|"rehire";
  value: number | null;          // null = not enough data
  unit: "money"|"pct"|"count"|"ratio";
  currency?: "USD"|"CAD";
  delta?: Delta;
  spark?: number[];              // 30 points
  sample?: boolean;
  reason?: "not_enough_data"|"connect_ad_account"|"no_permission";
};

export type CreatorRow = {
  creatorId: string; orders: number; videos: number; onTime: number|null;
  firstPass: number|null; avgRevisions: number|null; hookRate: number|null;
  ctr: number|null; cpa: number|null; spend: number; rating: number|null; top?: boolean;
};

export type BrandRow = {
  businessId: string; orders: number; earned: number; reviewHours: number|null;
  revisionsAsked: number|null; autoApproved: number; ratingFromThem: number|null;
  myFeedback: number|null; repeat: boolean; resultsShared: boolean;
};

export type VideoResult = {
  videoId: string; creatorId: string; businessId: string; format: string; category: string;
  impressions: number|null; hookRate: number|null; ctr: number|null; viewThrough: number|null;
  cpa: number|null; spend: number|null; status: "live"|"paused"|"not_running";
  source: "meta"|"tiktok"|"google"|"native_post"|"manual";
};

export type Breakdown = { key: string; share: number; ctr: number|null; cpa: number|null;
  hookRate: number|null; benchmark: number|null; orders: number; amount: number };

export type MoneySummary = {
  spent?: number; held: number; released: number; refunded?: number; fees?: number;
  releasingSoon?: { amount: number; nextAt: string };
  earnings?: number; pending?: { inReview: number; lockedUntilMonthEnd: number };
  withdrawable?: number;
};
```

**Endpoints (all GET, auth required, `?as=brand|creator&from&to&compare&filters…`):**
- `/api/productivity/kpis` → `Kpi[]`
- `/api/productivity/timeseries?metric=` → `{ date: string; value: number|null; compare?: number|null }[]`
- `/api/productivity/creators` → `CreatorRow[]` (brand)
- `/api/productivity/brands` → `BrandRow[]` (creator)
- `/api/productivity/videos` → `VideoResult[]`
- `/api/productivity/breakdown?by=category|format` → `Breakdown[]`
- `/api/productivity/money` → `MoneySummary`
- `/api/productivity/pipeline` → status counts and timings (brand)
- `/api/productivity/funnel` → pitches funnel (creator)
- `/api/productivity/export?format=csv|pdf` → file
- `POST /api/integrations/{meta|tiktok|google}/connect`, `DELETE …/disconnect`, `POST …/refresh`

**Server rules:**
- every query is scoped to the signed-in account (and team permissions);
- benchmarks are only returned when ≥ 20 brands contribute;
- creators' responses never include brand spend, revenue, CAC or ROAS fields.

In the current demo store (`lib/store.ts`, `lib/selectors.ts`): implement selectors that compute the platform metrics from existing commissions, payments and pitches. Ad metrics come from seeded mock data flagged `sample: true`.

---

## 5.11 Analytics events (for us)
- **Services menu:**
  - `services_menu_open {source: hover|click|key}`
  - `services_item_click {item}`
- **Productivity:**
  - `productivity_open {as, entry: account_menu|deeplink|notification}`
  - `productivity_range_change`, `productivity_filter`, `productivity_export {format}`
  - `productivity_row_click {table}`
  - `ad_account_connect {platform, ok}`
- **Delivery comments:**
  - `delivery_comment_add {side, timestamped: bool}`
  - `delivery_comment_reply {side}`
- **More page:**
  - `more_open {entry}`
  - `more_item_click {item}`
- **App install:** `get_app_click {store, placement: discover_section|banner|more|footer}`

---

## 5.12 Acceptance criteria
1. **Desktop never renders the feed.** `/` on desktop is Discover; `/home` and `/more` redirect to `/`; shared `/v/[id]` opens the side panel. The feed bundle is not downloaded on desktop (check the network panel).
2. **The phone tab bar order is Home · Discover · Work · Alerts · Profile.** The feed stays identical to `YAPPS_MOBILE.html`, and the light/dark tab-bar tone switches correctly.
3. **Discover on phone:** glass header with search and •••; no footer; no phone-frame preview; the store banner shows on web and is hidden in the app; the last card is fully visible above the tab bar.
4. **No beige canvas remains on any page.** All cards, glass, pills, type and tokens match 5.3. The token values in `globals.css` match table 5.3.1.
5. **Every non-redesigned route** in table 5.4.2 has the same elements and order as before, restyled. Compare a before/after screenshot for each route.
6. **Every flow in 5.5.1 works end to end in the demo:** offer → hire → deliver v1 → comment → changes → v2 → approve → release; auto-approval on date; campaign post verify → month-end release; cancel and dispute; the "Version N is with {brand}" modal shows the blobs, the dynamic date and amount, and the Done pill.
7. **Footer:** present on every desktop route, including Work, Messages and Productivity (compact on auth); absent on every phone route and in the app; `/more` has all groups in 5.6.2, including app version/build and store links.
8. **Hot categories:** the 8 rows line up in 4 clean columns at 390/1280/1440/1920; long names ellipsize; the block is aligned with the file header padding; same for every row type listed in 5.7.2.
9. **The audit checklist 5.7.3 passes on every route:** no overflow, no console errors, Inter only, contrast OK.
10. **Services dropdown:** opens on hover (120ms) and click; full keyboard support and Esc; names exactly as 5.8.1 ("UGC ads" unchanged); the icon tile turns green on hover; on phone the same items are under More → Services; every link resolves (template pages with `TODO(copy)`).
11. **Account menu order:** name → **View your public account** → **Productivity** → Wallet → Billing & receipts → Products → Saved creators → Settings → (More on phone) → switch account → **Log out** (only). "Log out and forget this account" no longer exists anywhere.
12. **Productivity:** brand and creator views render every section in 5.9.4 / 5.9.5 with sample data; real platform metrics are computed per 5.9.6; the minimum-data rule shows "—" not 0; creators never receive brand spend, revenue, CAC or ROAS; CSV export matches the tables; the phone layout uses snap KPI cards and stacked table cards; KPI count-ups run once.
13. **Accessibility:** all new menus, sheets and modals trap focus correctly and close on Esc; all charts have a text summary (`aria-label` with the latest value and change); tap targets are ≥ 44px on phone.
14. **Delivery comments (5.5.4):** after a creator sends a version, it appears in the order's Deliveries list with a comment count; both sides can add timestamped or general comments and reply; pins sync with the player; comments don't stop auto-approval; comments stay open 30 days after completion; notifications and the Messages system line fire.
15. **Messages:** kept; every order has its own thread (5.5.5).
16. **Brand:** every logo instance uses the green, green, red dots (5.3.2); the © line reads "Line Node Technologies, Canada".

---

## 5.13 Decisions log
- Legal name: **Line Node Technologies** (© line).
- Logo: two green dots + one red notification-style dot (5.3.2).
- Logout: **Log out** only (5.9.1).
- Services: Creator Network, UGC ads, Native posts, Amplified ads, Hook Lab, **Go to market**, For tech teams, For growth agencies.
- Productivity money section for non-admin team members: hidden by default (5.9.2).
- Messages: **kept**, one thread per order (5.5.5).
- Delivery comments: extended to two-way threads in the Deliveries list (5.5.4).
