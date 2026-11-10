/**
 * Every in-app URL, in one place. Components, the store (notification links) and seed data link
 * through these helpers instead of hard-coding strings, so routes can move without a hunt.
 *
 * One account type: the same URL shows an order or a commission to whoever is looking, and the
 * page works out which side of the deal the viewer is on (`sideOf` in lib/selectors.ts).
 *
 * Never prefix with the GitHub Pages base path here: <Link> and the router add it. For text that
 * leaves the app (copy link, share), wrap with `absoluteUrl()` from lib/site.ts.
 */

export type ExploreTab = "creators" | "orders";
export type WorkTab = "ordered" | "making";
export type OrderType = "campaign" | "custom";
/** Which door a signed-out visitor came through: order videos, or make them. */
export type SignInIntent = "ask" | "make";

const q = (params: Record<string, string | number | undefined | null | false>) => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== null && entry[1] !== false && entry[1] !== "",
  );
  if (!entries.length) return "";
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
};

export const paths = {
  /* public */
  landing: "/",
  about: "/about",
  howItWorks: "/how-it-works",
  forCreators: "/for-creators",
  /** Terms, privacy and the other policies (in legal review: names only, no text yet). */
  legal: "/legal",
  creators: "/creators",
  creator: (handle: string) => `/creators/${handle}`,
  /** Direct order from a creator's profile (`video` = the reel that inspired it). */
  orderCreator: (
    handle: string,
    params: { package?: string; again?: string; product?: string; video?: string } = {},
  ) => `/creators/${handle}/commission${q(params)}`,

  /* auth */
  signIn: (params: { next?: string; intent?: SignInIntent } = {}) => `/signin${q(params)}`,
  signUp: "/signup",
  onboarding: (params: { start?: "order" | "make" | "both"; name?: string; domain?: string } = {}) =>
    `/onboarding${q(params)}`,

  /* signed in */
  home: "/home",
  /** The feed, starting on one order or video (e.g. "See it in the feed" after publishing). */
  reel: (id: string) => `/home${q({ reel: id })}`,
  explore: (tab?: ExploreTab) => `/explore${q({ tab })}`,
  work: (tab?: WorkTab) => `/work${q({ tab })}`,
  commission: (id: string, params: { tab?: string; version?: number } = {}) =>
    `/work/${id}${q(params)}`,
  /** The orders you placed (custom requests and campaigns). */
  orders: (params: { tab?: string } = {}) => `/orders${q(params)}`,
  newOrder: (
    params: { type?: OrderType; product?: string; creator?: string; draft?: string; again?: string } = {},
  ) => `/orders/new${q(params)}`,
  /** One order: the owner manages it, everyone else reads it and accepts or pitches. */
  order: (id: string, params: { tab?: string; pitch?: string; slot?: number } = {}) =>
    `/orders/${id}${q(params)}`,
  pitches: "/pitches",
  messages: (thread?: string) => `/messages${q({ thread })}`,
  /** The Inbox's Alerts tab (the mobile bar's Inbox holds messages and alerts). */
  alerts: "/messages?tab=alerts",
  profile: "/profile",
  editProfile: (section?: string) => `/profile/edit${section ? `#${section}` : ""}`,
  wallet: "/wallet",
  billing: "/billing",
  products: "/products",
  newProduct: "/products/new",
  product: (id: string) => `/products/${id}`,
  saved: "/saved",
  settings: (section?: string) => `/settings${section ? `#${section}` : ""}`,
} as const;
