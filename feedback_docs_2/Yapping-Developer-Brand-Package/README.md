# Yapping — developer brand package

Start with **YAPPS_BRAND_SPEC.md**. It says where every file goes and what to change in the code.

The most important rule: **the logo is never redrawn.** Use the SVG files in `public/brand/` exactly as delivered, through `code/brand.tsx`. Do not edit, optimise or recreate them, and do not retype the word "yapping" as text. `CHECKSUMS.txt` lets you confirm the files arrived unchanged.

Contents:
- `YAPPS_BRAND_SPEC.md` — instructions and acceptance criteria
- `public/brand/` — 11 logo master files (SVG)
- `logo-png/` — transparent PNG logos for slides, social and marketing
- `app-icons/` — favicon, web app icons, App Store and Google Play icons (white background on purpose: Apple requires it)
- `code/brand.tsx` — replaces `components/ui/brand.tsx`
- `code/yapping-tokens.css` — new colour, radius and shadow values for `app/globals.css`
- `Yapping-Brand-Guidelines.pdf` — the brand book, for reference
