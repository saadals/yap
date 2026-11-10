/**
 * Every in-app URL in V2, in one place. Components, the store (notification links) and seed data
 * link through these helpers instead of hard-coding strings.
 *
 * V2 shows one side of the marketplace at a time (see lib/mode.ts):
 * - Ordering ("order" mode): /home, /discover, /creators/*, /orders, /orders/new, /library,
 *   /products, /billing.
 * - Studio ("studio" mode): everything under /studio.
 * - Shared: an order (/orders/[id]) and a job (/jobs/[id]) are one URL for both sides; the page
 *   works out the viewer's side (`sideOf`) and tells the shell which mode to show. /messages,
 *   /account and /settings keep the mode you came from.
 *
 * Names the store and seed data use (`commission`, `order`, `creator`, `pitches`, `wallet`) are
 * kept so lib/store.ts and lib/data need no changes.
 *
 * Never prefix with the GitHub Pages base path here: <Link> and the router add it. For text that
 * leaves the app (copy link, share), wrap with `absoluteUrl()` from lib/site.ts.
 */

export type OrderType = "campaign" | "custom";
/** Which door a signed-out visitor came through: order videos, or make them. */
export type SignInIntent = "order" | "make";
export type StudioJobsTab = "active" | "pitches" | "done";
export type DiscoverTab = "all" | "saved";

type Params = Record<string, string | number | undefined | null | false>;

const q = (params: Params) => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== null && entry[1] !== false && entry[1] !== "",
  );
  if (!entries.length) return "";
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
};

/** `comment` opens that delivery comment (notifications about a comment link straight to it). */
const job = (id: string, params: { tab?: string; version?: number; comment?: string } = {}) =>
  `/jobs/${id}${q(params)}`;
const earnings = "/studio/earnings";

export const paths = {
  /* ------------------------------------------------------------ public */
  landing: "/",
  howItWorks: "/how-it-works",
  forCreators: "/for-creators",
  /** Terms, privacy and the other policies (in legal review: names only, no text yet). */
  legal: "/legal",
  /** The services Yapp offers (round 3 answers, item 37): an index and one page per service. */
  services: "/services",
  service: (slug: "ugc-ads" | "native-posts" | "hook-lab" | "go-to-market") => `/services/${slug}`,
  forTechTeams: "/for/tech-teams",

  /* -------------------------------------------------------------- auth */
  signIn: (params: { next?: string; intent?: SignInIntent; new?: 1 } = {}) => `/signin${q(params)}`,
  onboarding: (params: { start?: "order" | "make" | "both"; name?: string } = {}) =>
    `/onboarding${q(params)}`,

  /* ------------------------------------------------- ordering mode */
  home: "/home",
  /** Find creators. `tab: "saved"` shows the creators you saved. */
  discover: (
    params: {
      tab?: DiscoverTab;
      format?: string;
      lang?: string;
      niche?: string;
      kind?: string;
      q?: string;
      sort?: string;
    } = {},
  ) => `/discover${q(params)}`,
  /** Full-screen vertical viewer of creators' videos, optionally starting on one video. */
  watch: (params: { video?: string; creator?: string } = {}) => `/discover/watch${q(params)}`,
  creator: (handle: string) => `/creators/${handle}`,
  /** Direct order from a creator's profile (`video` = the video that inspired it). */
  orderCreator: (
    handle: string,
    params: { package?: string; again?: string; product?: string; video?: string } = {},
  ) => `/creators/${handle}/order${q(params)}`,
  /** Everything you ordered: open requests, campaigns, jobs in progress, done. */
  orders: (params: { view?: string } = {}) => `/orders${q(params)}`,
  /** New order. Without `type` it asks how you want to work first. */
  newOrder: (
    params: { type?: OrderType; product?: string; creator?: string; draft?: string; again?: string } = {},
  ) => `/orders/new${q(params)}`,
  /** Approved videos for your products. */
  library: (params: { product?: string; video?: string } = {}) => `/library${q(params)}`,
  products: "/products",
  newProduct: "/products/new",
  product: (id: string) => `/products/${id}`,
  billing: "/billing",

  /* ------------------------------------------------------------ shared */
  /** One order: the owner manages it (pitches or campaign slots); a creator reads it and pitches or takes a slot. */
  order: (id: string, params: { tab?: string; pitch?: string; slot?: number } = {}) =>
    `/orders/${id}${q(params)}`,
  /** One job (a commission), for both sides. */
  job,
  /** Same as `job` (the store and seed data use this name). */
  commission: job,
  messages: (thread?: string) => `/messages${q({ thread })}`,
  /**
   * Productivity: figures the platform can compute, for the side you're in (Ordering: spending and
   * results; Studio: earnings and pitching). `as` picks a side explicitly; `range` the period.
   */
  productivity: (params: { as?: "brand" | "creator"; range?: string } = {}) => `/productivity${q(params)}`,
  /** The Inbox's Alerts tab. */
  alerts: "/messages?tab=alerts",
  /** Account hub: the phone's "Me" tab, also reachable from the avatar menu. */
  account: "/account",
  settings: (section?: string) => `/settings${section ? `#${section}` : ""}`,

  /* ---------------------------------------------------- studio mode */
  studio: "/studio",
  /** Open custom orders and UGC campaigns you can pitch on or pick. */
  findWork: (
    params: {
      kind?: OrderType;
      /** Job type: "video" (Full video) or "ad-copy" (Ad copy writing). */
      job?: string;
      format?: string;
      lang?: string;
      /** Minimum pay in dollars. */
      min?: number;
      sort?: string;
      /** Show the items you marked "Not interested". */
      hidden?: 1;
    } = {},
  ) => `/studio/work${q(params)}`,
  studioJobs: (params: { tab?: StudioJobsTab } = {}) => `/studio/jobs${q(params)}`,
  /** Pitches you sent (a tab of Studio jobs; the store links here). */
  pitches: "/studio/jobs?tab=pitches",
  earnings,
  /** Same as `earnings` (the store uses this name). */
  wallet: earnings,
  /** Edit your public creator profile: portfolio, packages, about, connected accounts. */
  studioProfile: (section?: string) => `/studio/profile${section ? `#${section}` : ""}`,
} as const;
