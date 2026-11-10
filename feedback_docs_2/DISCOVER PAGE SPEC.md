# YAPPS — Discover page (main page, desktop + mobile)

> **Discover is the main page of Yapp.** The nav has no "Home" link; the first nav item is **Discover**, and it is the active page after sign-in.
> **Preview file:** `YAPPS_DISCOVER.html`. Open it on a computer. Flip the stat files with the wheel or trackpad, hover the category panels and the story cards, and click anything to open the side panel. Resize to under 760px to see the phone layout.
> **Audience:** tech brands (AI tools, apps, SaaS, fintech, gadgets, gaming, health tech, e-commerce tech) in the US & Canada. They come here to **discover**: see proof, browse creators, understand the process. Placing an order happens on the **Work** page, not here.
> **Data note:** every number, brand and review in the preview is **sample data**. The UI shows a "● Sample" chip wherever a number appears. Production must bind every figure to real platform data (see 4.17).
> **Related files:** `YAPPS_DESKTOP_SPEC.md` (landing + sign-in), `YAPPS_MOBILE_SPEC.md` (mobile welcome + reels feed).

---

# PART 4 — Discover

## 4.0 Page map (top → bottom)

| # | Section | Purpose for a tech brand |
|---|---|---|
| 1 | **Nav** (fixed, glass) | Same bar as the landing page; Discover is active |
| 2 | **Hero**: headline + ticker + **Live briefs** (left) / **file cabinet** of stats (right) | "Does this work, and is it alive right now?" |
| 3 | **How it works**: 4-step stepper | "What happens after I post?" |
| 4 | **Brand band** (green strip) | Social proof, and a colour break between sections |
| 4b | **Get the app**: live phone preview of the mobile reels feed + App Store / Google Play | "Can I use this on my phone?" |
| 5 | **Explore strip**: 3D drifting category panels | "Who makes videos for my kind of product?" |
| 6 | **Success stories**: dark stage + fan of 5 cards | "Show me results from brands like mine" |
| 7 | **Reviews**: rating summary + 3 reviews | Trust |
| 8 | **Honest comparison** table + 4 trust cards | "Why Yapp and not an agency?" |
| 9 | **CTA** (dark) | Final push to Work |
| 10 | **Footer** (light black) | Legal, company, resources, rights |

**Side panel** (one component, right side on desktop, bottom sheet on phone) opens from almost everything: creators, briefs, stats rows, stories.

---

## 4.1 Design system (one system for the whole page; nothing outside it)

### 4.1.1 Tokens
```css
:root{
  --bg:#F7F7F9;          /* page background, identical to the landing page; no blobs or gradients behind content */
  --ink:#1D1D1F;         /* primary text */
  --muted:#6E6E73;       /* secondary text (landing value) */
  --soft:#9A9AA0;        /* tertiary text: axis labels, hints */
  --line:rgba(29,29,31,.06);
  --neon:#34F06C;        /* Yapp green: accent fills, active states */
  --on-neon:#0B0B0C;     /* text/icons ON green; never white on green */
  --green:#1FC75A;       /* chart lines on light surfaces (neon is too light for 2px lines) */
  --up:#16A34A;          /* positive delta text */
  --down:#E5483B;        /* negative / urgent text (e.g. "2 of 20 left") */
  --dark:#0B0B0C;        /* dark stages (stories, CTA) */
  --footer:#141416;      /* footer "light black" */
  --card:rgba(255,255,255,.90);
  --card-shadow:0 1px 0 #fff inset,0 0 0 1px rgba(255,255,255,.8) inset,0 24px 48px -22px rgba(20,20,40,.14),0 2px 6px rgba(20,20,40,.03);
  --ease:cubic-bezier(.2,.8,.2,1);
}
```

### 4.1.2 Colour roles (strict)
- **Light surfaces:** page `--bg`; cards `--card` with `--card-shadow`.
- **Accent surfaces:** solid `--neon` with `--on-neon` content. Used for: the 2nd and 4th stat files, the brand band, every other explore panel, the centre story card, the rating summary card, and primary buttons.
- **Light-green tint:** `#D3FBE0` (story cards 2 & 4), and `rgba(52,240,108,.12–.18)` for chips and highlighted table columns.
- **Dark surfaces:** `--dark` for the stories stage and the CTA; `--footer` for the footer.
- **Text on green is always `#0B0B0C`.** Charts drawn on green use black lines, and their bars and dots are black too.
- Brand-logo squares inside brief rows or review chips use each brand's own colour (data field), 40×40 or 26×26, radius 12 / 8, white initial.

### 4.1.3 Type (Inter only; weights 400 / 500 / 600; 700 is used only for the "yapp" wordmark)
| Role | Size / weight / tracking / line-height |
|---|---|
| H1 (hero) | 52px / 600 / −2px / 1.04 |
| H2 (section) | 34px / 600 / −1.1px / 1.1 |
| H2 on the dark stories stage | 50px / 600 / −1.8px / 1.02, centred |
| H3 (card title) | 18px / 600 / −0.3px |
| Eyebrow | 12px / 500 / +0.08em, UPPERCASE, `--muted` |
| Body | 15–16px / 400, `--muted` for descriptions, line-height 1.55 |
| Meta | 12–13px / 400–500 |
| KPI big | 52px / **400** / −2.5px (light numbers are deliberate, as in the reference) |
| KPI small | 36px / 400 / −1.6px |
| Numbers | `font-variant-numeric: tabular-nums` everywhere numbers animate |

### 4.1.4 Shape and spacing
- **Radii:** section cards 28px; inner blocks 16–18px; brand squares 12px; **all buttons, chips, pills and tags 999px**; dark stage 36px; side panel 30px.
- **Page container:** `max-width:1520px; padding:112px 72px 96px` (desktop). The nav sits 16px from the top, with 72px side margins (same as the landing).
- **Vertical rhythm:** 96px between sections (64px on phone). Section header (eyebrow + H2, optional right-side meta) has 26px below it.
- **Arrow buttons:** 34×34 circle, white 90%, ring `0 0 0 1px rgba(29,29,31,.07)`.

### 4.1.5 Buttons
| Type | Spec |
|---|---|
| Primary dark (nav "New order") | h42, pill, `linear-gradient(180deg,#2A2A2C,#0B0B0C)`, white 15/600, plus icon; hover → `--neon` bg, `#0B0B0C` text, `translateY(-1px)`, green glow `0 10px 28px rgba(52,240,108,.4)` |
| Primary green | h42 (h50 in CTA), pill, `--neon`, `#0B0B0C` 600 |
| Glass on dark | `rgba(255,255,255,.1)` + inset ring `rgba(255,255,255,.18)`, white |
| Ghost / circle | 42×42 circle, `rgba(255,255,255,.55)`, 1px `rgba(255,255,255,.7)` border, glass shadow |
| Press | `scale(.97–.98)` |

### 4.1.6 Chips
- **Delta chip:** 12.5/500, pill, `--up` on `rgba(52,240,108,.14)`. On green surfaces: `#0B0B0C` on `rgba(11,11,12,.09)`.
- **Sample chip:** 11/500, pill, `--soft`, white 70%, **1px dashed** `rgba(29,29,31,.15)`, text "● Sample" or "● Sample data".
- **Dropdown chip** ("Monthly ⌄"): 13/500, pill, `rgba(29,29,31,.05)`.

### 4.1.7 Motion
- Default easing `--ease`; hover lifts 3–5px; cards transition 0.3–0.55s.
- **Count-up numbers:** run **once** per element when it enters the viewport (1.6s, ease-out-quart) and end exactly on the final value. **Never loop.** An element must not be re-observed after it animates; this was a real bug, so guard it with a flag.
- **Bars** (progress, demand, rating) animate width from 0 over 1.2–1.4s when visible.
- `prefers-reduced-motion: reduce`: no drifting, no count-ups (show final values), no Ken-Burns; flips and transitions become instant.

---

## 4.2 Navigation (identical to the landing page)
- **Container:** fixed, `top:16px; left:72px; right:72px; height:60px`; radius 22; `rgba(255,255,255,.6)` + `blur(24px) saturate(180%)`; 1px border `rgba(255,255,255,.7)`; shadow `0 8px 32px rgba(0,0,0,.07)`; inset highlight; padding `0 9px 0 20px`.
- **Left:**
  - **Logo:** chat-bubble mark (28×25) + "yapp" (22/700, −0.03em). Dots: **white, white, green** on the black bubble, as in the asset the owner supplied.
    - ⚠️ The landing file currently uses three green dots. **Decide one version and use it on both pages.**
  - **Links** (16/500, `--muted`, pill hover `rgba(255,255,255,.7)`): **Discover** (active: `--ink`, 600, 6px green dot centred 4px below), Work, Messages (black count badge 20px), Profile. **No "Home".**
- **Right:**
  - **New order** (primary dark button).
  - **Bell:** 42px circle, 10px red dot `#E5383B` with a 2px white ring.
  - **Avatar:** 42px circle with the user photo.
- **Phone (≤760px):** `left/right:12px; top:10px; height:56px`; links and bell hidden; "New order" shows only the plus icon (40px); avatar 40px.

---

## 4.3 Hero (two columns)
`grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); gap:28px; align-items:start`.

### 4.3.1 Left column (fixed height = **656px**)
The left column ends **exactly** where the front stat file ends: cabinet height 700 − 44px footer row = 656. Implement it as a flex column with these children:
1. **H1:** "Find the voice that / sells your tech." (line break after "that").
2. **Sub** (16px, `--muted`, max 2–3 lines): "Creators across the US & Canada who make apps, SaaS and gadgets click. Short videos, clear prices, and the numbers to prove it — before you spend a dollar."
3. **Activity ticker:**
   - One line, 22px tall, 14px `--muted`, bold names in `--ink`.
   - Shows the latest platform event, e.g. "**Maya B.** delivered 3 Yapps to **Orbit Audio** · 2m ago".
   - Every 2.8s the list slides up one line (0.6s ease) and loops.
   - Source: real-time event stream (deliveries, hires, campaign slots, view milestones).
4. **Live briefs card** (fills the remaining height, `flex:1; min-height:0`) — see 4.3.2.

### 4.3.2 Live briefs card
- **Card:** section card, padding `22px 22px 10px`.
- **Header row:**
  - H3 "Live briefs" (no wrap).
  - Delta chip with a 6px pulsing green dot + "38 new today".
  - Right side: "Open Work" link + 28px arrow circle → Work page.
- **List:** scrolls inside the card. The scrollbar is hidden, and the bottom 12% fades out (`mask-image`) to show there is more. 6 items in the preview.
- **Row:** `grid: 40px | 1fr | 118px | 92px | 22px; gap:14px; padding:9px 10px; radius:16px`; hover background `rgba(29,29,31,.035)`.
  1. **Brand square:** 40×40, radius 12, brand colour, white initial 15/600.
  2. **Text:**
     - Title: 14/500, one line, ellipsis.
     - Meta: 12px `--muted`, one line, ellipsis — `{brand} · {Campaign|Request} · {category} · {format}`.
  3. **Status:**
     - Campaign: "N of T left" (11.5px), plus a 4px bar showing filled slots. Text turns `--down` when ≤ 3 left.
     - Request: "Due {date}".
  4. **Pay** (right-aligned):
     - Amount 15/600, e.g. "$180".
     - Unit 11.5px `--muted`: "per Yapp" (campaign) or "budget" (request).
  5. **Chevron** "›" in `--soft`.
- **Click a row:** opens the side panel "Order" view (4.12.4).
- **Live data:** newest first; poll or stream every ~30s. New rows slide in at the top (fade + 8px rise).

### 4.3.3 Right column: the **file cabinet** (all key stats in one place)
**Concept:** four equal-size files, filed one behind another like a filing-cabinet drawer. Only the front file shows content. Each file's tab sits on top, and the tabs are staggered left → right so all four stay readable.

**Geometry**
- Cabinet container: `position:relative; height:700px; touch-action:none; overscroll-behavior:contain`.
- **File:**
  - `position:absolute; left:0; right:0; bottom:44px; height: 700 − 44 − 3×40 − 40 = 496px`.
  - Peek offset 40px per depth level.
- **Body:**
  - Radius 28. File 1 uses `6px 28px 28px 28px` (its tab sits on the top-left corner); file 4 uses `28px 6px 28px 28px` (tab on the top-right corner).
  - Padding 28px; flex column.
- **Tab:**
  - Absolute `top:-38px; height:40px; width:25%` (min 150px); radius `16px 16px 0 0`.
  - Label 12/600, UPPERCASE, +0.04em, left-aligned, padding 0 18px.
  - Tab positions: file 1 `left:0`, file 2 `left:25%`, file 3 `left:50%`, file 4 `right:0`.
  - **Concave fillets:** 16×16 pseudo-elements on both sides (`radial-gradient(circle at 0 0, transparent 15.5px, <tab colour> 16px)`) so the tab flows into the body like a real folder. File 1 has no left fillet; file 4 has no right fillet.
- **Depth transform:** for depth `k` (0 = front), `translateY(−k×40px) scale(1 − k×0.03)`, `z-index: 10 − k`. Transition 0.7s `cubic-bezier(.2,.85,.2,1)`.
- **Footer row:**
  - Under the files (44px): left "01 / 04" (12/500, `--ink`, tabular).
  - Right hint "Scroll or swipe inside to flip · loops" (`--soft`).

**Colours (alternating)**
| File | Front state | Behind state |
|---|---|---|
| 1 Cost savings | White `rgba(255,255,255,.96)` + card shadow | Glass `rgba(255,255,255,.42)` + blur 18 |
| 2 Yapp index | Solid `#34F06C`, shadow `0 24px 48px -20px rgba(31,199,90,.7)` | `rgba(52,240,108,.42)` + blur |
| 3 Hot categories | White | Glass white |
| 4 Ad results | Solid green | Translucent green |

- Behind files show only the tab and the top edge. Their content is hidden (opacity 0, no pointer events).
- The front tab gets a 6px dot before the label: green on white files, black on green files.
- On green files:
  - Text, axis labels, chart lines and bars are `#0B0B0C` (muted text `rgba(11,11,12,.62)`).
  - Delta chips are `#0B0B0C` on `rgba(11,11,12,.09)`.

**Flipping (desktop + trackpad + phone)**
- **Wheel/trackpad over the cabinet never scrolls the page:** `preventDefault()` on every wheel event inside it.
- **Endless loop:** after file 4 comes file 1, and vice versa.
- **One flip per gesture.** Trackpads send many small events plus inertia:
  - Sum `deltaY` (or `deltaX` if larger) until |sum| ≥ 40, then flip once.
  - Ignore further input until there are 180ms without events.
  - Also enforce a minimum of 450ms between flips.
  - If a flip is rejected by that minimum, the gesture is **not** consumed.
- **Flip animation, next:** the front file gets `.leaving` (`translateY(60px) scale(.98); opacity:0` for 0.42s); after 160ms all files re-layout.
- **Flip animation, previous:** immediate re-layout.
- **Touch:** `touchmove` is prevented inside the cabinet. A vertical swipe of more than 30px flips (up = next).
- **Click a tab:** jumps straight to that file.
- **Keyboard:** when focus is inside the cabinet, ↓ = next and ↑ = previous. Tabs are buttons (focusable).
- **On becoming front:** the file's charts redraw (clip reveal), its bars re-grow from 0 (after 120ms), and its count-ups run again.

**File contents**
1. **01 · Cost savings** (the most important stat)
   - Top row: title "Customer acquisition cost" (16/600); right: Sample chip + "Monthly ⌄" chip.
   - KPI: **"−32%"** (52/400, count-up from 0) + small "↘" arrow (green on white). Right-aligned: "**$38** on Yapp · **$56** typical", then delta chip "Saving $18 per customer".
   - **Chart** (170px tall, 7 months May–Nov):
     - Solid Yapp CAC line with a soft green area fill.
     - Dashed grey "typical paid social" line.
     - End-point dot, and a hover tooltip ("$42 CAC · Sep").
   - X labels (11/500, `--soft`, +0.04em); legend "— Brands on Yapp   — Typical paid social".
2. **02 · Yapp index** (money traded on the platform)
   - Title "Traded on Yapp", right meta "Since April".
   - KPI **"$15.2M"** (count-up, 1 decimal) with "M" at 22px muted + "↗". Right: "in just 7 months", plus delta chip "+41% month over month".
   - Chart: cumulative curve Apr→Oct, black on green, hover "$10.4M total · Sep".
   - Footer row: "**$9.8M** paid out to creators" · "**48K** Yapps delivered".
3. **03 · Hot categories** (demand, last 30 days)
   - 8 rows: `grid 16px | 78px | 1fr | 46px`, row gap 16. Each row: rank, category name (500), 6px bar (track `rgba(29,29,31,.05)`, fill gradient `#B9F8CC → #34F06C`, width relative to #1), "↗ 42%".
   - Hover: name turns green. **Click a row:** scrolls to the Explore strip and centres that category's panel.
4. **04 · Ad results** — "Yapp ads vs. typical paid social" + Sample chip
   - 3 rows: CTR, Hook rate (first 3 sec), Cost per video vs. agency. Same grid language as brief rows: `40px | minmax(0,1.3fr) | 1fr | 92px | 14px`.
     - Icon square: on green, black with green text (CTR / Hook / $/vid).
     - Title 14/500; sub "**2.3%** on Yapp · 1.6% typical".
     - 6px track `rgba(11,11,12,.12)` with a black fill (width = improvement %).
     - Value 17/500 "+44%" + "ahead 12/12 mo".
     - Chevron.
   - Bottom note (12px): "Same brands, same period: Yapp creatives vs. their other ads. Tap a row for the 12-month trend."
   - **Click a row:** side panel "Metric" view (4.12.3).

### 4.3.4 Chart component (used everywhere)
- **Smooth line:** Catmull-Rom → cubic Bézier through the points. SVG `viewBox 0 0 100 100`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`.
  - Main line 2.2px.
  - Optional comparison line: 1.6px dashed `3 4` in `#D1D1D6`.
- **Area fill:** vertical gradient of the line colour, from 26% to 0% opacity.
- **Draw-in:** `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` over 1.7s on first view, and again when its file comes to the front.
  - **Do not use stroke-dasharray with non-scaling strokes.** It breaks the line into gaps.
- **End dot:** 7px, appears after 1.5s.
- **Hover:**
  - Snaps to the nearest point.
  - Shows a vertical dashed line (1.5px, `rgba(29,29,31,.25)`), an 11px dot with a 3px white ring, and a white tooltip chip (12/600, value + muted unit + muted label).
  - Tooltip x is clamped to 12–88% so it never clips.
- **Overlay layer:** the dot and tooltip are HTML elements over the SVG (not SVG text), so they never stretch.

---

## 4.4 How it works — stepper
- **Section header:** eyebrow "HOW IT WORKS"; H2 "From brief to ad-ready in about 3 days".
- **Layout:** one card, padding `34px 40px 30px`; 4 equal columns.
- **Track:**
  - 3px line behind the circles, from the centre of step 1 to the centre of step 4, background `#E8E8ED`.
  - Inner fill `#0B0B0C`; its width = `current / 3 × 100%`, transition 0.9s.
- **Step:** centred column:
  - Circle 38px.
  - Title 15/600.
  - Time 12.5px.
  - Description 12.5px `--muted`, max 220px.

| # | Title | Time | Description |
|---|---|---|---|
| 1 | Post a brief | ~5 minutes | Your product, the goal (installs, sign-ups, sales) and a budget. |
| 2 | Creators pitch | Within 24 hours | Verified tech creators send hook ideas and past Yapps. |
| 3 | Get your Yapps | 2–3 days | Several hooks to test, plus raw footage. Changes included. |
| 4 | Approve & launch | You stay in control | Pay only when you approve. Run them as ads, watch CAC drop. |

- **States:**
  - **Done:** black filled circle with a green check (3px stroke); title `--ink`.
  - **Current:**
    - Circle: white with a 2px black ring, a 7px green halo `rgba(52,240,108,.35)` and `scale(1.06)`; number in `--ink`.
    - Time: green `#0A7A33` 500.
  - **Upcoming:** white with a 2px `#E2E2E7` ring; grey number/title; description at 55% opacity.
- **Auto-play:** advances every 1.9s (1→2→3→4→1). Hovering a step pins it as current; auto-play resumes on mouse leave.
- **Phone:** vertical list; the track is hidden. Each step is a row (circle + title); time and description are indented 50px under the title.

---

## 4.5 Brand band (green separator)
- **Bar:** full content width, radius 28, solid `--neon`, padding `26px 36px`, shadow `0 24px 48px -24px rgba(52,240,108,.7)`.
- **Left block:**
  - "Big brands. / Real voices." (24/600, −0.8px, two lines).
  - Under it: "Teams scaling with Yapp" (12.5px, 65% opacity).
- **Divider:** 1px `rgba(11,11,12,.18)`, then **one fixed row of logos** (no motion), spread with `justify-content:space-between`, all in `#0B0B0C`, ~19px.
  - Each logo has its own wordmark style (weight, tracking, italic) plus an optional 18px mark.
- **Logos:** only brands that are real customers **and** have given written permission (sample: Notely, STACKLINE, fynd., Orbit Audio, Pixel Arcade, Vaultly, Driftly, PULSE — all fictional).
- **Phone:** stacks vertically; the logo row scrolls horizontally (no wrap).

---

## 4.5.1 Get the app (directly after the brand band)
**Purpose:** show the real mobile experience and send people to the stores.

**Card:** one section card (radius 28), padding `56px 64px`, 2 columns `1.05fr | 1fr`, gap 40.

**Left column (top → bottom)**
1. Eyebrow "THE YAPP APP".
2. H2 "Your tech feed, / in your pocket." (44/600, −1.6px).
3. Sub (max 460px): "The same Discover, made for your phone. Swipe the Mix feed, open a creator in one tap, and get notified the moment your Yapp is ready."
4. Three feature rows. Each row: a 34px icon square (radius 12, green tint `rgba(52,240,108,.16)`, glyph `#0A7A33`), a title (14.5/600) and a line (13px `--muted`).
   - **Mix feed** — "Full-screen tech Yapps, one swipe at a time"
   - **Order in two taps** — "Post a brief straight from a creator's reel"
   - **Live updates** — "Pitches, deliveries and approvals as they happen"
5. **Store buttons**, side by side, gap 12.
   - Each button: h52, pill, `#0B0B0C`, white text, inset top highlight.
   - Content: an icon (Apple logo / Google Play triangle in its four official colours), then two lines — "Download on the" / "**App Store**", and "GET IT ON" / "**Google Play**". The small line is 10/500; the large line is 17/600.
   - Hover: lift 2px plus a 3px `--neon` ring.
   - Links: the store listing URLs. On a phone, deep-link to the matching store (iOS → App Store, Android → Play).
   - Before launch, use the **official badge artwork** from Apple and Google and follow their badge guidelines (size, clear space, no recolouring).
6. **Preview note:**
   - Style: 12.5px `--muted` with a bold ink lead, inside a light-green box (radius 14, `rgba(52,240,108,.08)` with a 25% green ring), max 440px.
   - Text: "**Live preview of the app's Home feed** — the same content as the real Yapp app, updated with it. Scroll and swipe posts; sign-in, ordering and the other tabs open in the app."

**Right column: the phone (practical, minimal)**
- **Bezel:**
  - Size: screen size + 18px, radius 48, `#0B0B0C`, padding 9.
  - Outline: 1.5px `#2C2C2E` ring.
  - Drop shadow `0 50px 90px -30px rgba(20,20,40,.55)`.
- **Hardware details:**
  - Dynamic Island: 76×22, black, 18px from the top.
  - Side buttons: 3px pills — two on the left, one on the right.
- **Screen:**
  - Radius 39. It contains an **iframe that renders the real mobile reels feed** (the same build as `YAPPS_MOBILE.html`), at native 440×956 pt.
  - The iframe is scaled with `transform: scale(var(--k))`, where `--k = .56` on desktop and `.5` on phone.
  - The preview opens **directly on the feed**, never on the welcome or sign-in screens.
  - Inside the preview, safe areas are forced to `top 44 / bottom 18` so the content clears the island.
- **Pose:** the phone is tilted `rotate(-4deg)` and straightens with a 6px lift on hover.
- **Backdrop:** a 520px green radial glow plus a 380px dashed ring, both behind the phone.
- **Home page only, read-only (preview mode):**
  - The preview shows **only the app's Home feed**. Working gestures:
    - scroll the reels;
    - switch the feed's own Mix / Yapps / Orders tabs;
    - swipe a post for its details.
  - **No sign-in and no sign-out.** These are not available inside the preview:
    - the welcome screen;
    - sign-in;
    - saved accounts;
    - the Profile/account sheet (log out / forget);
    - the "+" create sheet;
    - the other bottom tabs (Work, Discover, Alerts, Profile).
    - Any tap on them is blocked and shows a small pill toast, "Available in the Yapp app" (1.6s).
  - The preview never reads or writes the visitor's session or local storage.
- **Same content as the real app:**
  - The preview is not a separate mock. It renders the app's Home feed from the **same feed source the app uses**: the same posts, creators, campaigns and order cards, in the same order, updated whenever the app's feed changes.
  - **Production:**
    - A public, read-only endpoint (e.g. `GET /api/feed/home?audience=guest`) serves the guest version of the Home feed: no personal data, and no private or draft items.
    - Route `/app-preview` renders it with the mobile feed components, in preview mode.
    - Discover embeds that route.
  - **Prototype:** the preview is built from the same file as the mobile app (`YAPPS_MOBILE.html`). Rebuilding Discover always picks up the latest mobile feed content. The 3D welcome scene and the whole sign-in/session code are stripped from the embedded copy.
- **Loading:**
  - The iframe is created only when the section is within 400px of the viewport (lazy).
  - Until it loads, a dark poster shows "Loading preview…" and fades out on load.
  - If loading fails, the poster reads "Preview unavailable".
  - In production, the iframe points at `/app-preview` (see "Same content as the real app" above). It has no 3D welcome scene, so it loads fast.
- **Phone layout:** single column; the phone sits under the text, untilted, `--k:.5`, area min-height 520.

Footer "Product" column gains a **Get the app** link (after How it works).

---

## 4.6 Explore strip — tech categories in 3D (replaces all category lists/grids)
- **Header:** eyebrow "EXPLORE"; H2 "Tech creators, by what they make".
- **Header right:** "Drag or swipe · hover to open" + ← → arrow buttons.
- **Stage:** full-bleed (ignores the 72px page padding); height 540; `perspective:1500px; perspective-origin:50% 45%; overflow:hidden`.
- **Panels:** one per category, 380×460, radius 28, **no fades or gradients**. Panels alternate **green** (`#34F06C`, black content) and **light** (white 94%, ink content, green accents). The same card shadow is used throughout.
- **Categories (order = demand rank):** AI tools · Consumer apps · SaaS & B2B · Fintech · Gadgets & audio · Gaming · Health tech · E-commerce tech.

**Panel default content (top → bottom)**
1. Header: 30px icon circle (green with black glyph on light panels; black with green glyph on green panels) + category name 16/600.
2. Sub: "9 creators · ↗ 52% demand" (12px, 65%).
3. Glass list:
   - Card: radius 18; on light panels `rgba(29,29,31,.035)`, on green panels `rgba(255,255,255,.38)`.
   - Header row: "Top creator" / "Avg views" (11px, 70%).
   - 4 rows: 20px avatar + name (12/500) + views pill. On light panels the pill is green tint with `#0A7A33` text; on green panels it is black with green text.
4. "LATEST {CATEGORY} YAPPS" label (10.5px uppercase), then 3 video thumbnails (each `flex:1`, height 118px, radius 9).

**Panel hover content** (the list is replaced; the thumbnails shrink to 70px)
- **Left:** the featured creator's reel. **No phone frame.**
  - 120×200, radius 16, autoplaying muted loop.
  - 3px white progress bar at the bottom; caption in white 10px at the bottom.
- **Right:**
  - Creator name 14/600 + verified badge.
  - Meta "★ 4.7 · Montréal · Screen walkthrough".
  - 4 stat rows with hairlines: Avg views · vs median (↗/↘ %) · Delivery (days) · Rehire (%).
  - "From **$290**".
- **Below:** the 3 thumbnails, and a black pill "View profile →".

**Motion and control**
- **Layout per frame:**
  - Panel `i` sits at `x = ((i×410 − offset) mod L) − L/2`, with `L = 8×410`.
  - `t = clamp(x/700, −1, 1)`.
  - `rotateY = −t×38°`, `translateZ = −|t|×120px`; `z-index` by distance from centre; hidden when |x| > 1300.
  - Values ease towards targets at 12% per frame (smooth).
- **Idle drift:** offset += 0.28px/frame (≈17px/s), endless loop.
- **Hover a panel:** drift pauses; that panel eases to `rotateY 0`, `translateZ 50`, front z-index; its content switches to the hover view.
- **Drag** (mouse/pen/touch, pointer events):
  - Offset follows the pointer.
  - On release, momentum continues at velocity × 0.94 per frame.
  - Clicks are suppressed if the pointer moved more than 6px.
- **Trackpad horizontal swipe** (|deltaX| > |deltaY|): moves the offset and prevents page scroll. **Vertical wheel scrolls the page normally.**
- **Arrows:** add a ±14px/frame impulse that decays.
- **Resume:** after any manual input, auto-drift waits 1.5s before resuming.
- **Click:** a panel opens the featured creator in the side panel; a thumbnail opens that creator.
- **Phone:** stage height 500; panels scaled 0.82; drag/swipe as above.

---

## 4.7 Success stories — dark stage with a fan of cards (design reference: game-card fan)
- **Stage:**
  - Radius 36, `#0B0B0C`, height 640, `overflow:hidden`, centred text.
  - **Little space above the title:** padding-top 40px.
  - Background:
    - Grid lines `rgba(255,255,255,.06)` every 64px, faded with a radial mask (centre 70%).
    - A green radial glow `rgba(52,240,108,.35)` rising from below the bottom edge (900×420).
- **Text:**
  - Eyebrow "SUCCESS STORIES" (white 50%).
  - H2 "What happened / when they hit post" (50/600, white).
  - Sub (14px, white 55%, max 460px): "Real tech brands, real Yapps, real numbers. Hover a card to lift it, click to read the full story."
- **Floating result chips** (desktop only):
  - "CAC **−38%**", "Sales **+120%**", "CPI **−46%**".
  - Style: dark glass pills (`rgba(255,255,255,.07)`, inset ring 12%), numbers in green.
  - They float ±10px on a 6s loop, staggered.
- **Fan:** an anchor at bottom-centre, `bottom:-24px`. Five cards, 260×380, radius 30, padding 22, `transform-origin: 50% 100%`, each placed with CSS variables `--x --y --r --s`:

| Card | x | y | rotate | scale | Background | Brand / category | Headline result |
|---|---|---|---|---|---|---|---|
| 1 | −500 | 52 | −10° | .90 | #FFFFFF | Stackline · SaaS & B2B | 3× Demos |
| 2 | −258 | 18 | −5° | .96 | #D3FBE0 | Orbit Audio · Gadgets & audio | +120% Sales |
| 3 | 0 | 0 | 0° | 1.04 | #34F06C | Notely AI · AI tools | −38% CAC |
| 4 | 258 | 18 | 5° | .96 | #D3FBE0 | fynd. Budget · Fintech | −46% CPI |
| 5 | 500 | 52 | 10° | .90 | #FFFFFF | Pixel Arcade · Gaming | 1M Installs |

- **Card content:**
  - Brand name 24/600 (−0.7px) + category 12px (60%).
  - Result pill top-right: black, green value 13/600 + white-70% label, e.g. "−38% CAC".
  - One-line story title (13px, `#0B0B0C` at 70%, max 200px).
  - The creator's video in the lower 60%, top edge faded with `mask-image: linear-gradient(transparent, #000 30%)`.
  - Cards are cut by the stage's bottom edge, as in the reference.
- **Hover:** the card rises 46px, rotates to 0°, scales +0.04 and moves to the top z-index (0.55s ease). The video zooms 1.1× slowly; a white pill "▶ Watch the Yapp" fades in bottom-left.
- **Click:** opens the side panel "Story" view (4.12.2).
- **Phone:** stage height 600, radius 28; floating chips hidden; fan scaled 0.72 from the bottom (outer cards partly off-screen; swipe is not needed).

---

## 4.8 Reviews
- **Header:** eyebrow "FROM BRANDS"; H2 "Loved by the teams who ship"; right: Sample chip.
- **Grid:** `320px | 1fr`, gap 16.
- **Rating summary card** (green, radius 28, padding 26):
  - Eyebrow "AVERAGE RATING" (black 55%).
  - "4.9" (76/400, −3px) + "/5" (22px, 55%).
  - Black stars; "18,600 reviews from tech brands" (13px, 65%).
  - 5 distribution rows (5★…1★): `grid 26px | 1fr | 40px`, 6px track `rgba(11,11,12,.12)` with a black fill (animated), percentage at the right.
- **Review cards** (3 columns, white cards, padding 24, hover lift 4px):
  - Top: brand chip (26px coloured square + name 13/600) · black stars.
  - Quote: 17px, 1.5 line-height, `--ink`, in curly quotes.
  - Result chip: green tint, `#0A7A33`, e.g. "CAC −38%".
  - Footer (hairline above): 36px creator avatar + "Hired **Emma Gagnon** · AI tools".
- **Click a review:** opens that creator in the side panel.
- **Rule:** reviews must come from verified completed orders only. Show the real count; never round up.
- **Phone:** everything stacks to one column.

---

## 4.9 Honest comparison + trust cards
- **Header:** eyebrow "THE HONEST COMPARISON"; H2 "Yapp vs. the other ways to get UGC".
- **Table:**
  - Inside a white card (padding `10px 10px 4px`).
  - Cells: 14px, padding 15×18, hairline rows.
  - Header row: 12px uppercase `--soft`.
  - **Yapp column:** highlighted `rgba(52,240,108,.12)`, radius 16 at the top and bottom ends, text 600.
  - ✓ in `--up` 600; ✕ in `#C7C7CC`.

| | Yapp | Agency | DIY sourcing | AI avatars |
|---|---|---|---|---|
| Cost per video | $60 – $300 | $500 – $2,000 | Varies | $20 – $80 |
| First video in | 2–3 days | 3–6 weeks | 1–3 weeks | Same day |
| Real people & real homes | ✓ | ✓ | ✓ | ✕ |
| Creator stats before you book | ✓ | ✕ | ✕ | — |
| Prices visible upfront | ✓ | ✕ | ✕ | ✓ |
| Payment held until you approve | ✓ | ✕ | ✕ | — |
| Ad usage rights included | ✓ | Extra | Negotiated | ✓ |

> Competitor ranges are market estimates. Keep them generic, with no named competitors, and review them with legal before launch.

- **Trust cards** (4 columns, gap 16, white cards, padding 20): 40px green icon square (radius 14, black 2px line icon) + title 15/600 + text 13px `--muted`.
  - **Payment held** — You pay into Yapp. The creator is paid only after you approve.
  - **Fixed, visible prices** — Every package shows its price. No quotes, no back-and-forth.
  - **Verified creators** — ID-checked, with real stats pulled from their accounts.
  - **Free revisions** — Each package includes revisions until the video is right.
- **Phone:** the table scrolls horizontally (`min-width:640px`); trust cards in 2 columns.

---

## 4.10 CTA (dark)
- **Bar:** radius 36, `#0B0B0C`, padding 46; a green blurred orb (420px, blur 130, 33% opacity) top-right.
- **Left:** H2 "Your first Yapp could be live by Friday." (white) + "Post a request free. Pay only when you approve the video." (white 65%).
- **Right:** "Talk to us" (glass on dark) + "New order" (primary green), both pills, h50, padding 0 24.
- **Phone:** stacked, radius 28, padding 30×24.

---

## 4.11 Footer (light black, white text, green on hover)
- **Container:** full-bleed `#141416`, padding `72px 72px 32px`, inner max-width 1376.
- **Top grid** `1.3fr | 2fr`, gap 64, hairline `rgba(255,255,255,.1)` below (48px padding):
  - **Brand column:**
    - White logo (white bubble, black dots, green last dot) + "yapp" 22/700.
    - Text (14px, white 60%, max 300): "Short videos from real creators, for tech brands across the US & Canada."
    - 4 social circles 38px (TikTok, Instagram, LinkedIn, X): `rgba(255,255,255,.07)` + 10% ring, white icon; **hover → green fill, black icon**.
  - **Link columns** (4): heading 12/500 uppercase +0.08em white 45%; links 14.5px **white**, 6px vertical padding, **hover → `#34F06C`** (0.18s).

| Product | Company | Resources | Legal |
|---|---|---|---|
| Discover | About us | FAQ | Privacy policy |
| Work | Careers | Help center | Terms of service |
| How it works | Press | Creator guide | Cookie policy |
| Get the app | Contact us | Brand guide | Creator agreement |
| Pricing | | Blog | Accessibility |
| Success stories | | | |

- **Bottom row** (13px, white 50%, padding-top 24):
  - Left: **"© 2026 Yapp Inc., Canada. All rights reserved."** (rights are Canada only; replace "Yapp Inc." with the registered legal name).
  - Right: "🇨🇦 Canada · English · Cookie settings" (links white 75%, hover green).
- **Phone:** padding `48px 20px 28px`; link columns 2×2; bottom row stacked.

---

## 4.12 Side panel (single reusable component)
- **Desktop:**
  - `position:fixed; top/right/bottom:12px; width:560px`; radius 30; white 94% glass.
  - Slides in from the right (`translateX(110%) → 0`, 0.5s `--ease`).
  - Scrim `rgba(10,10,12,.16)`.
- **Phone:** bottom sheet, `height:88vh`, radius `28 28 0 0`, slides up from `translateY(105%)`.
- **Hidden state:** `visibility:hidden` after the exit transition (prevents a blank sheet appearing in captures or for assistive tech).
- **Structure:**
  - Header: title 600 + 36px close circle.
  - Scroll body: padding 22, sections 24 apart.
  - Sticky footer: buttons h48, flex 1.
- **Close:** ×, scrim click, `Esc`. Focus is trapped while open and returns to the trigger.

### 4.12.1 Creator view
1. Avatar bubble 76px + name 20/600 + "City, ST · Category · Languages" + badges (Yapp Verified = green tint; Rising; Replies < 1h; Top 5%).
2. **Reels row:** 4 videos 132px wide 9:16, radius 16, frameless, with views and duration.
3. **Performance** ("Last 30 days"): 6 boxes (3×2, radius 16, `rgba(29,29,31,.035)`), value 22/400 + label + green sub-line.
   - Avg views (↑ vs prev.)
   - Engagement (vs median)
   - On-time delivery (avg days)
   - Brands rehire (orders this month)
   - ★ rating (reviews; reply time)
   - Total followers (TikTok · IG · YT)
4. **Views trend:** 170px smooth chart, 30 days.
5. **Audience:** three bar groups — country, age, gender. Rows `110px | 1fr | 44px`, green gradient bars.
6. **Packages** (prices final, always visible):
   - "1 Yapp · {format}" (up to 30s, 1 revision, delivery)
   - "3 Yapps · hook test"
   - "Yapp + 30-day ad rights"
   - Selectable cards, radius 18; the selected one gets a green 2px ring + 6px halo.
7. Note: "🔒 Payment held until you approve · ↺ Free revisions".
8. **Footer:** "Message" (ghost) + "Book · $price" (green; the price follows the selected package).

### 4.12.2 Story view
- Brand row (42px coloured square + name + "6-week program · 24 Yapps · $18K ad spend").
- Story headline H2.
- 3 result boxes (green tint).
- "{metric} week by week" chart: after (solid) vs before (dashed), with a legend.
- "The Yapps that won": 3–4 frameless reels labelled Hook A–D with their CTR.
- "How they did it" timeline (Week 1 / 2 / 3–4 / final).
- Quote block.
- Creators on this campaign (rows; click → creator view).
- **Footer:** "Copy this brief" + "Start a similar campaign" (→ Work, pre-filled).

### 4.12.3 Metric view
- Label, big value, sentence "X on Yapp vs Y typical".
- 12-month dual chart (Dec–Nov).
- 3 boxes: months ahead · campaigns measured · ad spend tracked.
- **Methodology paragraph:** brands that connect an ad account share anonymous results; Yapp creatives are compared with the same brand's other creatives in the same period.
- Footer: "See creators who drive this".

### 4.12.4 Order view (from Live briefs)
- Brand row; 3 boxes: price per Yapp · slots left · views so far (+today).
- Slot bar.
- Brief text.
- "Delivered so far" reels.
- Footer: "Join · earn $X" (campaign) or "Send a pitch" (request).
  - Note: this view is mainly useful to creators. Brands are routed to Work.

---

## 4.13 Video rules (all "reels" on this page)
- **No phone frames around reels.** Videos are plain rounded rectangles (radius 9–16 by size). The only device frame on the page is the "Get the app" preview (4.5.1).
- Autoplay **muted**, `playsinline`, loop, `preload="metadata"`. Play only while in view (IntersectionObserver), and pause when off-screen or when the tab is hidden.
- **Poster:** the first frame (blur-up). Before a video loads, show the poster with a slow Ken-Burns (scale 1→1.15 over 7–8s, alternate).
- Source: HLS 720p max for thumbnails; full quality only in the side panel.
- Progress bar 3px (green on light, white on dark/coloured).
- **Creator media must be consented, licensed footage.** The preview uses placeholder faces and initials; replace them before anything public.

---

## 4.14 Phone layout (≤ 760px) — summary
| Area | Phone behaviour |
|---|---|
| Page | padding `86px 16px 64px`; sections 64px apart; H1 36px; H2 26px; section headers stack |
| Hero | 1 column: H1 → sub → ticker → Live briefs (list max 360px, scrolls; status column hidden; "38 new today" hidden) → cabinet |
| Cabinet | height 600; tabs 24% wide, 9.5px labels; sample chips hidden; swipe up/down to flip (page does not scroll while swiping on it) |
| Ad-results rows | track and chevron hidden: icon · text · value |
| Stepper | vertical list |
| Band | stacked; logos scroll horizontally |
| Explore | panels ×0.82; drag/swipe |
| Stories | stage 600; fan ×0.72; chips hidden |
| Reviews | single column |
| Table | horizontal scroll |
| Trust | 2 columns |
| Side panel | bottom sheet 88vh |
| Footer | 2×2 link grid |

No horizontal page overflow at 390px (`documentElement.scrollWidth === innerWidth`).

---

## 4.15 Accessibility
- All interactive items are real `button`/`a` elements with visible focus (`outline:2px solid #34F06C; outline-offset:3px`).
- **Cabinet:** `role="region"`, `aria-label="Yapp numbers"`; tabs are buttons with `aria-selected`; announce "File 2 of 4, Yapp index" via `aria-live="polite"` on flip.
- **Explore strip:** a keyboard path is required — the arrow buttons, and each panel focusable; `Enter` opens the creator. Drift pauses on focus.
- **Charts:** each has an `aria-label` sentence ("CAC fell from $55 to $38 between May and November") plus a visually hidden data table.
- **Contrast:** text on green is always black; muted text on white ≥ 4.5:1 (`#6E6E73` passes).
- Videos are muted and need no captions in previews; captions are required in the side panel.
- `prefers-reduced-motion` honoured (4.1.7).

## 4.16 Performance
- **Rendering:**
  - Only the front cabinet file renders charts at full cost; behind files keep their DOM but have their animations paused.
  - The explore strip uses a single `requestAnimationFrame` loop and transforms only (no layout).
  - Pause the loop when the strip is off-screen.
- **Video:** at most ~6 simultaneously playing videos; others show posters.
- **Fonts:** Inter 400/500/600/700 only, `font-display: swap`.
- **Targets:** LCP < 2.5s (hero text + first file), CLS < 0.05 (reserve heights: cabinet 700, briefs 656, strip 540, stage 640).

## 4.17 Data contracts (TypeScript)
```ts
type Brief = { id:string; brand:{name:string; color:string}; title:string; kind:'campaign'|'request';
  category:Category; format:Format; pricePerYapp?:number; budget?:number; slotsTotal?:number; slotsLeft?:number;
  dueDate?:string; createdAt:string };
type CabinetStats = {
  cac:{ yapp:number; typical:number; deltaPct:number; series:{month:string; yapp:number; typical:number}[]; source:string };
  index:{ tradedUsd:number; months:number; momPct:number; paidToCreatorsUsd:number; yappsDelivered:number; series:{month:string; cumUsd:number}[] };
  categories:{ name:Category; demandOrders:number; growthPct:number }[];
  adResults:{ metric:'CTR'|'HOOK'|'COST_PER_VIDEO'; yapp:number; typical:number; improvementPct:number; monthsAhead:number; ofMonths:number }[];
};
type CreatorCard = { id:string; name:string; city:string; region:string; category:Category; format:Format; languages:string[];
  rating:number; reviews:number; avgViews:number; vsMedianPct:number; deliveryDays:number; rehirePct:number; onTimePct:number;
  priceFrom:number; badges:('verified'|'rising'|'fast_reply'|'top5')[]; reelUrl:string; posterUrl:string; views30d:number[] };
type Story = { id:string; brand:{name:string; color:string}; category:Category; title:string;
  results:{value:string; label:string}[]; creators:string[]; weeks:number; yapps:number; spendUsd:number;
  before:number[]; after:number[]; quote:string; quoteBy:string };
type Review = { id:string; brand:{name:string; color:string}; quote:string; result:string; creatorId:string; rating:1|2|3|4|5; orderId:string };
type Category = 'AI tools'|'Consumer apps'|'SaaS & B2B'|'Fintech'|'Gadgets & audio'|'Gaming'|'Health tech'|'E-commerce tech';
type Format = 'App demo'|'Screen walkthrough'|'Unboxing'|'Problem → solution'|'Comparison'|'Testimonial'|'Talking head'|'Voiceover';
```
- **Honesty rules:**
  - Each stat object carries `source` and `period`; the UI shows them on hover.
  - Stats with too little data (e.g. fewer than 30 campaigns) are hidden, not padded.
  - Sample chips are removed only when real data is bound.

## 4.18 Tech notes (Next.js app in the existing repo)
- App Router page `app/(app)/discover/page.tsx` is the signed-in root (`/` redirects to `/discover` when signed in; the bubble landing stays the signed-out entry).
- Components: `Nav`, `HeroTicker`, `LiveBriefs`, `StatCabinet` (+ `CabinetFile`), `SmoothChart`, `Stepper`, `BrandBand`, `ExploreStrip` (+ `CategoryPanel`), `StoriesFan`, `Reviews`, `CompareTable`, `TrustCards`, `CtaBar`, `Footer`, `SidePanel` (+ views).
- Animation: CSS transitions plus one rAF loop per animated widget; `framer-motion` is optional for the side panel and the stories hover. No canvas/WebGL is needed on this page (the explore strip is CSS 3D).
- Styling: tokens from 4.1 as CSS variables in the `.yapp` theme (Tailwind 4 `@theme`). No raw hex values in components.

## 4.19 Acceptance criteria
1. Background is `#F7F7F9`, the nav is identical to the landing page, and there is no "Home" link; Discover is active.
2. The Live briefs card bottom equals the front file's bottom (±1px) at 1440×900.
3. Wheel or trackpad over the cabinet never moves the page; one gesture = one flip; flipping loops in both directions; tabs jump; touch swipe works.
4. Files alternate white / green / white / green; content on green is black; behind files show only their tabs.
5. Every count-up stops on its final value and never restarts by itself.
6. The stepper auto-advances, can be pinned on hover, and is vertical on phone.
7. The explore strip drifts slowly, pauses on hover, opens the hover view, can be dragged with momentum, moves with horizontal swipe, and has no fades; panels alternate green / light.
8. The stories stage shows the title near the top, 5 fanned cards cut by the bottom edge, and lift-and-straighten on hover; click opens the story.
9. Reviews show the green summary + 3 cards; the comparison table and trust cards follow the card system.
10. Footer is `#141416`, links are white and turn green on hover, and the rights line reads "© 2026 Yapp Inc., Canada. All rights reserved."
11. At 390px wide: no horizontal overflow, the side panel is a bottom sheet, and all sections follow 4.14.
12. Every number shows a Sample chip until real data is bound; no sample number ships to production.
13. "Get the app" sits right after the brand band. The phone preview opens on the app's Home feed and loads lazily. It shows the same content as the real app's feed. Sign-in, sign-out, create, profile and the other tabs are blocked with the "Available in the Yapp app" toast. Both store buttons link to the right store.
