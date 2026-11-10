# YAPPS — Work spec (Part 6)

**For:** the developer (Claude Code) working in the existing Next.js repo (`saadals/yap`, branch `main`).
**Type:** descriptive spec, with an HTML preview: `YAPPS_WORK.html` (open it in a browser; every flow in this file is clickable there).
**Read with:**
- `YAPPS_SITEWIDE_SPEC.md` (Part 5): shell, nav, Services dropdown, account menu, footer, Productivity, delivery comments (5.5.4), Messages (5.5.5), flows that must keep working (5.5.1).
- `YAPPS_DISCOVER_SPEC.md` (Part 4): design system (4.1), nav (4.2), stepper (4.4), footer (4.11).
- `YAPPS_MOBILE_SPEC.md` (Part 3): phone tab bar and feed.

**Rule of precedence:** for the routes `/work`, `/work/[id]`, `/orders/new` and `/orders/[id]`, **this file wins** over Part 5 table 5.4.2 ("Restyle"). These routes are **redesigned**, not only restyled. Every post-agreement flow in 5.5.1 must still work; this file says how it looks and where it lives.

**One conflict to fix in Part 5:** the logo. The final logo is the **original** one (see 6.2.3): black bubble with **white, white, green** dots. Section 5.3.2 (green, green, red) and acceptance criterion 5.12 #16 are outdated and must be updated to match this file.

---

## 6.0 Summary of changes

| # | Change | Section |
|---|---|---|
| 1 | Work becomes the **backbone of the desktop product**: one page where a creator finds every open job and both sides track every order in flight. | 6.1 |
| 2 | Left **sidebar** with sections: Find work · Your work (Ordered as a brand, Making as a creator) · Insights (Productivity). Filters live in the same sidebar. | 6.3 |
| 3 | **Find work**: search bar, category select, format tabs, quick categories, other services, type bar (All / UGC campaigns / Custom orders), grid or list, sort, pagination. | 6.5 |
| 4 | **UGC campaigns** (quantity, fixed price per Yapp, "Pick now") are separated from **Custom orders** (one creator, "Pitch now"). | 6.5.6 |
| 5 | **Other services** besides full videos: script writing, hooks, voiceover, editing, captions, ad copy, thumbnails. | 6.5.4 |
| 6 | **Opportunity page** `/work/[id]`: full internal page (not a side panel). | 6.6 |
| 7 | **Pick now** and **Pitch now** flows with confirmation modals. | 6.7 |
| 8 | **Order page** `/orders/[id]`: full internal page with stages, next step, deliveries, private comments, tabs (Activity first, then Messages, Brief, Files). | 6.8 |
| 9 | Campaign flow for creators: Upload version 1 → brand review → post on own account → link verified → paid at month end. | 6.9 |
| 10 | Brand actions stay as **side sheets**: Approve & release → Review; Request changes. | 6.10 |
| 11 | **New order** wizard at `/orders/new`, inside "As a brand", 6 steps, with follower tiers, price guidance from market data, multi-platform accounts to tag (saved), brief attachments and strict validation. | 6.11 |
| 12 | Productivity summary inside Work (Insights). | 6.12 |
| 13 | Data contracts, analytics, acceptance criteria, decisions. | 6.14–6.17 |

---

## 6.1 Purpose and principles

- **Who uses it:**
  - a **creator** (mostly tech creators) who wants paid work fast;
  - a **brand** that posts work and tracks what it ordered;
  - one account can be both, so the page shows both sides.
- **The main job on desktop:** a tech creator opens Work, reaches tech jobs in one or two clicks, and either **picks a slot now** or opens the details.
- **Easy from outside and inside:**
  - every section has a one-line help text under the tabs (6.4.3);
  - the two kinds of work are explained where they appear (type bar help, panel headers);
  - each card says what it is, how much it pays, how many slots are left and when it closes.
- **Ordered by usage:**
  1. Needs you (the one thing waiting on you);
  2. Find work (the most used);
  3. Your work (Ordered, Making);
  4. Insights (Productivity).
- **Nothing illogical can be skipped:** every required field is validated before the next step (6.11.9). Buttons stay disabled until their conditions are met (uploads, post links, reviews).

---

## 6.2 Shell on this page

### 6.2.1 Desktop nav (glass, from Part 4)
- **Left:** logo + "yapp".
- **Centre links:** Discover · Services (dropdown, 5.8) · **Work** (current, `aria-current="page"`) · Messages (with unread badge, e.g. 3) · Profile.
- **Right:**
  - **New order**: dark pill with a + icon. It **works**: it opens `/orders/new` (6.11). Every element with `data-new` does the same.
  - Bell with red notification dot.
  - Avatar → account menu.
- **Account menu (exact order):**
  1. header: avatar, name, role · company (e.g. "Sara Malik · Growth Lead · Qalamy");
  2. View your public account;
  3. Productivity (with a small green delta chip, e.g. "CAC ↘ 12%");
  4. separator;
  5. Wallet;
  6. Billing & receipts;
  7. Products;
  8. Saved creators;
  9. Settings;
  10. separator;
  11. **Log out** (red). It opens a confirmation. There is no "Log out and forget this account".

### 6.2.2 Phone shell
- **Header:** logo · then icons: **+** (New order), Messages, ••• (More page, 5.6.2).
- **Tab bar** (Part 5, 5.2.1): Home · Discover · **Work** (current) · Alerts (red dot) · Profile.
  - Floating pill, 60px high, 12px from the edges, above the safe area.
  - The current tab is a dark pill with its label; other tabs show icons only.
- **No footer on phone.**
- **Sticky action bar** (`.mbar`) at the bottom of the opportunity and order pages, above the tab bar, with the main action of the current stage.

### 6.2.3 Logo (original, final)
- **Mark:** chat bubble, `viewBox="0 0 34 30"`:
  ```html
  <svg viewBox="0 0 34 30">
    <path d="M9 1h16a8 8 0 0 1 8 8v6a8 8 0 0 1-8 8h-9l-7 6v-6.3A8 8 0 0 1 1 15V9a8 8 0 0 1 8-8z" fill="#0B0B0C"/>
    <circle cx="11" cy="12" r="2.6" fill="#fff"/>
    <circle cx="17" cy="12" r="2.6" fill="#fff"/>
    <circle cx="23" cy="12" r="2.6" fill="#34F06C"/>
  </svg>
  ```
- **On light:** black bubble `#0B0B0C`, dots **white, white, green `#34F06C`**.
- **On dark (footer):** white bubble, dots **black, black, green**.
- **Wordmark:** "yapp", 22/700, −0.03em.
- Replace 5.3.2 in Part 5 with this.

### 6.2.4 Footer (desktop only)
- As in Part 5 (5.6.1). Bottom line: "© 2026 Line Node Technologies, Canada. All rights reserved." · "🇨🇦 Canada · English · Cookie settings".
- Footer **Product** column includes Work.

---

## 6.3 Page layout `/work`

### 6.3.1 Header
- H1 **Work**. Sub: "Everything in flight, on both sides of a deal."

### 6.3.2 Two columns (desktop > 1180px)
- **Left: sticky sidebar** (`.wnav`, white card, radius 28), about 260px wide.
- **Right: main column** (`.wmain`).

### 6.3.3 Sidebar sections (in this order)

| Group | Item | Right side | Opens |
|---|---|---|---|
| — | **Find work** | total open count | Find work (6.5) |
| Your work | **Ordered** · sub "as a brand" | count | Ordered list (6.4.4) |
| Your work | **Making** · sub "as a creator" | count | Making list (6.4.5) |
| Insights | **Productivity** | green delta chip "↗ 12%" | Productivity summary (6.12) |

- Each item has an icon tile; the current item is highlighted (`aria-current="true"`).
- **Under the nav, only on Find work:** the **filter groups** (6.5.8), with a "Filters" title and a "Clear all" link.
- **Default:** Find work is selected on load.

### 6.3.4 At ≤ 1180px (tablet and phone)
- The sidebar is hidden. A **segmented control** (`.main-seg`) at the top of the main column replaces it: **Find work (count) · Ordered (count) · Making (count) · Stats**.
- Filters move into a **Filters** button that opens a bottom sheet with the same groups (same component, different container).
- Chip rows (formats, quick categories, active filters) scroll horizontally with `white-space: nowrap`. Never wrap labels and never overflow the page.

### 6.3.5 Breakpoints used
- `> 1180px`: desktop, sidebar.
- `≤ 1180px`: tabs instead of sidebar; order and opportunity pages become one column with the side cards under the main cards.
- `≤ 760px`: phone; phone header, tab bar and sticky action bars; cards full width; list view rows stack.
- `prefers-reduced-motion`: no smooth scroll, no count-ups, no sheet slide (fade only).

---

## 6.4 Top of the main column

### 6.4.1 "Needs you" block
- One **neon** block (green `#34F06C` background, dark text), the first thing in the main column, on every tab.
- Shows **only the single most urgent item** for this user, across both sides. Priority:
  1. a version to review whose auto-approval is closest;
  2. a creator deliverable due today or overdue;
  3. a post link due;
  4. new pitches on the user's order.
- **Content:**
  - eyebrow: dot + "Needs you" + "· Review · You ordered" (action · side);
  - H2: e.g. "Version 1 from Maya Chen is ready to review";
  - line: order title + what to do + "Payment stays held until you do.";
  - countdown bar + "Auto-approves Sat 7 Nov · 2 days left";
  - right: "Review now →" pill.
- The whole block is one link to the order page.
- Hidden when nothing needs the user.

### 6.4.2 Tabs bar (≤ 1180px) and money line
- Segmented control (6.3.4).
- **Money line** on the right, only on Ordered and Making:
  - Ordered: shield icon + "**$2,030** held for your orders · Billing";
  - Making: wallet icon + "$1,240 to withdraw · $570 pending · Wallet".
- Hidden (keeps its space) on Find work and Productivity.

### 6.4.3 Help line (one sentence per section)
| Section | Text |
|---|---|
| Find work | **Find work** · every open UGC campaign and custom order, in one place. Pick a Yapp now, or pitch for a custom order. |
| Ordered | **Ordered** · videos you asked creators to make. Review, approve and pay here. |
| Making | **Making** · videos you are making for brands. Deliver, reply to comments and get paid here. |
| Productivity | **Productivity** · how your work is performing: results, money and the people you worked with. |

### 6.4.4 Ordered (as a brand)
- **Layout:** list on the left; side column on the right.
- **Status filter chips with counts:** Needs you · **Active** (default) · Completed · Cancelled · All.
- **Order card** (`.cm`): thumbnail, status chip, comment badge (count; green dot if unread), title (one line, ellipsis), creator avatar + name, due line with clock icon (red if late, amber if soon), price.
  - Click or Enter → `/orders/[id]`.
- **Side column:**
  1. **"Post a new order"** big button (+ tile): "UGC campaign or custom order · takes 2 minutes" → `/orders/new`.
  2. **Your orders** card (count): rows with icon (campaign / order / draft), title, meta, highlight in green italic. Examples:
     - "Fintech launch campaign · Campaign · 4 of 10 open · *2 to review*";
     - "AI note-taker app demo · 6 pitches · *3 new*";
     - "Smart ring unboxing · Draft, not posted · saved 2h ago".
     - "All orders" link. A newly posted order appears at the top with "*just posted*" and links to its `/work/[id]`.
  3. **Work with them again**: three faces, "Nina's Arc comparison hit a 2.4% CTR. Rebook in two taps.", green "Commission again" button.
- **Empty filter:** card "Nothing here · Try another filter."

### 6.4.5 Making (as a creator)
- Same chips and cards, full width (`.list.wide`).
- Brand shown as a coloured letter tile instead of an avatar.
- Picked campaign slots appear here at the top (6.7.1).
- **Under the list:** "3 pitches waiting to hear back · Your pitches".

### 6.4.6 Status chip mapping (Part 5, 5.4.3)
| Kind | Look | Examples |
|---|---|---|
| `attn` | neon / strong | Ready to review, Post due |
| `move` | green | In progress, Revision · v2, Picked · film it |
| `wait` | grey | Offer sent, In review · v1, Checking post |
| `done` | dark with ✓ | Completed, Approved, Live · pending pay |
| `neg` | red | Cancelled |

---

## 6.5 Find work

### 6.5.1 Finder bar (white card, `role="search"`)
- **Row 1:**
  - search input with icon: placeholder "Brand, product or keyword". It filters live as you type (brand + title + category, case-insensitive).
  - **Category** select: "Any category" + the 8 categories (6.5.3). Choosing one sets the category filter to just that one.
  - Green **Search** pill with an arrow. It applies the query and scrolls to the results.
- **Row 2:**
  - **Format tabs** (`role="tablist"`), each with icon + label + count of matches: All formats · App demo · Screen walkthrough · Unboxing · Problem → solution · Comparison · Testimonial · Talking head · Voiceover.
  - **Right tools:**
    - view toggle **Cards / List**;
    - "Sort" + select: **Recommended** (default) · Closing soonest · Newest · Pay: high to low · Pay: low to high.
- **Recommended sort:** new items first, then a relevance score. In production: a match on the creator's category, platforms and follower tier, then closing date.

### 6.5.2 Quick row (under the finder)
- Horizontal chips. Label "**Categories**", then the 8 categories, each with an icon and count.
- Label "**Other services**", then the 7 non-video services (6.5.4), each with an icon and count.
- Click = filter to **only** that one; click again = clear it. The pressed chip is dark.

### 6.5.3 Categories (fixed list, tech first)
AI tools · Consumer apps · SaaS & B2B · Fintech · Gadgets & audio · Gaming · Health tech · E-commerce tech.

### 6.5.4 Services
| Key | Name | Icon | Card title pattern (non-video) |
|---|---|---|---|
| `video` | Full video | ▶ | (video title) |
| `script` | Script writing | ✎ | Write a 30-second script for {brand} |
| `hook` | Hook writing | ⚡ | Write 5 scroll-stopping hooks for {brand} |
| `vo` | Voiceover only | 🎙 | Record a voiceover for {brand} |
| `edit` | Editing only | ✂ | Edit raw footage into a Yapp for {brand} |
| `caption` | Captions & subtitles | CC | Add captions to 6 videos for {brand} |
| `copy` | Ad copy | Aa | Write ad copy for 4 creatives for {brand} |
| `thumb` | Thumbnails & covers | ▣ | Design 5 covers for {brand} |

- Non-video jobs show a **dark service tag** on the card instead of format and platform tags.

### 6.5.5 Platforms (fixed list)
TikTok · Instagram · Facebook · Meta ads · YouTube Shorts · Snapchat · LinkedIn · X.
- A job can target several platforms (e.g. "TikTok + Instagram"). The platform filter matches if the job **includes** that platform.

### 6.5.6 Type bar — the two kinds of work
- **Segmented:** **All** (count) · **UGC campaigns** (count) · **Custom orders** (count).
- **Help text under it:**
  - All: "**Two ways to get work.** UGC campaigns: many creators, fixed price per Yapp, pick a slot. Custom orders: one creator, made to the brief, pitch for it."
  - UGC campaigns: "**UGC campaigns** · a brand needs many Yapps. Fixed price per video. Pick a slot and start today, no pitching."
  - Custom orders: "**Custom orders** · a brand needs one made-to-brief video. Send your idea and price. The brand picks one creator."

| | UGC campaign (`campaign`) | Custom order (`order`) |
|---|---|---|
| Who makes it | Many creators, one slot each | One creator |
| Price | Fixed, per Yapp, set by brand | Budget; creator pitches own price |
| Action | **Pick now** (instant) | **Pitch now** (brand chooses) |
| Who can take it | Creators in the brand's **follower tier** | Any creator (brand chooses) |
| Posting | Creator posts on own account, tag + Paid partnership | Brand runs it as its ad |
| Payment | After approval + verified live post, released at month end | On approval |
| Revisions | Brand approves or comments | Up to 2 revisions |

### 6.5.7 Results
- **Results head:** count text and **active filter chips** (each with ×), one per active filter: format, each service, each category, platform, "$300+", "Closes in 3 days", the search query in quotes.
  - Text: "**N** open · top picks of each type" (All + Cards), or "Showing **1–12** of **N**".
- **All + Cards = two panels:**
  1. **Panel "Pick a Yapp now"** (`.tpanel.camp`):
     - eyebrow "UGC campaigns · quantity";
     - text "Many creators, one brief. Fixed price per video. Grab a slot, no pitching.";
     - big number on the right = total open slots ("Yapps open");
     - grid of the **top 6**; then "See all N UGC campaigns →", which switches the type to UGC campaigns and scrolls to the type bar.
  2. **Panel "Pitch for it"** (`.tpanel.ord`):
     - eyebrow "Custom orders · one creator";
     - text "One made-to-brief video. Send your idea and price. The brand picks who makes it.";
     - number = open orders;
     - top 6 + "See all N custom orders →".
- **A single type selected:** one panel with all items, **12 per page**, pagination "← Prev · 1 2 3 4 · Next →". Changing page scrolls to the top of Find work.
- **List view** (any type): one white card table, 12 per page.
  - Columns: Opportunity (brand tile, title, "brand · category · platform") · Type ("Yapp" / "Order" pill) · Format · Pay ("$140/Yapp" or "$450") · Open (slot bar + "3 of 10 left", or "7 pitches"; closing line under it) · action button ("Pick now · 3 left" green, or "Pitch now" dark).
- **Empty:** "No open work matches · Remove a filter or choose Mix." + "Clear all filters".

### 6.5.8 Sidebar filters (Find work only)
| Group | Control | Behaviour |
|---|---|---|
| Service | checkbox list, 8 services, count each | multi-select (OR within group) |
| Category | checkbox list, 8 categories, count each | multi-select |
| Platform | pills: Any + 8 platforms, count each | single-select |
| Pay at least | pills: Any · $150+ · $300+ · $500+ | single |
| Closes within | pills: Any time · 3 days · 1 week | single |

- **Counts are faceted:** each group's counts apply all **other** active filters, but not its own. Options with 0 are dimmed (`.zero`) but still clickable.
- Groups combine with AND.
- Any change resets to page 1.
- **Clear all** resets: services, type, format, categories, platform, pay, closes within, query.
- **URL:** every filter is mirrored in the query string (`/work?type=campaign&cat=AI+tools&plat=TikTok&svc=script&fmt=demo&pay=300&within=7&q=notion&sort=due&view=list&page=2`) so links can be shared and Back works. *(The preview keeps state in memory; production must use the URL.)*

### 6.5.9 Opportunity card (`.opp`)
- **Whole card** clickable → `/work/[id]`. Hover shows "Details →" at the top right.
- **Top:** brand letter tile (brand colour), brand name, category; "New" tag if new.
- **Title** (2 lines max).
- **Tags:**
  - type tag ("UGC campaign" / "Custom order", green tint);
  - campaigns: follower tier tag "👥 10K–20K";
  - video: format + platform tags; other services: dark service tag.
- **Campaign:**
  - **segmented slot bar**: one segment per slot, filled = taken, green = open;
  - line "4 taken · Closes Fri 13 Nov";
  - price "$140 per Yapp";
  - full-width **Pick now** button (`.mk`, neon): label "Pick now", count pill "**6 of 10 left**" (red when 1 left, class `last`), round arrow. `aria-label="Pick now, 6 of 10 remaining"`.
  - **No slots left:** disabled "All slots taken".
- **Custom order:** line "7 pitches so far · Pitch by Wed 18 Nov"; price "$450 budget"; dark **Pitch now** button.
- Buttons inside the card do their action and do **not** open the page (`stopPropagation`).

---

## 6.6 Opportunity page `/work/[id]`

A **full internal page** (like Saad's original site), not a side panel. Back link "← Find work" (returns to Work, Find work tab, filters kept).

### 6.6.1 Layout
- **Main column (left):** header card, brief card, "How it goes" card.
- **Side column (right):** CTA card, brand card.
- **≤ 1180px:** one column. **Phone:** sticky bottom bar with the main action.

### 6.6.2 Header card
- Brand tile + name + category · status chip on the right: "UGC campaign · pick now" (green) or "Custom order · pitch" (grey).
- H1 = title.
- Chips: format · platform(s) · "30 sec · 9:16" · closing line.

### 6.6.3 The brief (definition list)
| Row | Content |
|---|---|
| What it is | {brand} — {category} product |
| Service | service name (+ " · format" for video) |
| Hook | e.g. "Show the problem in the first 2 seconds" |
| Must show | e.g. "The main screen and one real result" |
| Don't say | e.g. "Best", "free forever", competitor names |
| Deadline | campaign: "Upload within N days of picking · set by {brand}"; order: "Set when you are hired · set by {brand}" |
| Post on your account | campaign: "Yes · {platforms} · tag @{handle per platform}"; order: "No · brand runs it as an ad" |
| Usage | e.g. "Paid ads · 12 months" |

- **Files from {brand}** (if any): list rows with icon (▶ video, ▣ image, ¶ document), name, meta ("Video · 18 s · 6.2 MB"), download button.
  - Files are visible **before** picking, so the creator knows what they're agreeing to.

### 6.6.4 How it goes (numbered steps)
- **Campaign:** 1 Pick (Take a slot) · 2 Upload (Within N days, set by {brand}) · 3 Review (Brand approves) · 4 Post (On your account) · 5 Paid (Month end).
- **Custom order:** 1 Pitch (Idea + price) · 2 Hired (Brand picks you) · 3 Film (By the due date) · 4 Review (Up to 2 changes) · 5 Paid (On approval).

### 6.6.5 CTA card
- **Campaign:**
  - big price "$140 per Yapp";
  - slot bar;
  - "**6 of 10** slots left · Closes Fri 13 Nov";
  - **Pick now** button (count "6 left");
  - checklist:
    - "For creators with {tier} verified followers";
    - "Deadline set by {brand}: upload within N days";
    - "Fixed price, no pitching";
    - "Paid when the brand approves";
    - "Money held safely by Yapp".
- **Custom order:**
  - "$450 budget";
  - "7 pitches so far · Pitch by …";
  - dark **Pitch now** button with "2 min" pill;
  - checklist: "Set your own price" · "Brand picks from pitches" · "Money held when you're hired".
- **Tier gate (production):** if the creator's verified followers on the target platform are outside the job's tier, the button reads "Not in your follower tier" (disabled) with a link "How tiers work".

### 6.6.6 Brand card
- Tile, name, "{category} · verified brand".
- Three stats: Rating (4.8) · Review speed (9h) · Shares results (✓).
- **More from {brand}:** up to 3 rows (icon ⚡ campaign / ✍︎ order, title, "$140 · 3 left" or "$450 · 5 pitches") → their `/work/[id]`.

---

## 6.7 Pick now and Pitch now

### 6.7.1 Pick now (campaign) — from a card, a list row, the CTA card or the phone bar
1. **Confirm modal:**
   - title: "Pick a Yapp from {brand}?"
   - body: "You'll make **1 video** for **$140**. {brand} set the deadline: upload within **N days** of picking. 6 of 10 slots left."
   - buttons: **Pick now** · link "Not now".
2. **On confirm (server, atomic):**
   - reserve one slot (`taken + 1`, must still be `< total`, else show "Someone just took the last slot");
   - create a **Making** order: `{kind:'campaign', stage:'film', deadline: now + dl days, platforms, tags}`;
   - Activity log: "Slot picked · deadline set by {brand}: N days";
   - the brand's funds for this slot are already held (6.11.8).
3. **Success modal:**
   - title: "The slot is yours"
   - body: "It's in **Making**. Film it and upload version 1 within **N days** (set by {brand}). You get paid after they approve and your post goes live."
   - buttons: **Go to the order** (→ `/orders/[id]`) · link "Keep browsing" (closes; the card updates its count).
- The picked item appears at the top of Making with status "Picked · film it" and due "Upload within N days" (amber if ≤ 2 days).

### 6.7.2 Pitch now (custom order)
1. **Modal "Pitch to {brand}":**
   - text: "Tell them your idea in 2–3 lines. N creators pitched so far."
   - fields: **Your idea** (textarea, required, **min 20 characters**) · **Your price** (prefilled with budget, required, **min $30**).
   - buttons: **Send pitch** · link "Cancel".
2. **Validation:**
   - idea < 20: red field + toast "Write your idea in at least 20 characters", focus the field;
   - price < 30: red field + toast "Minimum price is $30".
3. **On send:**
   - pitch count +1;
   - modal "Pitch sent · {brand} will see it in their pitches. You'll get a notification if they pick you.";
   - the pitch appears under "Your pitches".

### 6.7.3 Modal component (shared)
- `showModal({title, body, extra, btn, link, onBtn, onLink})`: centred card with the coloured **blob characters** (Part 5, 5.5.3), title, body (HTML), optional extra fields, a primary pill and an optional text link.
- z-index 135, over the scrim (125). Focus goes to the title; Esc closes.

---

## 6.8 Order page `/orders/[id]`

A **full internal page**, the same for both sides; content depends on the side (brand = "You ordered", creator = "You're making"). Back link "← Work".

### 6.8.1 Layout
- **Main column:**
  1. header card;
  2. **Deliveries** card;
  3. tabs card (Activity · Messages · Brief · Files).
- **Side column:**
  1. **Details** card (money);
  2. person card.
- **Phone:** one column + sticky action bar (`.mbar`).

### 6.8.2 Header card
- **Who line:** avatar or brand tile · name · "You ordered · {format} · {category}" or "You're making · …" · status chip on the right.
- H1 title.
- **Stages** (stepper, Part 4 4.4):
  - custom order: Hired · In progress · Delivered · Approved · Paid;
  - creator campaign: Picked · Upload · Review · Post · Paid (6.9).
- **Next step box** (`.nextbox`): label "Next step" (or "Done"), one sentence, a deadline/clock line, and the action buttons.

| Side · state | Sentence | Clock | Buttons |
|---|---|---|---|
| Brand · version ready | "Version 1 is in. Approve it, or request changes using your open comments. 1 of 2 revisions left." | "Auto-approves Sat 7 Nov · 2 days left" + bar | **Approve and release** (green) · Request changes |
| Creator · changes requested | "{brand} asked for changes on version 1. Fix the open comments and send version 2." | "Due today" (red) | **Send version 2** · Brief |
| Either · completed | "Approved and paid. The clean file and raw footage are in Files. You can leave feedback for 30 days." | — | **Order a variation** · Files |

- "Brief", "Files" and "Message" buttons switch the tab below and scroll to it.

### 6.8.3 Deliveries card (comments on delivered videos — Part 5, 5.5.4)
- **Head:** "Deliveries" + "2 versions · 1 of 2 revisions used" (or "1 version", "Nothing uploaded yet").
- **Version tabs:** thumbnail + "v1 · Ready to review" + comment badge (green if unread). Newest first. The current one is pressed.
- **Player (left):**
  - 9:16 video; for the brand before approval, a **"REVIEW COPY" watermark**;
  - controls: play, "0:09 / 0:30", a timeline with **comment pins** (click a pin → highlight that comment; resolved pins are grey);
  - click on the timeline = set the comment time.
  - Note under the player:
    - brand: "**Watermarked review copy.** You get the clean file and raw footage when you approve."
    - creator: "{brand} sees a watermarked copy until they approve."
    - empty: "Your version 1 will play here after you upload it."
- **Comments panel (right):**
  - head "Comments (4)" + "3 open · 1 done";
  - private note at the top: "🔒 **Private · only you and {other side}** see these comments";
  - **comment item:** avatar, name, time ago, time chip ("0:18", clickable → seeks the player) or "General", text, actions **Reply · Resolve/Re-open · •••**, replies indented;
  - resolved collapse under "✓ N resolved";
  - **empty:** "No comments yet. When {other} watches your version, their notes on the video show up here."
  - **composer:** time chip "@ 0:09" (tap → toggles to a general comment), input "Add a comment at 0:09…", send button. Enter sends; Shift+Enter = new line. Min 2 characters, else toast "Write a comment first". After send: toast "Comment sent · the other side gets a notification".
  - note under it:
    - brand: "Comments don't pause the review. Approve or request changes before Sat 7 Nov."
    - creator: "Reply to notes here. Video feedback stays on the video, not in Messages."
- **Comments are only between the brand and the creator of that order.** Never public, never shown to other creators in the same campaign.

### 6.8.4 Tabs card — order: **Activity · Messages · Brief · Files**
- **Activity is first and the default** every time an order opens (Messages moved to second).
- **Activity:** timeline, newest first; money events marked green. E.g.:
  - "Comment from Sara at 0:18";
  - "Version 1 delivered · Wed 4 Nov · 18:20";
  - "$570 secured and held";
  - "Hired from pitches";
  - "Order posted".
- **Messages:** the order's own thread (5.5.5). Bubbles: mine dark, theirs white, system lines as centred grey pills ("Hired · Mon 2 Nov", "Version 1 sent", "3 new comments on Version 1 · View" → jumps to the player). Composer "Message {name}…".
- **Brief:** the definition list from the order (product, format, length, platform, hook, must show, don't say, category) + brand files.
- **Files:** review copy, brand files, demo account (with a Copy button for credentials), and after approval the clean file + raw footage.

### 6.8.5 Details card (side)

**Brand:**
- big total "$627", "Total, charged on approval";
- paystat: "**$627 held** · released to Maya when you approve";
- rows: creator's price · add-ons (e.g. Raw footage $60) · Service fee (10%) · Due · Revisions "1 of 2 used" · Usage rights.

**Creator:**
- "$570", "You earn · you keep 100%";
- paystat: "**Held by Yapp** · lands in your wallet on approval";
- rows: your price · add-ons · Due (red if today) · Revisions · Post on (platform · tag).

**Creator campaign (6.9):**
- "$140", "You earn · you keep 100%";
- paystat "**Reserved for you** · paid after approval and a live post" (or "Pending · unlocks Mon 30 Nov");
- rows: Deadline "N days · set by {brand}" · Post on · **Tag** (one handle per platform, "@notely.ai TikTok") · Label "Paid partnership on" · Keep it up "Until month end".

### 6.8.6 Person card (side)
- **Brand sees the creator:** avatar, name, "@handle · city", stats Rating · On time · Avg CTR, buttons Message · Profile.
- **Creator sees the brand:** tile, name, "{category} · city/verified brand", stats Orders · Review speed · Shares results, buttons Message · Brand page.

### 6.8.7 Phone sticky bar
- Brand reviewing: **Approve** · Request changes.
- Creator fixing: **Send version 2**.
- Campaign film stage: **Upload version 1**. Post stage: **Add post link**.
- Done: **Order a variation**.

---

## 6.9 Creator campaign flow (after Pick now)

Stages and stepper mapping:

| Stage key | Stepper current | Status chip | Next step sentence | Buttons |
|---|---|---|---|---|
| `film` | Upload | Picked · film it (`move`) | "Film it and upload version 1. Deadline set by {brand}: **N days** from picking." + "Upload by Thu 12 Nov" | **Upload version 1** · Brief |
| `review` | Review | In review · v1 (`wait`) | "Version 1 is with {brand}. They watch the watermarked copy and comment, or approve." + "Auto-approves in 3 days if they don't respond" | Message |
| `post` | Post | Post due (`attn`) | "Approved! Now post it on your {platform} with the tag and the paid-partnership label, then add the link." + "Post within 2 days" | **Add post link** · Posting rules |
| `checking` | Post | Checking post (`wait`) | "Checking your post: tag and paid-partnership label…" + "Usually under a minute" | — |
| `live` | Paid | Live · pending pay (`done`) | "Your post is live. **$140** unlocks at month end (Mon 30 Nov) if the post stays up." + "✓ Verified · tag and label found" | View post |

- **Changes requested** on a campaign version: the stage goes back to `film` with "Upload version 2" (same sheet, title v2, the brand's open comments as the checklist).

### 6.9.1 Sheet "Upload version 1"
- **Description:** "{brand} sees a watermarked, low-quality copy until they approve. Deadline: N days, set by {brand}."
- **Drop zone:** "Drop your video here · MP4 or MOV · 9:16 · up to 500 MB · or click to choose from your computer". After upload: "my_yapp_v1.mp4 · 38 MB ✓ Uploaded" (green).
- **Checklist "The brief · tick what you covered"** (built from the brief):
  - Hook in the first 2 seconds;
  - Show the main screen and one real result;
  - No "best" or "free forever";
  - 9:16, about 30 seconds.
- Note for {brand} (optional).
- **Send version 1** stays **disabled until** a file is uploaded **and** every checklist item is ticked.
- **On send:**
  - stage `review`, chip "In review · v1", due "Auto-approves in 3 days";
  - Activity "Version 1 sent";
  - brand notified;
  - modal "**Version 1 is with {brand}** · We've let them know. They have 3 days to review. If they don't respond, it's approved automatically. Then you post it and get paid at month end."
- **Server checks (production):** container MP4/MOV, aspect ratio 9:16 (±2%), duration within the brief ±5 s, ≤ 500 MB; generate the watermarked low-bitrate review copy; keep the original private until approval.

### 6.9.2 Brand approves a campaign version
- Uses the same Approve sheet (6.10.1). Payment for campaign slots is **not** released on approval; approval moves the creator to `post`.
- Activity: "Version 1 approved by {brand}".
- *(The preview has a link "Demo: {brand} approves" in the review stage, to simulate it. Remove it in production.)*

### 6.9.3 Sheet "Add your post link"
- **Description:** "Post the approved video on your {platform}, then paste the link. We check it automatically."
- **Field: Post link** (URL). Helper text changes to "✓ Looks like a link" when valid (`^https?://\S+\.\S+`).
  - **Production:** the URL must belong to one of the job's platforms (domain check) and to the creator's connected account.
- **Checklist "Before you paste":**
  - Tagged **@handle(s)** in the post (one per platform, from the brand's saved accounts);
  - Turned on the **Paid partnership** label;
  - I'll keep it up until month end so the payment unlocks.
- **Verify post** stays disabled until the link is valid **and** all three are ticked.
- **On verify:**
  - stage `checking` (Activity "Post link added");
  - the server fetches the post: exists, public, from the creator's account, has the tag, has the paid-partnership label;
  - **pass** → `live`, chip "Live · pending pay", due "Unlocks Mon 30 Nov", Activity "Post verified · $140 pending until Mon 30 Nov" (money), toast "Post verified · payment unlocks at month end";
  - **fail** → back to `post` with the exact reason ("Tag @notely.ai not found", "Paid partnership label is off", "Post is private").
- **Month end:** re-check the post is still up, then release to the wallet. If it was removed early: notify both sides; the payment is held and goes to support.

---

## 6.10 Brand side sheets (stay as side sheets)

**Sheet component:** slides in from the right, width 440px (full width on phone, bottom sheet), z-index 130 over the scrim (125), close ×, title, description, body, sticky footer with actions. A 2-segment progress indicator is shown when the sheet has 2 steps. Esc and scrim click close it. Focus is trapped inside.

### 6.10.1 Approve and release (step 1 of 2)
- **Title:** "Approve version 1?"
- **Description:** "Payment is released to {first name} straight away. This can't be undone."
- **Summary box:** "{name} receives $570" · "Yapp service fee (10%) $57" · **Total charged $627**.
- **What happens:**
  - You get the clean file, without the watermark, plus raw footage.
  - Usage rights start today: paid ads, 12 months.
  - Open comments are closed. You can still leave feedback for 30 days.
- **Buttons:** "Not yet" · **Approve and release $627** → status Approved, then step 2.
- **Campaign slot:** the summary says "Approve to move {name} to posting. Payment is released at month end after the post is verified."

### 6.10.2 Review (step 2 of 2)
- **Title:** "Review {first name}". Description: "Approved. $570 is on its way to {name}. Your review helps other brands choose."
- **Overall** stars (1–5, required).
- **The details** (optional): Quality · Communication · Timeliness, small stars each.
- **Your review** (textarea, required, **min 20 characters**), counter "At least 20 characters · N more" → "✓ Good to go".
- Toggle "**I'd hire {name} again**" (on by default) · "Shown as "Would hire again" on the review."
- **Buttons:** "Skip for now" · **Post review**, disabled until overall stars + 20 characters.
- **Then:**
  - the page shows the Done state;
  - modal "**Approved · $570 released** · {name} has been paid. Your clean file and raw footage are in Files." · Done · link "Order a variation";
  - "Skip for now" also finishes, and a reminder to review stays in Needs you for 7 days.

### 6.10.3 Request changes
- **Title:** "Request changes".
- **Description:** "{name} gets your notes with their timestamps and starts on version 2. 1 of 2 revisions left after this."
- **"Send these comments":** a checkbox per open comment (checked), with its time chip or "General".
- **"Anything else?"** (optional textarea).
- **What happens:** "The auto-approval timer stops until version 2 arrives." · "Payment stays held."
- **Validation:** at least **one comment ticked**, or a note of **10+ characters**. Else toast "Pick a comment or write what to change (10+ characters)" and focus the note.
- **On send:**
  - status "Revision · v2";
  - creator notified;
  - toast "Changes sent · {name} is on version 2".
- **No revisions left:** the button is replaced by "Open a dispute" (5.5.1 flow).

### 6.10.4 Creator: Send version 2 (custom order)
- Same as 6.9.1, titled "Send version 2". The checklist is "Their notes · tick what you fixed" (the brand's open comments with time chips).
- Disabled until the file is uploaded and all ticked.
- **Modal:** "**Version 2 is with {brand}** · They have until Wed 11 Nov to review. If they don't respond, it's approved automatically and $570 is released to you." · Done · "View order".

---

## 6.11 New order `/orders/new` (as a brand)

- Opened from: **New order** in the nav, **+** on phone, "Post a new order" in Ordered, "Order a variation".
- It lives on the **brand side**: back link "← Work" returns to **Ordered**. Eyebrow "**As a brand**", H1 "New order".

### 6.11.1 Layout
- **Main:** header with the 6-step stepper, the step body card, nav row (**Back** ghost, hidden on step 1 · **Continue** dark, or **Post order** green on the last step).
- **Side:** live **Summary** card.

### 6.11.2 Steps (in this order)
1. **Type**
2. **Size & price**
3. **Basics**
4. **Brief**
5. **Deadline**
6. **Post**

### 6.11.3 Step 1 — Type
- H2 "What do you need?" · hint "Pick one. You can post the other kind later."
- **Two big cards (radio):**
  - **UGC campaign** (eyebrow "Quantity"): "Many creators make Yapps from one brief. Fixed price per video. Creators pick a slot and start." · Lots of Yapps fast · No pitches to review · Creators post on their accounts.
  - **Custom order** (eyebrow "One creator"): "One made-to-brief video. Creators send pitches with their idea and price. You choose." · You pick the creator · Up to 2 revisions · Run it as your ad.
- **Required:** "Choose UGC campaign or custom order."

### 6.11.4 Step 2 — Size & price (campaign)
- H2 "Size and price" · hint "Pick who can take your slots, how many Yapps you need, and what you pay for each."
- **Follower tier** (segmented radio group): "Creators qualify by verified real followers on the platform they post to".

| Tier id | Label | From (min price per Yapp) | Status |
|---|---|---|---|
| `t10` | 10K–20K | $30 | confirmed (from repo `lib/taxonomy.tsx`) |
| `t20` | 20K–50K | $40 | confirmed |
| `t50` | 50K–100K | $50 | **TBC** |
| `t100` | 100K–250K | $60 | **TBC** |
| `t250` | 250K+ | $75 | **TBC** |

- Labels show "from $30", and "· TBC" for the unconfirmed tiers until the owner decides. Changing tier raises the price to the tier minimum if it was below.
- **Two equal values side by side, with "×" between them.** The number of Yapps and the price use the **same size** (64px, weight 500, tabular numbers). The $ is a small superscript, not full size.
  - **Yapps:**
    - label "Yapps"; the big number;
    - small pill stepper "− 5 +" (− disabled at 10);
    - quick chips 10 · 20 · 30 · 50 · 100;
    - note "Minimum 10, in steps of 5";
    - max 500.
  - **Price per Yapp:**
    - label; big editable number with superscript $;
    - stepper "− $5 +" (− disabled at the tier minimum);
    - 3 chips from the recommendation (low · middle · high);
    - **recommendation line** (6.11.5);
    - "Where these numbers come from" (expandable sources).
- **Total line:** "Total for videos **$1,400**" (qty × price), updates live.
- **Errors:**
  - qty: "Use 10 or more, in steps of 5."
  - price: "Minimum is $N per Yapp for this tier." / "That looks too high. Max $5,000 per Yapp."
  - tier: "Pick a follower tier."
- **Custom order** instead shows "Your budget": "One creator makes one made-to-brief video. Creators pitch their own price around this." Field Budget ($), min **$50**, max **$50,000**, step 50.

### 6.11.5 Price recommendation (grounded in market data)
- **Market anchors (2026):**
  - average **paid** price for a UGC video **$154** (asking $180) — Collabstr 2026 report, 21,000+ collaborations, via Knowlify;
  - average cost per UGC deliverable **$198** — Billo pricing data, via DesignRevision;
  - tech / SaaS products **+30–50%** premium — InfluenceFlow rate card.
- **Category factor `f`:**

  | Category | f |
  |---|---|
  | AI tools | 1.4 |
  | Consumer apps | 1.3 |
  | SaaS & B2B | 1.5 |
  | Fintech | 1.5 |
  | Gadgets & audio | 1.3 |
  | Gaming | 1.2 |
  | Health tech | 1.4 |
  | E-commerce tech | 1.3 |
  | (not chosen yet) | 1.3 |

- **Formula (video):** `low = max(tierMin, round5(154 × f))`, `high = max(tierMin + 20, round5(198 × f))`.
- **Other services** (Yapp estimate, no public benchmark yet):

  | Service | Range |
  |---|---|
  | script | $40–90 |
  | hook | $30–70 |
  | vo | $50–110 |
  | edit | $60–140 |
  | caption | $30–60 |
  | copy | $40–90 |
  | thumb | $30–80 |

  Each is raised to at least the tier minimum.
- **Message under the price:**
  - below tier min (and below $30): red "Minimum for the {tier} tier is $N per Yapp." (blocks Continue);
  - below `low`: **red** "Below the usual $low–$high for {category} at {tier}. Raise it so more creators pick your slots." (warning only; the brand may continue, and the Post step repeats the warning);
  - otherwise: "✓ In line with the market for {category} at {tier}: $low–$high".
- **Sources block:** the four bullets above with links. Keep the links up to date. When we have our own data (≥ 200 completed campaigns per category), switch to Yapp medians and say so.

### 6.11.6 Step 3 — Basics
- **Product name** (required, 2–60 characters). Placeholder "e.g. Notely AI". In production: a select from **Products** with "+ New product".
- **Category** (required select, the 8 categories).
- **Service** (select, 8 services, default Full video).
- **Format** (pills, only when service = Full video; required): the 8 formats.
- **Platforms — pick one or more** (multi-select pills with ✓; required, at least one). The 8 platforms.
- **Accounts creators should tag** (appears once a platform is chosen): one row per chosen platform.
  - **Saved:** "@handle" with a green "Saved" badge + **Change** link.
  - **Not saved / editing:** an input with an "@" prefix (leading @ is stripped), max 30.
  - **Validation:** `^[A-Za-z0-9._]{2,30}$`. Errors: "Add the {platform} account creators should tag." / "Use letters, numbers, dots or underscores (2–30)."
  - **Saved on blur** when valid (toast "Saved @handle for {platform}") and on Continue.
  - Note: "Entered once and saved to your brand profile. Change them here any time, or in Settings → Brand accounts."
  - **Production:** store on the **brand profile on the server** (`BrandAccount`, 6.14), not in localStorage (the preview uses localStorage only for the demo). Add **Settings → Brand accounts** to edit them.

### 6.11.7 Step 4 — Brief
- H2 "The brief" · hint "Short and clear wins. Creators see this before they pick a slot / pitch."
- **The hook · first 2 seconds** (required, 10–300 characters).
- **Must show** (required, 10–300 characters).
- **Don't say** (optional).
- **Attachments** (optional), "help creators get it right". Drop zone or click; multiple files.

| Type | Accepted | Limit |
|---|---|---|
| Document (brand guide, script) | PDF, DOC, DOCX, TXT, MD | each ≤ 10 MB |
| Reference video | any `video/*` | **one** video, **≤ 20 seconds** (duration read from metadata; allow 20.5 s), ≤ 10 MB |
| Images | any `image/*` | **up to 10**, each ≤ 10 MB |

- Each file row: icon, name, meta ("Video · 18 s · 6.2 MB"), remove ×. Counter "3/10 images · 1/1 video".
- **Rejections** (shown together in red under the list, the rest are still added):
  - "{name} is over 10 MB";
  - "Up to 10 images";
  - "One reference video only";
  - "{name} is 34 s · max 20 seconds";
  - "{name}: use PDF, DOC or TXT".
- **Production:** repeat every check on the server, virus-scan, strip EXIF, store privately, signed URLs for creators who can see the job.

### 6.11.8 Step 5 — Deadline (set by the brand) and rights
- **Deadline · you set it** (pills, required): 2 · 3 · 5 · 7 · 10 days.
  - Campaign: "Time a creator has to upload version 1 after picking a slot."
  - Order: "Time the hired creator has to deliver version 1."
- The deadline is shown everywhere as "**set by {brand}**" (cards, opportunity page, pick modals, order page).
- **Usage rights** (select, required): Paid ads · 12 months (default) · Paid ads · 6 months · Organic only · Paid ads · forever.

### 6.11.9 Step 6 — Check and post
- H2 "Check and post" · hint "It goes live in Find work right away." + campaign "Money is held per slot as creators pick." / order "Nothing is charged until you hire."
- **Summary list:**
  - Type · Product · Category · Service (+ format);
  - Platforms (each with @handle) · Deadline;
  - Follower tier (campaign);
  - Yapps "10 × $140" or Budget, with the red below-market note if relevant;
  - Attachments count · Hook · Must show.
- **Required checkbox:**
  - campaign: "The brief is accurate and I'll review each version within 3 days. Yapp holds $1,540 and releases it per approved video."
  - order: "… Nothing is charged until I hire a creator."
  - Error "Confirm before posting."
- **Post order:**
  - creates the opportunity, `isNew`, closes in 14 days;
  - adds it to "Your orders" with "just posted";
  - modal "**{product} is live** · Creators can pick a slot now in Find work. You'll see each review copy in **Ordered**." (order: "Creators can pitch now. New pitches show up in **Ordered**.") · **Go to Ordered** · link "See it in Find work" (→ `/work/[id]`).
- **Money (production):** campaign: charge or authorize `qty × price + 10%` on post and hold it; release per approved and verified video; refund unpicked slots when the campaign closes. Custom order: charge on hire.

### 6.11.10 Summary card (side, live)
- Big total "$1,540"; "10 Yapps × $140 + 10% fee" (order: "Budget + 10% fee, charged when you hire").
- Paystat "**Held safely by Yapp** · released only when you approve".
- Rows: Type · Follower tier (campaign) · Deadline · Platforms.

### 6.11.11 Validation rules (nothing can be skipped)
- **Continue** runs `validate(step)`. If anything is invalid:
  - every invalid field gets the red state and its message under it (`role="alert"`);
  - the page scrolls to the first error and focuses its field;
  - a toast says the single error, or "N things to fix before you continue";
  - the step does not advance.
- After the first failed attempt, fields re-validate **live** as the user types.
- **Back** never validates and keeps every value.
- **Direct links:** opening `/orders/new?step=4` jumps to the **first invalid step** instead.
- **The server re-validates everything on post** (same rules) and returns field errors in the same shape.
- **Draft:** autosave every change (server); unfinished orders appear in "Your orders" as "Draft, not posted · saved 2h ago".

---

## 6.12 Productivity inside Work (Insights)

- A summary of `/productivity` (Part 5, 5.9), not a replacement.
- **Header:**
  - role toggle **As a brand / As a creator**;
  - date range select (Last 30 days · Last 7 days · Last 90 days · 12 months);
  - Export (CSV).
- **4 KPI cards** with sparklines; the first card is green.
  - Brand: CAC $18.40 ↘ 12% better · Spend on Yapp $6,840 ↗ 18% · Hook rate 41% ↗ 6 pts · CTR 2.3% ↗ 0.4 pts.
  - Creator: Earnings $3,420 ↗ 22% · Pending $570 in review · On-time 98% ↗ 3 pts · Rehire rate 62% ↗ 8 pts.
- **Chart card:** "Spend & results" / "Earnings over time", vs previous 30 days (green area + grey dashed comparison).
- **People card:** "Creators you worked with" / "Brands you worked with", with spend or earned and CTR or review speed. "See all".
- Link "**Open full Productivity →**" → `/productivity`.
- Metric definitions and privacy rules: Part 5, 5.9.6–5.9.7.

---

## 6.13 States, feedback and accessibility

- **Toasts** (z 140): short confirmations ("Comment sent · …", "Saved @handle for TikTok", "Changes sent · …").
- **Loading:** skeleton cards in Find work; the slot bar animates once.
- **Errors:**
  - network failure on an action → keep the sheet open, show "Couldn't send. Try again." with retry;
  - a slot already taken → modal "Someone just took the last slot" + "See similar".
- **Keyboard:**
  - cards and rows are focusable (`tabindex="0"`), Enter opens;
  - format tabs `role="tablist"`;
  - filters `role="checkbox"` / pressed pills;
  - sheets and modals trap focus, Esc closes, focus returns to the trigger.
- **Labels:** Pick buttons carry "Pick now, 6 of 10 remaining"; price input "Price per Yapp in dollars"; steppers "5 more", "$5 less".
- **Tap targets** ≥ 44px on phone. **Contrast:** neon blocks use dark text only.
- **Numbers:** tabular numerals (`.num`) everywhere money or counts appear.
- **No horizontal overflow** at 390, 768, 1180, 1440, 1920 (verified in the preview at 390 and 1440).

---

## 6.14 Data contracts (TypeScript, add to `lib/types.ts`)

```ts
export type Platform = "TikTok"|"Instagram"|"Facebook"|"Meta ads"|"YouTube Shorts"|"Snapchat"|"LinkedIn"|"X";
export type Category = "AI tools"|"Consumer apps"|"SaaS & B2B"|"Fintech"|"Gadgets & audio"|"Gaming"|"Health tech"|"E-commerce tech";
export type ServiceKey = "video"|"script"|"hook"|"vo"|"edit"|"caption"|"copy"|"thumb";
export type FormatKey = "demo"|"walk"|"unbox"|"prob"|"comp"|"test"|"talk"|"voice";
export type TierId = "t10"|"t20"|"t50"|"t100"|"t250";
export type Usage = "paid_12m"|"paid_6m"|"organic"|"paid_forever";

export type BrandAccount = {           // saved once per brand, editable in Settings → Brand accounts
  brandId: string; platform: Platform; handle: string; verified?: boolean; updatedAt: string;
};

export type Attachment = {
  id: string; kind: "doc"|"video"|"image"; name: string; bytes: number;
  durationSec?: number; url: string;   // signed URL
};

export type Opportunity = {
  id: string; brandId: string;
  kind: "campaign"|"order";
  service: ServiceKey; format?: FormatKey; category: Category;
  platforms: Platform[]; tags: Partial<Record<Platform,string>>;   // handle per platform
  title: string; hook: string; mustShow: string; dontSay?: string;
  attachments: Attachment[];
  deadlineDays: 2|3|5|7|10;            // set by the brand
  usage: Usage;
  // campaign
  tier?: TierId; pricePerYapp?: number; slotsTotal?: number; slotsTaken?: number;
  // order
  budget?: number; pitches?: number;
  closesAt: string; createdAt: string; status: "draft"|"open"|"closed";
};

export type CampaignStage = "film"|"review"|"post"|"checking"|"live"|"paid"|"changes";

export type WorkItem = {               // one row in Ordered or Making
  id: string; opportunityId: string; side: "brand"|"creator";
  kind: "campaign"|"order"; stage?: CampaignStage;
  status: { tone: "attn"|"move"|"wait"|"done"|"neg"; label: string };
  dueAt?: string; price: number; commentCount: number; unread: boolean;
  postUrl?: string; postCheck?: { tag: boolean; paidLabel: boolean; public: boolean; checkedAt: string };
  unlocksAt?: string;                  // month end for campaigns
  log: { text: string; at: string; money?: boolean }[];
};

export type Pitch = { id: string; opportunityId: string; creatorId: string; idea: string; price: number; createdAt: string; status: "sent"|"hired"|"declined" };

export type Review = { orderId: string; overall: 1|2|3|4|5; quality?: number; communication?: number; timeliness?: number; text: string; hireAgain: boolean };

export type WorkQuery = {
  type?: "all"|"campaign"|"order"; q?: string; cat?: Category[]; svc?: ServiceKey[]; fmt?: FormatKey|"all";
  plat?: Platform; pay?: 0|150|300|500; within?: 0|3|7;
  sort?: "rec"|"due"|"new"|"hi"|"lo"; view?: "grid"|"list"; page?: number;
};
```

**API (suggested):**
- `GET /api/work?…WorkQuery` → `{ items, total, facets: { svc, cat, plat, fmt, kind } }`
- `GET /api/work/:id`
- `POST /api/work/:id/pick` → 409 if no slot left or tier mismatch
- `POST /api/work/:id/pitch {idea, price}`
- `POST /api/orders` (new order) · `PATCH /api/orders/draft/:id`
- `POST /api/orders/:id/versions` (upload) · `POST /api/orders/:id/approve` · `POST /api/orders/:id/changes {commentIds, note}` · `POST /api/orders/:id/review`
- `POST /api/orders/:id/post-link {url}` → async verify, webhook/notification on result
- `GET/PUT /api/brand/accounts`

---

## 6.15 Analytics events (for us)

| Event | Properties |
|---|---|
| `work_view` | section (find/ordered/making/prod) |
| `work_filter` | key, value, resultCount |
| `work_search` | q length, resultCount |
| `work_type_switch` | type |
| `work_view_toggle` | grid/list |
| `opp_open` | id, kind, from (card/list/brand card) |
| `pick_start` / `pick_confirm` / `pick_fail` | id, slotsLeft, reason |
| `pitch_send` | id, price, ideaLength |
| `v_upload` | orderId, version, sizeMB |
| `post_link_submit` / `post_verified` / `post_failed` | orderId, platform, reason |
| `approve` / `changes_request` / `review_post` | orderId, stars, hireAgain |
| `new_order_step` | step, errors[] |
| `new_order_post` | kind, qty, price, tier, belowMarket (bool), platforms, attachments |
| `price_reco_shown` | category, tier, low, high, price |

---

## 6.16 Acceptance criteria

1. **Work on desktop:** sidebar shows Find work · Ordered · Making · Productivity with counts; Find work is the default; the filters appear only on Find work; the "Needs you" block shows the single most urgent item or nothing.
2. **≤ 1180px:** tabs replace the sidebar; filters open in a sheet; no overflow at 390/768/1180.
3. **Find work:**
   - search, category select, format tabs, quick categories, other services, type bar, sidebar filters, sort, grid/list and pagination all work together;
   - facet counts are correct;
   - active chips remove their filter;
   - Clear all resets everything;
   - filters live in the URL.
4. **Two kinds are always separate:** All + Cards shows two panels (Pick a Yapp now / Pitch for it), top 6 each, with "See all"; campaign cards show the slot bar and "Pick now · N of M left"; order cards show pitches and "Pitch now".
5. **Opportunity page** is a full page at `/work/[id]` with the header, brief (including the deadline "set by {brand}" and the brand's files), How it goes, CTA and brand card; Back returns with filters kept.
6. **Pick now** reserves a slot atomically, creates a Making item in stage `film`, shows both modals and updates the counts; a full campaign can't be picked; tier mismatches are blocked.
7. **Pitch now** blocks ideas under 20 characters and prices under $30.
8. **Order page:**
   - full page;
   - tabs in the order **Activity · Messages · Brief · Files**, Activity default;
   - comments are private to the two sides, timestamped or general, with replies, resolve and pins synced to the player;
   - the watermark shows for the brand before approval.
9. **Campaign flow:** Upload v1 (disabled until file + full checklist) → review → approve → Add post link (valid URL + 3 confirmations) → verification → live with "unlocks {month end}"; failures show the exact reason.
10. **Brand sheets:**
    - Approve shows receives / fee / total and releases on confirm, then Review (stars + 20 characters required, hire-again toggle), then the Done state;
    - Request changes needs a ticked comment or a 10+ character note and stops the auto-approval timer.
11. **New order:**
    - 6 steps;
    - Size & price is step 2 with the tier, Yapps (min 10, steps of 5, max 500) and price (≥ tier minimum and ≥ $30) at the **same size**, a superscript $, the recommendation (red below the market range) and cited sources;
    - multi-platform with saved handles per platform (server-side);
    - attachments obey the limits (≤ 10 MB each, one video ≤ 20 s, ≤ 10 images, docs PDF/DOC/DOCX/TXT/MD);
    - deadline set by the brand;
    - the required confirmation;
    - **no step can be passed with an invalid or empty required field**, and the server repeats the checks.
12. **Logo** everywhere on these routes is the original: black bubble with white, white, green dots (white bubble on dark).
13. **Accessibility:** focus trap and Esc on every sheet and modal; all actions reachable by keyboard; tap targets ≥ 44px.

---

## 6.17 Decisions log
- Work is the desktop backbone: Find work first, then Your work (Ordered / Making), then Insights.
- Opportunity and order pages are **full internal pages**; only Approve & release, Review, Request changes, Upload, Post link and Deliver are **side sheets**.
- UGC campaigns (quantity, Pick now) and Custom orders (one creator, Pitch now) are **separate** everywhere.
- Other services (script, hooks, voiceover, editing, captions, ad copy, thumbnails) are first-class jobs.
- The **deadline is set by the brand** (2/3/5/7/10 days) and shown as "set by {brand}".
- Comments are **only between the brand and the creator** of that order.
- **Activity** is the first and default tab; Messages moved to second.
- New order lives on the brand side; minimum 10 Yapps in steps of 5; minimum $30 per Yapp; Size & price is step 2.
- Follower tiers from the original site with "from" prices; $50 / $60 / $75 for the top three tiers are **TBC** (owner to confirm).
- Price guidance uses cited market data (Collabstr via Knowlify, Billo via DesignRevision, InfluenceFlow) with tech category factors; below range shows a red warning but does not block.
- Brand accounts to tag: entered once, saved to the brand profile, changeable later.
- Logo: the **original** (white, white, green dots). Part 5, 5.3.2 must be updated.

## 6.18 Open items
- Confirm tier prices for 50K–100K, 100K–250K and 250K+.
- Confirm the campaign close window (preview: 14 days) and the unpicked-slot refund rule.
- Confirm whether the below-market warning should ever block posting (currently: no).
