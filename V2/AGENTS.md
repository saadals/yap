## This is NOT the Next.js you know

Next.js 16.4.5 has breaking changes: APIs, conventions, and file structure may all differ from your
training data. V2 has no node_modules of its own, so read the guides in
`../node_modules/next/dist/docs/` (the repo root's install) before writing Next-specific code.
Heed deprecation notices.

## Yapp V2 project guide

Read [CLAUDE.md](CLAUDE.md) first (what V2 is, what it changes from V1 and why, routes, the mode
model, how to run it), then [DESIGN.md](DESIGN.md) (the V2 design contract). V1's guides are
[../CLAUDE.md](../CLAUDE.md) and [../DESIGN.md](../DESIGN.md); V2 keeps their product decisions,
data and money rules.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
