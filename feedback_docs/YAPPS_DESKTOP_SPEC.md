# YAPPS — Desktop: Landing page + Sign-in (side panel)

> One file for the desktop website. **Section 1** = landing page (glass nav, 3D creator bubbles, hover reels, two CTAs). **Section 2** = the sign-in experience as a right-side glass panel.
> Preview file: **`YAPPS_DESKTOP_LANDING.html`** (open on a computer; wheel to fly in, hover a face, click a CTA or the avatar to sign in).
> The mobile experience is in `YAPPS_MOBILE_SPEC.md`.

---

# SECTION 1 — Landing page

## 1.0 Design tokens (apply across the landing page)
```css
:root{
  --bg:          #F7F7F9;  /* base: #F5F5F7, slightly lighter as requested; #F5F5F7 is the accepted fallback */
  --ink:         #1D1D1F;  /* primary text */
  --muted:       #6E6E73;  /* secondary text */
  --brand-green: #34F06C;  /* Yapp green */
  --on-green:    #0B0B0C;  /* text/icons ON green; white on #34F06C fails WCAG contrast (~1.5:1) */
  --glass-bg:    rgba(255,255,255,0.55);
  --glass-border:rgba(255,255,255,0.70);
  --glass-blur:  blur(20px) saturate(180%);
  --glass-shadow:0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.85);
  --radius-pill: 999px;
  --safe-top:    92px;   /* nav top offset 16 + nav height 60 + gap 16 */
  --safe-bottom: 104px;  /* CTA bottom offset 24 + CTA height 64 + gap 16 */
}
```
**Visual direction:** glass, glossy, elegant, minimal. Every surface on the landing page (nav, buttons, chips, overlays) uses the same glass recipe, so the UI reads as one material floating over the bubble field.

## 1.1 Scope
- **Desktop (viewport ≥ 1024px):** this is the persistent, interactive landing/home page, for signed-out and signed-in users.
- **Mobile (< 1024px)** is specified in the separate file `YAPPS_MOBILE_SPEC.md` (welcome bubbles → sign-in → reels feed).

## 1.2 Tech stack
- React + TypeScript (Next.js App Router).
- `three` + `@react-three/fiber` + `@react-three/drei` for the 3D scene.
- `framer-motion` for DOM overlays (reel preview, buttons, nav micro-interactions).
- `hls.js` for video playback (native HLS on Safari).
- `simplex-noise` for organic drift paths.

## 1.3 Scene
- Full-viewport `<Canvas>` (`position: fixed; inset: 0; z-index: 0`).
- Background `var(--bg)` (`scene.background`), plus `THREE.Fog(var(--bg), near=8, far=40)` so distant bubbles fade into the background (atmospheric depth). **The fog color must equal the background hex exactly**, or a visible band appears.
- `PerspectiveCamera`, `fov = 50`, initial `position.z = 0`, looking down -Z.
- Lighting: `Environment preset="studio"` (soft reflections for glass) + one low-intensity `directionalLight`.
- `dpr={[1, 2]}`; render only while the tab is visible (pause on `document.visibilitychange`).

## 1.4 Bubbles (creator avatars)
- Count: 60–80 bubble instances on screen (configurable `BUBBLE_COUNT`). This is independent of how many creators exist (see 1.6.1).
- Distribution: random positions inside a cylinder volume along -Z: `x ∈ [-12, 12]`, `y ∈ [-7, 7]`, `z ∈ [-40, -3]`, biased toward the center. Avoid overlaps with a min-distance check (Poisson-like rejection sampling).
- Radius: random `0.35–1.1` units (size variance creates the depth hierarchy seen in the reference).
- Each bubble = `<group>` containing:
  1. **Avatar disc:** circular plane (`CircleGeometry`) textured with the creator's face (`useTexture`, lazy-loaded, 256×256 WebP), always billboarded to the camera (`<Billboard>`).
  2. **Glass shell:** `SphereGeometry(r, 48, 48)` with `MeshPhysicalMaterial` / drei `MeshTransmissionMaterial`: `transmission: 1`, `roughness: 0.05`, `thickness: 0.4`, `ior: 1.3`, `chromaticAberration: 0.03`, `clearcoat: 1`. This produces the iridescent glass-bubble look from the reference.
- A subset (~20%) are decorative bubbles with no avatar (clear soap-glass or glossy tinted spheres) for visual rhythm.
- Data: `Bubble { id, creatorId, avatarUrl, basePosition: Vector3, radius, noiseSeed }`.

### 1.4.1 Avatar image source
- **The face in each bubble is the creator's own Yapp account profile photo**, read from the same user record as the rest of the site (`User.profilePhotoUrl`). No separate image is uploaded for the bubbles.
- **Live sync:** when a creator changes their profile photo, the bubble uses the new photo. Bust the cache with a version key in the URL (e.g. `?v=<photoUpdatedAt>`).
- **Bubble-size derivative:** on profile-photo upload or change, the backend generates a dedicated **256×256 WebP, center-cropped to the face, circular-safe** thumbnail (e.g. via an image CDN or a `sharp` worker). `avatarUrl` points to this derivative, never to the full-size original.
- **No profile photo:** by default the creator is **excluded from the bubble field** to keep the visual quality high. Alternative (configurable flag `BUBBLE_ALLOW_INITIALS`): show a glass bubble with the creator's initials on a brand-tinted gradient. Decide before production.
- **Eligibility:** only creator accounts that are active, public, and have at least one published video appear in the field.

## 1.5 Idle motion (ambient drift)
- Each bubble follows a slow, continuous 3D path:
  `offset = vec3(noise(seed + t*0.05), noise(seed+100 + t*0.05), noise(seed+200 + t*0.03)) * amplitude`
  with `amplitude = 0.4–0.8` units. Applied in `useFrame` relative to `basePosition`.
- Add a subtle self-rotation on the glass shell (`rotation.y += 0.002`) so reflections shimmer.
- Motion must feel calm: max linear speed ≈ 0.15 units/s. No bouncing, no collisions.

## 1.6 Scroll = camera dolly (zoom into depth)
- Listen to `wheel` on the canvas container with `{ passive: false }` and call `preventDefault()` (the page itself does not scroll on this view). Ignore wheel events whose target is inside the nav or the CTA bar.
- Normalize input across mouse and trackpad: a mouse notch (`|deltaY| ≥ 50` or `deltaMode = 1`) triggers one step; trackpad micro-deltas accumulate and trigger one step per 100px.
- **Discrete, short steps:** each step sets `targetZ -= STEP` where `STEP = 4` units (scroll up reverses).
- Animate `camera.position.z → targetZ` with critically damped interpolation (`THREE.MathUtils.damp(current, target, λ=8, dt)`). Each step settles in **≈ 350–450ms**: fast, never sluggish.
- Perspective does the rest: as the camera advances, far bubbles grow and approach, and off-axis bubbles expand and slide outward left/right/up/down past the frame edges.
- Add a slight FOV kick during motion (`fov 50 → 54`, eased back) to strengthen the zoom-in sensation.
- **Scrolling while a reel is open:** close the reel first, then perform the step. Suppress hover-preview opening for 500ms after each step so reels don't pop up while bubbles fly past the cursor.
- Bubbles within 1–3 units of the camera fade opacity toward 0 to avoid clipping through the lens.
- Keyboard: `ArrowDown`/`PageDown` step forward, `ArrowUp`/`PageUp` step back.

### 1.6.1 Infinite loop and creator recycling
The field is endless in both directions, and the people in it repeat in a loop once the creator list runs out. **Behavior is already correct in the prototype; keep it, and implement the pooling below in production.**
- **Bubble pool (fixed size):** the scene keeps exactly `BUBBLE_COUNT` bubble objects for its whole lifetime. Nothing is created or destroyed during scrolling; objects are reused (object pooling), so memory stays flat no matter how far the user scrolls.
- **Forward recycle:** when a bubble's `z > camera.z - 1` (it has reached the lens), fade it out and move it to the far end: `z = camera.z - 40 - random(0, 4)`, with a new random x/y and its opacity reset to 0, then fade in (`~150ms`, while it is still hidden in fog).
- **Reverse recycle:** when scrolling backward and a bubble's `z < camera.z - 46`, move it to just in front of the camera (`z = camera.z - random(3, 6)`) with opacity 0 and fade it in.
- **Creator assignment (round-robin queue):**
  - Keep `creatorQueue`, a shuffled list of all creator IDs, and a cursor.
  - Every time an avatar bubble is recycled, it takes the **next** creator from the queue (`cursor = (cursor + 1) % creators.length`). When the cursor wraps around, reshuffle the queue so the loop does not feel mechanically repetitive.
  - If the creator list is **larger** than the number of visible avatar bubbles, the same face never appears twice on screen at once.
  - If it is **smaller** (e.g. early launch with 20 creators), faces repeat by design. Then enforce a minimum spacing: the same creator must not be assigned to two bubbles closer than 15 units apart in z (skip to the next queue entry if so).
  - Decorative bubbles recycle the same way but take no creator.
- **Data loading for large catalogs:** fetch creators in pages (e.g. 50 at a time) from the API. Append each new page to the queue before the cursor reaches the end, so scrolling deeper reveals new people before it starts repeating. Repetition only begins after the whole catalog has been shown.
- **Textures follow the pool:** a recycled bubble swaps its avatar texture from a shared LRU texture cache (max ~120 textures); textures for creators no longer on screen are evicted and disposed.

## 1.7 Hover interaction (creator preview, no click required)
- Raycasting via R3F pointer events on the bubble group (hit target = circular hit test on the sphere's screen projection).
- **Hover-to-preview:** resting the cursor on an avatar bubble opens the **Reel Preview** (1.8) for that creator. **No click or press is needed.**
  - **Intent delay:** open only after the cursor has stayed on the same bubble for **120ms**, so moving the mouse across the field does not flash reels.
  - **Leave:** when the cursor leaves the bubble (`pointerleave`, moving onto empty space, the nav, or the CTA bar), close the reel after a **120ms** grace period (fade + scale to 0.96, 180ms). Pause and detach the video, and resume drift.
  - **Switch:** moving directly onto another face bubble swaps the reel content to that creator without a close/open flicker.
  - Window `blur` closes the reel immediately.
- While a reel is open, ambient drift pauses so the hovered bubble stays under the cursor.
- Hover visuals on any avatar bubble: `scale → 1.08` (spring, 150ms), `cursor: pointer`, soft glow ring. Decorative bubbles are not interactive.
- Click on a bubble: reserved for a later part (e.g. open the creator's profile).
- Only one preview exists at a time (`activeCreatorId` state).

## 1.8 Reel Preview overlay
- DOM overlay (`position: fixed; z-index: 20; pointer-events: none`), horizontally centered.
- **Placement: centered in the free area between the nav and the CTA bar, never covered or cropped by either.**
  - `top: calc(var(--safe-top) + (100vh - var(--safe-top) - var(--safe-bottom)) / 2); left: 50%; transform: translate(-50%, -50%);`
  - `height: min(640px, calc(100vh - var(--safe-top) - var(--safe-bottom)));` so on short screens the reel shrinks instead of sliding under the nav or the buttons.
- Aspect ratio **9:16** (`aspect-ratio: 9 / 16`), `border-radius: 24px`, `overflow: hidden`, `box-shadow: 0 30px 80px rgba(0,0,0,0.18)`.
- Open/close animation unchanged: fade + scale `0.96 → 1`, 180ms.
- Content: the creator's **highlight reel = two of the creator's videos** (their best two portfolio clips), each up to ~6s, played one after the other and looped.
  - `muted`, `autoplay`, `playsInline`, HLS via `hls.js`, with a `poster` (first frame) shown instantly.
  - Segmented progress bar at the top (two segments, one per video, Stories-style).
  - Bottom gradient with the creator's avatar, name, handle, and a glass niche tag.
- Prefetch: as soon as the cursor enters a bubble (before the 120ms intent delay ends), preload the first clip's manifest and poster so playback starts in under 200ms.
- Backdrop: dim the canvas slightly (`rgba(247,247,249,0.4)` + `backdrop-filter: blur(4px)`). The nav and CTA bar stay above the backdrop.

## 1.9 Primary CTA buttons
- Fixed at the bottom of the viewport above the canvas (`z-index: 10`), spanning full width with `24px` outer margin, laid out as **two equal columns** (`display: grid; grid-template-columns: 1fr 1fr; gap: 16px`).
- Labels:
  - Left: **"Ask for Yapps"**
  - Right: **"Get Yapps (UGC Campaign)"**
- Style (glass recipe from 1.0):
  - `height: 64px; border-radius: 20px;`
  - `background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow);`
  - Text: `var(--ink)`, 17px, weight 600, centered.
- Hover: `background → var(--brand-green)`, text → `var(--on-green)`, border → transparent, glow `box-shadow: 0 12px 36px rgba(52,240,108,0.35)`, `translateY(-1px)`, `transition: 220ms cubic-bezier(.2,.8,.2,1)`.
- Active (pressed): `scale(0.98)`.
- `:focus-visible`: 2px ring in `var(--brand-green)`, 3px offset.
- The buttons stay fully clickable and are not affected by canvas pointer events.

## 1.10 Accessibility & fallbacks
- `prefers-reduced-motion: reduce` → no drift and no FOV kick; zoom steps jump with a 120ms fade instead of a dolly.
- No WebGL support → render a static 2D bubble collage (CSS) with the same nav and buttons.
- Keyboard: zoom keys per 1.6. Provide a visually hidden list of creators (focusable buttons); focusing one opens its preview, blur closes it.
- Canvas gets `aria-hidden="true"`; buttons and links are real `<button>`/`<a>` elements with accessible names.
- Never put white text on `--brand-green`; always use `--on-green`.

## 1.11 Performance budget
- Sustained 60fps on a 2020 MacBook Air (M1) / mid-range Windows laptop.
- Avatar textures 256px WebP, lazy-loaded by distance (only bubbles with `z > camera.z - 25`), with the LRU cache from 1.6.1.
- Fall back to a cheaper `MeshPhysicalMaterial` (no transmission) if the GPU tier is low (`detect-gpu`).
- Dispose of the HLS instance and video element on preview close.
- Limit `backdrop-filter` surfaces to the nav, CTA bar, and the active overlay (each blur layer costs GPU).

## 1.12 Acceptance criteria
1. On load, the bubbles drift slowly on organic paths over a `--bg` background, with distant ones fading into the fog.
2. One wheel notch produces a short (~0.4s) zoom-in where near and side bubbles enlarge and exit the frame outward; it never feels slow.
3. Scrolling continues forever in both directions; once all creators have appeared, faces repeat in a shuffled loop without ever running out.
4. Resting the cursor on a face bubble (no click) shows a 9:16 reel of that creator's highlights; moving away hides it.
5. Moving onto another face bubble shows that creator's reel.
6. The reel sits centered between the nav and the CTA bar and is never covered or cropped by either, at any window height.
7. Two full-width glass buttons sit at the bottom; on hover each turns `#34F06C` with dark text.
8. The top nav keeps the existing layout and item positions, restyled as a slim floating glass bar with ~2cm side margins.
9. Sign-in works as described in section 2 (side panel).

## 1.13 Top navigation bar (existing layout, restyled as glass)
**Keep every item in its current position and order.** Only the visual treatment changes to match the glass direction.

### Structure (left → right)
| Zone | Item | Notes |
|---|---|---|
| Left | **Logo**: chat-bubble icon (black, three dots, 28×25px) + wordmark **"yapp"** | Links to `/`. Wordmark 22px, weight 700, `var(--ink)`. The icon's dots use `--brand-green`. |
| Left (after logo, 40px gap) | **Home · Explore · Work · Messages · Profile** | Text links, 16px, weight 500, `var(--muted)`; link padding 6px 12px, gap 4px. |
| | **Messages** unread badge | 20px black circle, white 12px weight 700 count, inline right of the label (kept as is). |
| Right (gap 10px) | **"+ New order"** primary button | Pill, height 42px, padding 0 18px, plus icon + label 15px weight 600. |
| Right | **Notifications** button | 42px circle, 19px bell icon, red unread dot (`#E5383B`, 10px, white 2px ring) top-right. |
| Right | **Avatar** | 42px circle, with an 18px account-type badge (e.g. "D") at bottom-right. |

### Container (slim glass bar)
- `position: fixed; top: 16px; left: 72px; right: 72px; z-index: 30; height: 60px;`
  - **Side margins 72px (≈ 2cm at 96 DPI)** so the bar floats clearly inside the viewport edges.
  - **Height 60px** (reduced from 76px) for a slimmer profile.
- `display: flex; align-items: center; justify-content: space-between; padding: 0 9px 0 20px;` (the right padding centers the 42px circles vertically with equal inset.)
- `border-radius: 22px;`
- Glass recipe from 1.0, slightly stronger: `background: rgba(255,255,255,0.6); backdrop-filter: blur(24px) saturate(180%);`
- Gloss: a 1px inner top highlight (`inset 0 1px 0 rgba(255,255,255,0.9)`) plus a faint top-to-bottom sheen (`linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 60%)` as an overlay pseudo-element).
- The bubbles drift **behind** the bar and are visible through the blur, which is the intended glass effect.
- If the nav height or offsets change, update `--safe-top` in 1.0 so the reel placement (1.8) stays correct.

### States
- **Nav links:** hover → `var(--ink)` with a glass pill behind the label (`rgba(255,255,255,0.7)`, radius 999px, 160ms fade). Active page (Home on the landing) → `var(--ink)`, weight 600, plus a 6px `--brand-green` dot centered under the label.
- **"+ New order":** default is a glossy black pill (`background: linear-gradient(180deg,#2A2A2C,#0B0B0C); color:#fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 18px rgba(0,0,0,0.18)`). Hover → `background: var(--brand-green); color: var(--on-green)`, green glow, `translateY(-1px)`. Active → `scale(0.98)`.
- **Notification circle and avatar ring:** glass circles (glass recipe, 1px glass border). Hover → `scale(1.04)` and a slightly brighter glass fill.
- **Avatar account-type badge:** 18px circle, `background: var(--brand-green)`, `color: var(--on-green)`, 11px weight 700, 2px white ring.
- All interactive elements: `:focus-visible` ring 2px `--brand-green`, 3px offset.

### Interaction with the scene
- Wheel events over the nav do **not** trigger the camera dolly.
- Moving the cursor onto the nav closes any open reel (per 1.7 leave rule).
- The nav stays above the reel backdrop (`z-index: 30 > 20`).
- Below 1024px: `left/right: 12px; top: 12px; height: 56px`; collapse the five text links into the existing mobile navigation pattern (out of scope for this part).


---

# SECTION 2 — Sign-in on desktop (right-side glass panel)

> House rule: on desktop, **every temporary task** (sign in, add a payment card, confirm, filters…) opens as this same side panel. It is used only when needed and closes back to the page.

## 2.1 Triggers (signed-out only)
- Either CTA ("Ask for Yapps" / "Get Yapps (UGC Campaign)"): the button turns green (its hover state), the camera does a quick **zoom burst** forward (`targetZ -= 10`, ~350ms), then the panel opens after ~380ms carrying the **intent** (the button's label).
- **Avatar circle in the nav** → opens the panel without an intent line.
- "+ New order", Notifications, Messages and Profile also open the panel while signed out (they need an account).

## 2.2 Signed-out nav state
- The avatar circle shows a **generic person icon** on the glass circle (no photo, no account-type badge).
- The Messages unread badge and the notification red dot are hidden.

## 2.3 Panel layout
- `position: fixed; top: 16px; right: 16px; bottom: 16px; width: 440px; z-index: 40; border-radius: 28px; overflow-y: auto;`
- Glass (stronger): `background: rgba(255,255,255,0.75); backdrop-filter: blur(24px) saturate(180%); border: 1px solid rgba(255,255,255,0.7); box-shadow: 0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.9);` padding `20px 28px 28px`.
- Top row: yapp wordmark and a **close (×)** button at the top right.
- **Open animation:** slides in from the right, `translateX(calc(100% + 32px)) → 0`, 340ms `cubic-bezier(.2,.8,.2,1)`.
- **Backdrop:** light dim + blur on the rest of the page (`rgba(247,247,249,0.25)` + `blur(3px)`); the bubbles keep drifting behind it.
- **While open:** hover reels and wheel zoom are disabled; the wheel scrolls the panel content.
- **Close:** ×, `Esc`, or a click on the dimmed area outside the panel.

## 2.4 Panel content (top → bottom)
1. Title **"Sign in to yapp"** (26px / 700) and, when opened from a CTA, the intent line ("Continuing as: Get Yapps (UGC Campaign)").
2. **Saved accounts** (only if any exist, see 2.5).
3. **Phone number** (primary method):
   - Country-code selector (default `+1` for US/Canada, from the browser locale) + `<input type="tel" inputmode="tel" autocomplete="tel">`, formatted while typing (`libphonenumber-js`), validated to E.164.
   - Neon **Continue** button (52px, full width, dark text), disabled until the number is valid.
   - Next step: **6-digit SMS code** (`autocomplete="one-time-code"`, `inputmode="numeric"`), 60s resend timer, max 5 attempts; "Change number" link. Provider: Twilio Verify or Firebase Phone Auth (rate limits + fraud protection).
4. Divider "or continue with".
5. **Social sign-in** (full-width pills, 52px, radius 999px, gap 10px, brand icon + label):
   - **Continue with Apple** (black pill; Sign in with Apple JS).
   - **Continue with TikTok** (TikTok Login Kit, OAuth 2.0, `user.info.basic`).
   - **Continue with Instagram** (Instagram API with Instagram Login, OAuth 2.0).
   - **Continue with Google** (Google Identity Services; covers Gmail).
6. Small notes: "Instagram sign-in works with Creator or Business accounts only." and the Terms / Privacy line (12px, muted).

**Platform constraints:**
- **Instagram** login works only for **Professional (Creator or Business) accounts**; a personal account gets a clear message ("Instagram sign-in needs a Creator or Business account. Use another method.") and the other options stay visible.
- **Apple:** offering Google/TikTok/Instagram means Sign in with Apple must also be offered (keep it first).
- TikTok and Instagram need platform app review before production.
- **Account linking:** if a sign-in returns an email or phone that already belongs to an account, link the provider to that account instead of creating a duplicate.
- Sign-up and sign-in are one flow; a new account gets the account type from the intent (Ask = business, Get = creator; editable later).

## 2.5 Saved accounts (device memory)
- The browser remembers accounts used to sign in, so after a logout the user can sign back in with one click ("Continue as …").
- Saved per account: `accountId`, display name, profile photo URL, method (phone / Apple / TikTok / Instagram / Google), a masked identifier (`+1 ••• ••• 4821`), `lastUsedAt`. **Never passwords or codes.**
- Storage: the list (non-secret fields) in `localStorage`; per-account refresh tokens in `httpOnly`, `Secure`, `SameSite=Lax` cookies. Expired token → that provider's sign-in runs again, pre-filled (`login_hint` / phone).
- In the panel: a list at the top (avatar, name, method, masked id), newest first, max **5**; click = sign in; **×** removes it from this device and revokes its token.
- Saved accounts never leave the device. Settings offers "Remove saved accounts from this device".

## 2.6 After sign-in (desktop)
- The panel closes and the user **stays on the bubble landing** (it is the desktop home). The nav switches to the signed-in state: profile photo in the avatar circle, account-type badge, unread badge and red dot.
- The CTAs then go to their real flows: **Ask for Yapps → New order**, **Get Yapps (UGC Campaign) → open campaigns**.
- **Avatar click when signed in** opens a small glass menu (`min-width: 260px; radius 18px`) with **"Log out"** (keeps the saved account) and **"Log out and forget this account"** (removes it).

## 2.7 Acceptance criteria (sign-in)
1. Signed out, clicking a CTA or the nav avatar slides in the right-side glass panel; ×, Esc or clicking outside closes it.
2. The panel offers phone + SMS code, Apple, TikTok, Instagram and Google; an Instagram personal account gets a clear message.
3. Saved accounts appear at the top after a logout; one click signs back in; × removes one.
4. After signing in the user stays on the landing, the nav shows their avatar, and the avatar menu offers "Log out" and "Log out and forget this account".
