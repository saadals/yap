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
/** Work's sections. "find" is Find work (every open campaign and custom order, `findWork()`). */
export type WorkTab = "find" | "ordered" | "making";
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
  /**
   * Discover: the desktop home when signed in (served at "/"), and this address for phones and
   * for signed-out visitors (round 3 answers, items 11 and 43).
   */
  discover: "/discover",
  /** What Yapp offers brands: the Services menu's pages (answers, item 37). */
  service: (slug: string) => `/services/${slug}`,
  /** "For tech teams" and other audience pages. */
  audience: (slug: string) => `/for/${slug}`,
  /** The phone's More page: what the desktop footer holds (answers, item 41). */
  more: "/more",
  about: "/about",
  howItWorks: "/how-it-works",
  /** The questions people ask, on How it works. */
  faq: "/how-it-works#faq",
  forCreators: "/for-creators",
  /** Terms, privacy and the other policies (in legal review: names only, no text yet). */
  legal: "/legal",
  creators: "/creators",
  /** Find creators with filters ("See creators" on a service page). Keys are the browse page's. */
  findCreators: (params: { format?: string; niche?: string } = {}) => `/creators${q(params)}`,
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
  /** The phone feed. Desktop never renders it: "/home" there goes to "/" (answers, items 11, 59). */
  home: "/home",
  /** The feed, starting on one order or video (e.g. "See it in the feed" after publishing). */
  reel: (id: string) => `/home${q({ reel: id })}`,
  explore: (tab?: ExploreTab) => `/explore${q({ tab })}`,
  work: (tab?: WorkTab) => `/work${q({ tab })}`,
  /**
   * Find work with filters in the query string, so a link can be shared and Back works. Pass the
   * same keys the page reads (the page owns their names and values).
   */
  findWork: (filters: Record<string, string | number | undefined | null | false> = {}) =>
    `/work${q({ tab: "find", ...filters })}`,
  /** The order in progress (a commission). `version` opens that version, `comment` highlights a comment. */
  commission: (id: string, params: { tab?: string; version?: number; comment?: string } = {}) =>
    `/work/${id}${q(params)}`,
  /** Statistics for both sides ("Productivity"; round 3 answers, item 17). */
  productivity: "/productivity",
  /** The phone feed in read-only preview mode, for a frame on another page (lib/preview.ts). */
  appPreview: "/app-preview",
  /** The orders you placed (custom orders and campaigns). */
  orders: (params: { tab?: string } = {}) => `/orders${q(params)}`,
  newOrder: (
    params: {
      type?: OrderType;
      product?: string;
      creator?: string;
      draft?: string;
      again?: string;
      /** The service page it came from ("ugc-ads", "go-to-market"…), for New order to preselect. */
      service?: string;
    } = {},
  ) => `/orders/new${q(params)}`,
  /** One order: the owner manages it, everyone else reads it and accepts or pitches. */
  order: (id: string, params: { tab?: string; pitch?: string; slot?: number } = {}) =>
    `/orders/${id}${q(params)}`,
  pitches: "/pitches",
  messages: (thread?: string) => `/messages${q({ thread })}`,
  /** Notifications: the phone's Alerts tab (desktop opens the same list from the bell). */
  alerts: "/alerts",
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
