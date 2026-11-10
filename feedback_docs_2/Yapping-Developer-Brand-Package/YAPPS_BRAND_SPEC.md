# YAPPS — Brand spec (Part 6): new logo and brand tokens

**For:** the developer (Claude Code) working in the existing Next.js repo (`saadals/yap`, branch `main`).
**Read with:** `YAPPS_SITEWIDE_SPEC.md` (Part 5), the Yapping design system, and `Yapping-Brand-Guidelines.pdf` (in this package).

**Rule of precedence:** for anything about the **logo, app icon, favicon and brand colours**, this file wins over every older part. It **replaces** Part 5 §5.3.2, acceptance criterion 16, and the "Logo" line in §5.12. Everything else in Part 5 stays.

---

## 6.0 The one rule: never redraw the logo

The logo is delivered as **master SVG files**. They are the only source.

- **Do not** rebuild the logo with `<path>`, `<circle>`, CSS shapes, icon fonts or canvas.
- **Do not** retype the wordmark as text (no `<span>yapp</span>`, no Funnel Display text). The wordmark is outlined artwork.
- **Do not** open the SVG files and edit paths, colours, sizes or the `viewBox`.
- **Do not** let an AI tool "recreate", "optimise", "simplify" or "clean up" the SVGs. Use them byte-for-byte as delivered. (Running SVGO or any minifier on them is not allowed either.)
- **Do not** stretch: always keep the width ÷ height ratio of the file (the `brand.tsx` component does this).
- If a version, size or colour is missing, **stop and ask the owner** for a new master file.

Verification: after the change, `git diff` must show the files in `public/brand/` added **unchanged** (same SHA-256 as in this package), and `components/ui/brand.tsx` must contain **no** `<path` or `<circle` elements.

---

## 6.1 What is in this package

| Folder | Contents | Goes to |
|---|---|---|
| `public/brand/` | 11 SVG master files (list in 6.2) | `public/brand/` in the repo, as-is |
| `logo-png/` | Transparent PNG logos (mark, lockup, wordmark; light and on-dark; 256, 512 and 1024px tall) | slides, social, marketing, partners. Not for the website (use the SVGs) |
| `app-icons/` | `favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-icon.png` (180), `app-store-1024.png`, `google-play-512.png` | see 6.4 |
| `code/brand.tsx` | Drop-in replacement for `components/ui/brand.tsx` | `components/ui/brand.tsx` |
| `code/yapping-tokens.css` | New values for the `--y-*` tokens | merge into `app/globals.css` (6.5) |
| `Yapping-Brand-Guidelines.pdf` | The brand book (10 pages) | reference only |
| `CHECKSUMS.txt` | SHA-256 of every file | verification |

---

## 6.2 The logo

**Mark:** a film clapper (green stick with three dark stripes, tilted up 13°) over a dark speech bubble with three typing dots: **white, white, green**. The green dot is always the last one. **No red** in the logo anymore (this replaces the green-green-red dots of Part 5).
**Wordmark:** "yapping", lowercase, Funnel Display Bold, tracking −0.045em, converted to outlines.

| File | Use |
|---|---|
| `yapping-lockup.svg` | Header logo on light surfaces (nav, auth pages, emails) |
| `yapping-lockup-on-dark.svg` | On `--y-night`, `--y-footer`, dark stages, over video |
| `yapping-mark.svg` | Mark alone, 20px tall and up, on light |
| `yapping-mark-on-dark.svg` | Mark alone on dark |
| `yapping-mark-small.svg` | 12–19px tall only (no dots), on light |
| `yapping-mark-small-on-dark.svg` | 12–19px tall only, on dark |
| `yapping-wordmark.svg` / `-on-dark.svg` | Wordmark alone, only where the mark is already nearby |
| `yapping-app-icon.svg` | White rounded tile (23% radius): web app icon, social avatar |
| `yapping-app-icon-dark.svg`, `-green.svg` | Campaign tiles, splash screens |

**Clear space:** the height of the bubble on every side for the lockup; half of that for the mark alone in the UI.
**Minimum size:** lockup 96px wide; mark with dots 20px tall; small mark 12px tall.

---

## 6.3 Code changes (logo)

1. Copy `public/brand/*` into the repo's `public/brand/` (create the folder). Do not rename files.
2. Replace `components/ui/brand.tsx` with `code/brand.tsx`. Exports keep the same names (`Brand`, `BrandMark`, `Wordmark`) and gain an optional `tone: "light" | "dark"` prop. `size` is the **height** in px.
3. Update the call sites (found in the repo today):

| File | Now | Change to |
|---|---|---|
| `components/shell/site-header.tsx:48` | `<Brand href=… />` | unchanged (light) |
| `components/landing/welcome-scene.tsx:153, 157` | `<Brand href=… />` | unchanged if the background is light; `tone="dark"` if it sits on a dark scene |
| `components/shell/site-footer.tsx:72` | `<BrandMark size={64} />` | `<BrandMark size={64} tone="dark" />` (footer is `#141416`) |
| `components/auth/sign-in-panel.tsx:244` | `<BrandMark size={26} />` | unchanged (light panel) |
| `components/feed/reel-feed.tsx:371` | `<BrandMark size={26} />` + `<Wordmark />` | `tone="dark"` on both when drawn over video |

4. Remove the old inline logo everywhere else: search the repo for `viewBox="0 0 28 28"`, `BrandMark` copies, any hard-coded "yapp" wordmark text, and the landing page's three-green-dots logo. Every logo must come from `brand.tsx`.
5. The old CSS-variable trick (`--b-bg` for dot colours) is no longer used; delete it if nothing else reads it.

---

## 6.4 App icon and favicon

- **Next.js app router:** put `favicon.ico`, `icon-512.png` (rename to `icon.png`) and `apple-icon.png` in `app/`. Next generates the `<link>` tags. Delete any old favicon in `public/`.
- **Web manifest** (`app/manifest.ts` or `public/manifest.webmanifest`): icons `icon-192.png` and `icon-512.png`, `theme_color: "#F7F7F9"`, `background_color: "#F7F7F9"`.
- **App icons are opaque on purpose.** Apple rejects App Store icons with transparency, and home screens and browser tabs show the icon on any wallpaper, so the white tile must stay. For a logo without a background, use `logo-png/` or the SVGs.
- **Native app (iOS/Android shell):** `app-store-1024.png` is the iOS master (square, no transparency, no rounded corners: iOS applies its own mask). `google-play-512.png` is the Play Store listing icon. Generate the in-app icon sets from these two files with the platform tools; do not redraw.
- **Splash screen:** `yapping-mark.svg` centred on `#F7F7F9`, 96px tall.
- **Email headers:** `yapping-lockup.svg` exported to PNG at 2× (height 64px, shown at 32px). PNG export is a resize, not a redraw.

---

## 6.5 Brand tokens

Merge `code/yapping-tokens.css` into the existing `:root` block of `app/globals.css`: **change values, keep names**. It contains the full Part 5 §5.3.1 table plus these additions:

- `--y-green-text: #0A7A33` for green text on light surfaces (the neon green fails contrast as text).
- `--y-shadow-glow` for the primary dark button hover.
- `--y-footer: #141416`.

Do not change the illustration palette (`--y-lavender`, `--y-butter`, `--y-sky`, `--y-c-*`, `--y-reel-*`).

**Contrast warnings (keep the colours, follow the rule):**
- `--y-ink-3` (#9A9AA0) is 2.6:1 on the canvas: hints and axis labels only, never text people must read.
- `--y-success` (#16A34A) and `--y-danger` (#E5483B) are 3.3:1 and 3.9:1 on white: use at 18px+ or bold 14px+, inside a tinted chip, or with an icon or word.
- Never white text on `--y-neon`; never `--y-neon` as text on light.

**Type:** Inter 400/500/600 for all text. Funnel Display is now used only inside the logo artwork, so the display font no longer needs to load for the wordmark. Keep the `--y-stack-display` token only if other components still use it.

---

## 6.6 Name in the interface

The logo artwork reads **"yapping"**. The interface copy currently says "Yapp" in many places (page titles, "Get the Yapp app", "Rate Yapp", the version line, aria labels).

- **Do not rename interface copy as part of this change.** The owner is still clearing the name legally. Only the logo, icons, tokens and the `aria-label`/`alt` text of the logo itself (now "Yapping") change.
- When the owner confirms the name, a separate change will replace "Yapp" with "Yapping" across copy, metadata and the app store listing.

---

## 6.7 Acceptance criteria (replaces Part 5, criterion 16)

1. Every logo on every route, sheet, email and the app comes from `components/ui/brand.tsx`, which only renders files from `public/brand/`.
2. `public/brand/` files match `CHECKSUMS.txt` exactly.
3. `brand.tsx` contains no `<path>`, `<circle>` or text wordmark. A repo search for `viewBox="0 0 28 28"` returns nothing.
4. Light surfaces show the light versions; the footer, dark stages and video overlays show the `-on-dark` versions.
5. The logo is never stretched: rendered width ÷ height equals the file's ratio (±1px).
6. Marks below 20px tall use the small mark (no dots).
7. Browser tab shows the new favicon; adding to the home screen shows the new icon; the native app uses the new store icons.
8. `app/globals.css` token values match `code/yapping-tokens.css`.
9. No red appears in any logo.

---

## 6.8 Decisions log

- Logo: clapper over a speech bubble with white, white, green typing dots ("Take one", version B). Replaces the green-green-red bubble.
- Wordmark: "yapping", Funnel Display Bold, outlined.
- Logo files are the single source; redrawing is not allowed.
- Interface copy stays "Yapp" until the name is legally cleared.
