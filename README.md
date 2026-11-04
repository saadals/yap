# Yapp

A front-end prototype of **Yapp**, a marketplace where small businesses (starting with software
teams building for Arabic-speaking audiences) commission creators to make social videos — selfie
app demos, screen walkthroughs, honest reviews, skits, tutorials and ad hook packs — for their own
accounts and ads.

No backend: everything runs on mock data and a client-side store saved in your browser.

```bash
npm install
npm run dev   # http://localhost:3000
```

## Try it

1. Open `/signin` → **Explore the demo** → pick **Daftar (business)** or **Layla (creator)**.
2. Switch sides any time from the avatar menu → **Demo view**. Both sides share the same data,
   so what you do as one shows up for the other.
3. **Reset demo data** in the same menu restores the original state.

Good paths to walk through:

- **Business:** review Layla's delivery on `/business/commissions/c-201` (play it, leave a note at a
  timestamp, request changes or approve and release payment, then review and save learnings) →
  "Commission again" → post a request with the wizard (`/business/requests/new`) → compare and
  hire a pitch on `/business/requests/r-101`.
- **Creator:** accept Qalamy's offer (`/creator/commissions/c-302`), upload a version on a
  commission in production, pitch on Daftar's request (`/creator/opportunities/r-101`) and see it
  arrive on the business side, withdraw earnings on `/creator/earnings`.
- **Discovery:** browse `/creators`, open a profile, commission a creator directly.

Other creators reply to messages, accept offers and deliver versions on their own after a few
seconds, so business flows can be tried without switching roles.

## Docs

- [CLAUDE.md](CLAUDE.md): what this is, decisions and why, architecture, status, next steps.
- [DESIGN.md](DESIGN.md): design system and build conventions.
- [product-writeup.txt](product-writeup.txt): the original product brief.
