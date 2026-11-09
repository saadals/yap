# YAPPS — Mobile: Welcome (bubbles) → Sign-in → Reels feed

> One file for the whole mobile experience (mobile web + iOS/Android app), in the order a user meets it:
> **Part 2** = signed-out welcome with 3D creator bubbles, tap-a-face reels, two stacked buttons, and the sign-in page (phone + code, Apple, TikTok, Instagram, Google, saved accounts).
> **Part 3** = after sign-in: the full-screen Reels feed (Mix · Yapps · Orders), Make Yapp now, swipe-left details, glass tab bar.
> Preview file: **`YAPPS_MOBILE.html`** (the iPhone frame scales itself to fit any window; on a real phone it fills the screen).
> Flow: welcome → tap a button → sign in → feed. Reopening while signed in goes straight to the feed. Profile tab → Log out → welcome again.

---

# PART 2 — Welcome screen (signed out) → Sign-in

> On mobile the bubble screen is shown **only to signed-out users**, as the welcome/entry screen. After sign-in the user goes to the Reels feed (Part 3) and never sees the bubbles again until they log out.

## 2.1 Scope
- **Mobile web** (viewport < 1024px, any mobile browser) **and the native app** (iOS / Android).
- Tokens: `--bg #F7F7F9`, `--ink #1D1D1F`, `--neon #34F06C`, `--on-neon #0B0B0C`; glass recipe (translucent white + `blur(20–24px) saturate(180%)` + 1px white border + top highlight).
- Reference device: **iPhone 18 Pro Max** (440 × 956 pt; safe areas ≈ 62pt top, 34pt bottom). All positions use `env(safe-area-inset-*)`.
- Native app rendering: `@react-three/fiber/native` + `expo-gl` (same scene code as web). If the device GPU is weak, fall back to a 2D `@shopify/react-native-skia` bubble layer with the same layout and motion.

## 2.2 Routing rule (single source of truth = auth state)
| Auth state | What the user sees on open |
|---|---|
| **Signed out** (no valid session) | **Welcome screen** (2.3): bubbles + two stacked buttons. |
| **Signed in** (valid session / refresh token) | **Reels feed** directly. Neither the bubble screen nor the sign-in page is shown. |

- Web: enforce in Next.js `middleware.ts`. Signed-in requests to `/` or `/auth` redirect (server-side, no flash) to `/feed`; signed-out requests to `/feed` redirect to `/`.
- Native: on cold start, read the session from `expo-secure-store` before hiding the splash screen, then route with `router.replace('/feed')` or `router.replace('/welcome')`. The welcome screen must never flash for a signed-in user.
- Sessions are long-lived (refresh token), so the sign-in page is seen **once**, after the first button tap, and again **only after the user logs out**.
- **After logout** the user is signed out, so the welcome screen appears again; the sign-in page then shows their saved accounts (2.7).

## 2.3 Welcome screen layout (portrait)
- Full-screen 3D bubble scene (the same scene as the desktop landing, mobile-tuned per 2.4) as the background, edge to edge, respecting safe areas.
- **No top navigation bar.** Only the **yapp logo** (icon + wordmark, 22px) centered at the top: `top: calc(env(safe-area-inset-top) + 16px)`.
- **Two buttons stacked vertically** at the bottom, full width:
  - Container: `position: fixed; left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom) + 16px); display: grid; grid-template-columns: 1fr; gap: 10px; z-index: 10;`
  - Order (top → bottom): **"Ask for Yapps"**, then **"Get Yapps (UGC Campaign)"**.
  - Each button: `height: 56px; border-radius: 18px;` with the glass recipe (`rgba(255,255,255,0.55)`, `blur(20px) saturate(180%)`, 1px `rgba(255,255,255,0.7)` border, soft shadow + top highlight), label 16px weight 600 `var(--ink)`.
  - **Touch feedback (no hover on mobile):** on `pointerdown`, `background → var(--neon)`, `color → var(--on-neon)`, `scale(0.98)`, plus a light haptic (`expo-haptics` `ImpactFeedbackStyle.Light` in the app; `navigator.vibrate(10)` where supported on web).
- Minimum touch target 48px; buttons are real `<button>` / `Pressable` elements with accessible labels.

### 2.3.1 Edge fades (layer order)
Soft fades at the top and bottom make the logo and the buttons easier to read against the moving bubbles.
- **Layer order, front to back:** logo / buttons (`z-index: 10`) → fade layer (`z-index: 5`) → bubble canvas (`z-index: 0`). The fades must never cover the logo or the buttons.
- **Top fade:** `position: fixed; top: 0; left: 0; right: 0; height: calc(env(safe-area-inset-top) + 120px); pointer-events: none;`
  `background: linear-gradient(to bottom, var(--bg) 0%, rgba(247,247,249,0.85) 35%, rgba(247,247,249,0) 100%);`
- **Bottom fade:** `position: fixed; bottom: 0; left: 0; right: 0; height: calc(env(safe-area-inset-bottom) + 240px); pointer-events: none;`
  `background: linear-gradient(to top, var(--bg) 0%, rgba(247,247,249,0.85) 40%, rgba(247,247,249,0) 100%);`
- The gradient colour must use the same value as `--bg` (as rgba), so the fade blends invisibly into the background.
- The desktop landing uses the same fades, lighter (see `YAPPS_DESKTOP_SPEC.md`).

## 2.4 Bubble scene on mobile
- **Count:** 30–40 bubbles (`BUBBLE_COUNT_MOBILE = 36`).
- **Field shaped for portrait:** `x ∈ [-5, 5]`, `y ∈ [-9, 9]`, `z ∈ [-40, -3]`.
- **Automatic slow fly-through:** since there is no mouse wheel, the camera moves forward continuously at **~0.9 units/s** (calm, constant), using the same infinite recycling and creator queue as the desktop landing (bubbles are pooled; each recycled face takes the next creator from a shuffled queue). Slow ambient drift stays on.
- Avatars = the creators' own Yapp profile photos (256 × 256 WebP derivative, face-cropped). Creators without a photo are left out; the field never runs out: bubbles are pooled and every recycled face bubble takes the next creator from a shuffled queue.
- Performance: sprite/disc + cheap glass (no `transmission`) on mobile; `dpr` max 2; pause rendering when the app is backgrounded or the tab is hidden; target 60fps on iPhone 12 / mid-range Android (2021+), with an acceptable floor of 30fps on low-end devices (reduce count to 24).
- `prefers-reduced-motion` / iOS "Reduce Motion": no fly-through, gentle drift only.

### 2.4.1 Tap a bubble → reel preview (mobile)
- **Single tap on an avatar bubble** opens that creator's Reel Preview, **two of the creator's videos** played in turn (9:16, radius 24px, Stories-style segments, name / handle / niche at the bottom), **in the center of the screen**. Detect a tap as `pointerup` within 250ms and 10px of `pointerdown`, so a scroll/drag is never mistaken for a tap. Decorative bubbles ignore taps.
- **Placement:** centered between the logo and the buttons, never covered by either:
  - `--safe-top-m: calc(env(safe-area-inset-top) + 64px)`; `--safe-bottom-m: calc(env(safe-area-inset-bottom) + 154px)` (16 + 56 + 10 + 56 + 16).
  - `top: calc(var(--safe-top-m) + (100dvh - var(--safe-top-m) - var(--safe-bottom-m)) / 2); left: 50%; transform: translate(-50%, -50%);`
  - `height: min(640px, calc(100dvh - var(--safe-top-m) - var(--safe-bottom-m))); max-width: calc(100vw - 32px); aspect-ratio: 9/16;`
- **Close:** a **tap on the reel itself** closes it (fade + scale to 0.96, 180ms). A tap on empty space outside the reel also closes it.
- **Switch:** tapping a different avatar bubble while a reel is open swaps to that creator's reel.
- While a reel is open, the fly-through and drift pause; they resume on close.
- Video: `muted`, `autoplay`, `playsInline` (required for inline autoplay on iOS Safari). Show a small "Tap to close" hint (12px, glass chip) on the first preview only.

## 2.5 Button tap → Sign-in
Both buttons lead to the sign-in page. The button the user chose is passed along as **intent**, so the account type can be pre-selected during sign-up.
- `Ask for Yapps` → `/auth?intent=ask` (brand / business side, default assumption; confirm).
- `Get Yapps (UGC Campaign)` → `/auth?intent=get` (creator side, default assumption; confirm).
- **Transition (≈ 400ms total):**
  1. Tapped button turns green (2.3 touch feedback).
  2. Camera does a quick **zoom burst** forward (`targetZ -= 10`, damped, ~350ms) so the bubbles rush past.
  3. The sign-in page slides up over the still-moving, now blurred bubble field.

## 2.6 Sign-in page (mobile)
- **Full-screen glass page** over the bubble scene; the scene behind gets `backdrop-filter: blur(16px)` + `rgba(247,247,249,0.5)`. Page surface: glass recipe, stronger (`rgba(255,255,255,0.75)`), top corners `28px`.
- Content, top to bottom:
  1. Back chevron (returns to the welcome screen) and the yapp logo.
  2. Title **"Sign in to yapp"** (24px, 700) and a subtitle showing the chosen intent (e.g. "Continuing as: Get Yapps").
  3. **Saved accounts** (only if any exist, see 2.7).
  4. **Phone number** (primary method):
     - Country-code selector (default `+1` for US/Canada, auto-detected from device locale) + `<input type="tel" inputmode="tel" autocomplete="tel">`, formatted as the user types (`libphonenumber-js`), validated to E.164.
     - Neon **"Continue"** button (`--neon` / `--on-neon`, 52px, full width), disabled until the number is valid.
     - Next step: 6-digit OTP via SMS (`autocomplete="one-time-code"`, `inputmode="numeric"`), 60s resend timer, max 5 attempts. Provider: Twilio Verify / Firebase Phone Auth (rate limits and fraud protection required).
  5. Divider: "or continue with".
  6. **Social sign-in buttons** (full-width glass pills, 52px, radius 999px, gap 10px, brand icon + label):
     - **Continue with Apple** (black pill; `Sign in with Apple` / `expo-apple-authentication` on iOS, Apple JS on web/Android).
     - **Continue with TikTok** (TikTok Login Kit, OAuth 2.0, scope `user.info.basic`).
     - **Continue with Instagram** (Instagram API with Instagram Login, OAuth 2.0).
     - **Continue with Google** (Google Identity Services / `@react-native-google-signin`), shown as "Google" to cover Gmail.
  7. Legal line: Terms and Privacy links, 12px muted (`#636366`).
- **Platform constraints (must handle):**
  - **Instagram:** Meta's current Instagram login works **only for Professional (Business or Creator) accounts**; personal Instagram accounts cannot sign in. Show a clear error ("Instagram sign-in needs a Creator or Business account. Use another method.") and keep the other options visible. This fits creators, but brands and regular users should be steered to the other methods.
  - **Apple App Store:** because Google/TikTok/Instagram sign-in are offered, an equivalent privacy-focused option (Sign in with Apple) must also be offered; keep it first on iOS.
  - TikTok and Instagram require app review/approval by their platforms before production use.
- **Account linking:** if a sign-in returns an email or phone already attached to an existing account, link the new provider to that account instead of creating a duplicate.
- Sign-up and sign-in are one flow: an existing account signs in; a new one is created with the intent's account type pre-selected (editable later).

## 2.7 Saved accounts (remember accounts for later sign-in)
The app keeps a memory of the accounts used on this device, so after a logout the user can sign back in with one tap, like Instagram's "Continue as …".
- **What is saved per account:** `accountId`, display name, profile photo URL, sign-in method (phone / Apple / TikTok / Instagram / Google), a masked identifier (e.g. `+1 ••• ••• 4821`), and `lastUsedAt`. **Passwords and OTP codes are never stored.**
- **Where it is saved:**
  - **Native app:** account list in `expo-secure-store` (iOS Keychain / Android Keystore), plus a per-account **refresh token** so "Continue as …" signs in instantly without re-verification.
  - **Mobile web:** the account list (non-secret fields only) in `localStorage`; per-account refresh tokens in `httpOnly`, `Secure`, `SameSite=Lax` cookies scoped per account. If a token has expired, tapping the saved account re-runs that provider's sign-in pre-filled (`login_hint` / phone number), with OTP for phone.
- **Sign-in page behaviour:** when saved accounts exist, show them at the top as a list (avatar, name, method icon, masked identifier), most recent first, max **5**. Tap → sign in as that account. Each row has a **remove (×)** action that deletes it from the device and revokes its stored token. Below the list: "Use another account" reveals the full method list (2.6).
- **Logout behaviour:** logging out ends the session but **keeps** the account in the saved list (refresh token is rotated). A separate **"Log out and forget this account"** option removes it completely.
- **Privacy:** saved accounts never leave the device (no server-side "device account list"). Settings has a "Remove saved accounts from this device" control.

## 2.8 After sign-in
- On success, navigate with `replace` (not `push`) to `/feed` so the back button/gesture cannot return to the welcome screen or the sign-in page.
- Transition: the page and bubbles fade out (200ms), and the feed's first reel fades in already playing (muted autoplay, `playsInline`).
- The reels feed is specified in **Part 3** below.
- **Logging out** (mobile): Profile tab → account sheet with **"Log out"** (keeps the account saved) and **"Log out and forget this account"**. After logout the welcome bubbles appear again.

## 2.9 Acceptance criteria
1. A signed-out user opening the mobile site or app sees the bubbles flying slowly, the centered yapp logo, and two stacked full-width glass buttons at the bottom.
2. Soft fades at the top and bottom sit between the bubbles and the logo/buttons; the logo and buttons are fully readable and never faded.
3. One tap on a face bubble shows that creator's reel centered between the logo and the buttons; one tap on the reel hides it; tapping another face switches to that creator.
4. Tapping either button turns it green, bursts the bubbles forward, and opens the sign-in page within ~0.4s, carrying the chosen intent.
5. The sign-in page offers phone number (with OTP), Apple, TikTok, Instagram and Google; an Instagram personal account gets a clear message instead of a silent failure.
6. After a successful sign-in, the user lands on the Reels feed (Part 3) and the back gesture does not return to the welcome screen.
7. Reopening the app or site while signed in goes straight to Reels; the sign-in page is not shown again until the user logs out.
8. After logout (Profile tab → Log out), the welcome screen appears; the sign-in page lists the saved accounts and one tap signs back in.


---

# PART 3 — Reels feed (signed in)

> Shown right after sign-in (Part 2). Shared tokens: `--bg #F7F7F9`, `--neon #34F06C`, `--on-neon #0B0B0C`, glass recipe. Preview: the feed part of **`YAPPS_MOBILE.html`**.
> Reference device: **iPhone 18 Pro Max** — 6.9", 1320 × 2868 px @3x = **440 × 956 pt**; top safe area (status bar + Dynamic Island) ≈ **62pt**, bottom (home indicator) **34pt**. Layout uses `env(safe-area-inset-*)`, so it adapts to every phone.
> Scope: the signed-in Home feed on mobile (web + app), the swipe-left details screen, and the bottom tab bar. It replaces the current `/home` reels presentation; the **content model stays the same** (creator videos, custom orders, UGC campaigns).

## 3.1 What changes vs. the current feed
| Area | Current | New |
|---|---|---|
| Reel media | Card inside the page, below the top bar, above the tab bar | **Full-bleed**: the media starts at the very top of the screen and sits **behind every UI element** (logo, "+", tabs, name, text, buttons, tab bar) |
| Progress line above the creator name | Visible | **Removed** |
| Top bar | 64px white bar | **Removed.** Only the logo (left) and a glass **"+" Create** button (right) float over the reel |
| Account avatar + notifications | Top right | Moved to the **bottom tab bar** (avatar = Profile tab; bell next to it) |
| Feed tabs | Horizontal white/black pill control | **Vertical stack of plain text on the right**, very soft shadow, no pill |
| Tab names | For you · Orders · Videos | **Mix · Yapps · Orders** |
| Creator / business name | Bottom, above the description | **Top left**, starting on the same level as the first tab |
| Campaign button | "Accept" / "Pitch" | **"Make Yapp now"** + remaining counter |
| Order / campaign posts | Coloured card with text | **Full-screen light canvas** with text + **interactive characters** and one topic prop |
| Swipe-left details | Default cards on beige | **Light background + glass cards** |
| Bottom tab bar | Black pill: Home, Explore, Work, Messages, Profile | **Clear glass bar** + very short fade; **Home · Work · Discover · Alerts · Profile** (Messages removed, Explore renamed, new Work icon) |

## 3.2 Layer order (back → front)
1. **Media / post background**: full screen (`position: absolute; inset: 0`), z-index 0.
2. **Reel content**: name (top left), post text, characters, description, price, CTA. z-index 2.
3. **Short fades** (top and bottom), z-index 25. Pointer-events none.
4. **Floating controls**: logo + "+" (top) and the glass tab bar (bottom), z-index 30.
5. **Details screen** (swipe left), z-index 28, with its own sticky CTA at 29; the bars stay on top.

Rule from the owner: **buttons and bars → fade → background**. Nothing may cover the bars.

## 3.3 Video media sizing (1080 × 1920)
- Source videos are vertical **1080 × 1920 (9:16)**. Every overlay is designed on top of that frame.
- **The video fills the whole screen, edge to edge** (owner decision, after removing the blur):
  - Media box: `position: absolute; inset: 0;` video `width: 100%; height: 100%; object-fit: cover; object-position: center`.
  - On screens taller or wider than 9:16 the video is scaled up until it covers the screen; the overflow is cropped evenly (on most phones a thin strip at the left and right edges).
  - **No blur, no black bars.**
  - Recalculated automatically on resize / rotation (CSS only).
- **Safe area for creators**: because edges can be cropped, important content (faces, captions, product UI) should stay inside the centre **1080 × 1600** of the frame. Show this guide in the upload screen.
- A soft bottom gradient on the video (`22%` of the screen height, `rgba(0,0,0,0.45) → 0`) keeps the description readable.
- Video plays muted, `autoplay`, `playsInline`, `loop`; only the reel in view plays. The next video is preloaded.
- **No progress bar** on the reel (removed).

## 3.4 No top bar: logo + "+" Create
The top bar is removed so the video is fully visible. Two elements float directly over the reel:
- Row: `position: absolute; top: calc(env(safe-area-inset-top) + 4px); left: 16px; right: 14px; height: 40px; z-index: 30; display: flex; justify-content: space-between`.
- **Logo (left)**: bubble icon 26 × 23 + wordmark 22px / 800. On videos it is **white** with a soft shadow (`text-shadow: 0 1px 2px rgba(0,0,0,0.18)`; `drop-shadow` on the icon) so it stays clear on any footage; on light posts it switches to ink `#1D1D1F`. The icon's three dots stay neon.
- **"+" Create (right)**: 40px circle, clear glass (`rgba(255,255,255,0.30)`, `blur(20px) saturate(180%)`, 1px `rgba(255,255,255,0.45)` border, gloss highlight), ink "+" icon 18px / 2.6 stroke.
  - Opens a glass **Create** bottom sheet with role-aware options:
    - **New order**: ask creators for Yapps (business side).
    - **Make a Yapp**: film or upload a video for an order/campaign the creator took (creator side).
  - Accounts with only one role skip the sheet and go straight to that action.

### 3.4.1 Usability study (why this layout)
- **Content first**: removing the bar gives the reel the whole screen, like TikTok and Instagram Reels, which also show only light floating controls.
- **"+" top right**: the place users expect a "create / new" action in modern apps (Instagram, Threads, WhatsApp). It is a secondary action while browsing, so a less reachable corner is acceptable; the primary action of each reel (Order / Pitch / Make Yapp now) stays at the bottom, in thumb reach.
- **Account avatar → Profile tab**: the bottom-right tab shows the user's own avatar (Instagram pattern). It is the most recognisable way to reach "me", and it frees the top corner for "+".
- **Notifications → tab bar, next to the avatar**: notifications are checked often; in the tab bar they are always reachable with the thumb and visible on every screen, not only on Home.
- **Messages removed (for now)**: there is no messaging yet, so the tab is dropped rather than shown empty. Notifications is kept because it carries the events that matter today (new pitch, Yapp delivered, payment held / released). When messaging launches, it returns as one **Inbox** tab that holds both messages and notifications (TikTok pattern), keeping the bar at five items.
- **Five tabs** is the comfortable maximum for a bottom bar: icons only, the active tab shows its name, 44pt minimum targets.
- **Accessibility**: "+" has the label "Create: new order or make a Yapp"; the bell announces unread state; the avatar tab is labelled "Profile and account".

## 3.5 Feed tabs (vertical, right) + name (left)
- Both start on the same level: `top: env(safe-area-inset-top) + 4 + 40 + 10px` (just below the logo row).
- **Tabs (right)**: stacked **vertically**, one word above the other, right-aligned (`right: 16px`), small gaps (`gap: 2px`, 20px line height). This leaves the full width of the row for long account names.
  - Order, top → bottom: **Mix**, **Yapps**, **Orders**.
  - **Mix** replaces "For you": one short, modern word for "everything mixed together" (videos + orders + campaigns). Alternatives if preferred: "All", "Feed".
  - **Yapps** = creators' videos (renamed from "Videos"). **Orders** = custom orders + UGC campaigns. Mix keeps the current "For you" ordering logic.
  - Plain text, no background. 15px; inactive weight 500 at 72% opacity; active weight 700 at 100% with a 5px dot on its left.
  - Colour **white** with a very soft shadow: `text-shadow: 0 1px 2px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.12)`. Same style as the white text at the bottom.
- **Name (left)**, per reel:
  - Video: creator avatar (28px circle, 1.5px white ring) + name (14px / 700, verified icon) + handle (11.5px, 85%).
  - Order / campaign: business logo (28px rounded square) + business name + type ("Custom order" / "UGC campaign · TikTok").
  - Max width `100% − 130px` (the tabs' column); long names truncate with an ellipsis. Tapping it opens the profile.
- **Adaptive colour:** on light posts (3.7) the logo, tabs and name switch to ink `#1D1D1F` with a faint white shadow, because white text is unreadable on a light canvas. The switch follows the reel in view (`data-tone` = `dark` | `light`).

## 3.6 Bottom content
- Block anchored above the tab bar: `left/right 16px; bottom: safe-area + 10 + 56 + 14px`.
- **Video**: one description line (14px / 600, white, soft shadow), e.g. `Honest review · Saudi · From $900`, then the CTA **Order** (neon pill 52px, dark text, 40px black arrow circle on the right).
- **Custom order**: budget (`$80–150` 34px / 800 + "budget" 13px), meta lines (format · dialect, due date · pitches), CTA **Pitch**.
- **UGC campaign**: price per Yapp (`$30 per Yapp`), meta (platform · follower tier · "post to your own account"), **slot bar** (one segment per Yapp: taken = ink, remaining = 14% ink), then the CTA in 3.8.
- The burned-in subtitles of a video belong to the video itself; the UI never overlaps the middle third of the frame.

## 3.7 Order & campaign posts: full-screen light canvas
Posts that are text (the order / campaign brief) fill the screen like a video, so the feed rhythm stays "video, post, video…". **The source of the text is the business's order setup** (title, one-line pitch, budget, format, dialect, due date, slots), exactly as today.
- **Background**: soft two-colour pastel gradient (per post palette) + two large blurred colour glows + very light film grain (SVG noise at ~18% alpha, `mix-blend-mode: multiply`). Light, calm, never saturated.
- **Text block** (top, below the name and the tabs' column): a small glass chip with the type ("Custom order" / "UGC campaign"), the **title** (31px / 800, tight tracking, ink), and the **subtitle** (15px, `#48484D`).
- **Characters (interactive)**, between the text and the budget:
  - A row of **5 translucent overlapping shapes with simple faces**: pill, arch, ghost, arch, circle. Heights 58–136px.
  - Inspired by the owner's two reference images (overlapping flat shapes, multiply overlaps, soft colours, minimal faces), **reinterpreted, not copied**: our own shapes, our palette, gradient fills at 86% opacity, `mix-blend-mode: multiply` where they overlap.
  - Each post has its own palette (5 colours drawn from Yapp's illustration tints).
  - **Topic prop**: one small object above the middle character that matches the post's subject, e.g. a dotted route with a pin (delivery), a receipt with a green tick (invoices), stacked boxes (stock), a microphone with sound marks (voiceover). Defined per product category; a generic chat bubble is the fallback.
  - **Motion**: each character floats slowly (6px, 5s, staggered). **Tap a character**: it squishes (scale 1.12 × 0.86, springy 260ms) and its face changes to the next expression. Purely playful; it never navigates.
  - `prefers-reduced-motion`: no floating, tap still changes the face.
- **Bottom**: budget, meta, (campaign: slot bar), CTA.

## 3.8 "Make Yapp now" + remaining counter (UGC campaigns only)
- Applies **only to UGC campaigns** (one campaign = many Yapps, e.g. 10). **Custom orders keep "Pitch"** (one video, the business chooses one creator).
- The CTA reads **"Make Yapp now"** on the left and, inside the same button on the right (before the arrow), a counter chip: **"{open} of {total} remaining"**.
  - `open` = Yapps (slots) still available to make; `total` = Yapps the business ordered in this campaign.
  - Example: a business ordered 10 Yapps and 9 creators already took one → **"1 of 10 remaining"**: one Yapp is still waiting to be made.
  - The chip is a 12.5px / 700 pill on `rgba(11,11,12,0.12)`. When only **one** remains, it inverts (black chip, neon text) to signal "last one".
  - The slot bar above the button shows the same numbers visually.
- States:
  - Open slots > 0 and the creator is eligible → **Make Yapp now · N of T remaining** (neon).
  - The creator already holds a Yapp in this campaign → button becomes **"Your Yapp · due {date}"** (non-neon) and opens it.
  - Not eligible (follower tier / platform) → neutral button **"See details"** + one line saying why.
  - 0 remaining → **"Campaign full"** (disabled, non-neon); the post leaves the feed on the next refresh.
  - The business's own campaign → **"Manage"**.
- Tapping **Make Yapp now** opens the campaign details (3.9) with the same CTA at the bottom; accepting reserves the slot.
- Accessible label: "Make Yapp now, 1 of 10 remaining".

## 3.9 Swipe left → details (light glass)
- Gesture unchanged: swipe left (RTL: right) past **60px** opens the details; the reel follows the finger and a light "Details →" layer is revealed underneath. Vertical swipes still scroll the feed.
- **New look**: background `#F7F7F9`; content in **white glass cards** (`rgba(255,255,255,0.82)`, radius 24px, soft shadow, inner top highlight, 1px hairline). The logo, "+" and the tab bar stay on top.
- Slides in from the right (340ms, `cubic-bezier(.2,.8,.2,1)`); "← Back to feed" returns.
- **Order / campaign details**: title + budget + meta → business row (verified, hires, rating, posted) → Pitches / Yapps card → **The brief** (format, deliverables, platforms, on camera, who it's for, goal, key message, must include ✓, please avoid –). Sticky CTA above the tab bar: **Write your pitch** (order) or **Make Yapp now · N of T remaining** (campaign).
- **Video details**: creator card (avatar, name, handle, rating, from-price, delivery) + portfolio grid; sticky CTA **Commission {first name}**.

## 3.10 Bottom tab bar (clear glass) + short fade
- `position: absolute; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 10px); height: 56px; border-radius: 22px; z-index: 30`, clear glass (`rgba(255,255,255,0.30)`, `blur(20px) saturate(180%)`, 1px `rgba(255,255,255,0.45)` border, top gloss).
- **Five items**, left → right:
  1. **Home**: house icon.
  2. **Work** (moved next to Home): new modern icon, a rounded **task board** (rounded square with three vertical bars of different heights, like columns of cards) instead of the briefcase. It reads as "my jobs in progress".
  3. **Discover** (renamed from "Explore", a more current word for the same idea): **compass** icon.
  4. **Alerts** (notifications): bell + red dot when there is something new.
  5. **Profile**: the user's **own avatar** (30px, white ring, neon account-type badge). Tapping it also opens the account sheet (Log out / Log out and forget this account, see 2.8).
  - **Messages is removed** for now (see 3.4.1).
- Icons `#1D1D1F`, 20px, 2px stroke, rounded caps.
- **Active item = icon + name**: tapping any item makes it active; it becomes a glossy black pill (`#2A2A2C → #0B0B0C`, 16% top highlight) showing the icon **and its name** in white (e.g. "⌂ Home", "▥ Work", "◎ Discover", "🔔 Alerts", avatar + "Profile"). Inactive items show the icon only. The name fades/slides in (220ms); the pill width animates (200ms).
- Accessible names: "Home", "Work", "Discover", "Notifications, new", "Profile and account"; the active item has `aria-current="page"`.
- **Fade behind the bars (very short)**:
  - Bottom: height `safe-area + 84px` (bar 56 + gap 10 + ~18px beyond the bar). On video: `rgba(0,0,0,0.28) → 0`; on light posts: `rgba(247,247,249,0.75) → 0`.
  - Top: height `safe-area + 62px`, same idea (`rgba(0,0,0,0.22)` / `rgba(247,247,249,0.7)`), behind the logo and "+".
  - The fade colour follows the reel in view (same `data-tone` as 3.5).

## 3.11 Behaviour kept from the current feed
- Vertical scroll-snap, one reel per screen (`scroll-snap-stop: always`).
- Feed ordering (`feed-items.ts`), "Not interested", the reel menu, and `?reel=` deep links are unchanged.
- A one-time hint "Swipe left for details" (2–3s) on first use.

## 3.12 Accessibility
- Tabs: `role="tablist"` / `role="tab"` with `aria-selected`.
- White text always carries the soft shadow; the light/dark switch keeps contrast on every post.
- All buttons ≥ 44px tall; characters are decorative for screen readers (`aria-hidden`) except as tap targets.
- `prefers-reduced-motion`: no floating, no hue drift, instant transitions.

## 3.13 Acceptance criteria
1. Every reel's media starts at the top edge of the screen and sits behind the logo, "+", tabs, name, text, CTA and tab bar.
2. Videos (1080 × 1920) fill the whole screen edge to edge (cover); no blur and no black bars.
3. There is no progress bar above the name.
4. There is no top bar: only the logo (left, readable on any reel) and a glass "+" button (right) that opens Create (New order / Make a Yapp).
5. Tabs read **Mix · Yapps · Orders**, stacked vertically on the right as plain text with a very soft shadow; the creator/business name sits at the top left, starting on the same level.
5b. The bottom tab bar has five items: **Home, Work (task-board icon), Discover (compass), Alerts, Profile (own avatar)**; no Messages. The active item shows its icon and name in a black pill; tapping another item moves the pill and its name there.
6. Order and campaign posts fill the screen on a light canvas with a title, subtitle, five interactive characters and one topic prop; tapping a character squishes it and changes its face.
7. UGC campaign posts show **Make Yapp now** with **"N of T remaining"** inside the button and a matching slot bar; custom orders show **Pitch**.
8. Swiping left opens a light details screen with white glass cards and a sticky CTA.
9. The bottom tab bar is clear glass with a very short fade behind it; the fade and the text colour adapt to dark (video) and light (post) reels.
