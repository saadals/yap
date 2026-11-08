/**
 * Ids to pre-render for dynamic routes in the static export (GitHub Pages).
 * Seed ids come from lib/data; items created in the browser use sequential ids (`r-n1`, `c-n1`,
 * `p-n1` — see `uid` in lib/store.ts), so we also pre-render a fixed number of those slots.
 * Each route's layout.tsx exports `generateStaticParams` built from these.
 * (In `next dev` / a normal server build these simply pre-render the known ids; any other id is
 * still rendered on demand.)
 */
import { accounts, commissions, creators, products, requests } from "./data";

/**
 * How many browser-created items per type get a page on static hosting. Commissions get the most:
 * every campaign slot a creator takes (and every reassignment) is a commission.
 */
export const RUNTIME_SLOTS = { r: 40, c: 200, p: 30 } as const;

const slots = (prefix: keyof typeof RUNTIME_SLOTS) =>
  Array.from({ length: RUNTIME_SLOTS[prefix] }, (_, index) => `${prefix}-n${index + 1}`);

export const requestIds = () => [...requests.map((r) => r.id), ...slots("r")];
export const commissionIds = () => [...commissions.map((c) => c.id), ...slots("c")];
export const productIds = () => [...products.map((p) => p.id), ...slots("p")];
/** Seed handles plus the handle each demo account's creator profile gets when set up. */
export const creatorHandles = () => [
  ...new Set([...creators.map((c) => c.handle), ...accounts.map((a) => a.reserved.handle)]),
];
