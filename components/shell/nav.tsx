import {
  Bell,
  BriefcaseBusiness,
  ChartLine,
  Compass,
  CreditCard,
  Heart,
  House,
  LayoutGrid,
  MessageCircle,
  Package,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";

import { paths } from "@/lib/paths";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Exact match only (for home routes). */
  exact?: boolean;
  /** Extra path prefixes that also mark this item active. */
  also?: string[];
  badge?: "messages" | "alerts";
};

const i = (Icon: typeof House, size = 20) => <Icon size={size} aria-hidden />;

/** Pages that belong to Profile: the account menu's destinations and the profile itself. */
const PROFILE_PAGES = ["/wallet", "/billing", "/products", "/saved", "/settings", "/productivity"];
const WORK_PAGES = ["/orders", "/pitches", "/explore"];

/**
 * The desktop header's links (Site-wide 5.4.4): Discover, Services (a dropdown, drawn by the
 * header), Work, Messages, Profile signed in; Discover, Services, How it works signed out.
 * `discoverHref` is "/" for an account whose desktop home is Discover, "/discover" otherwise
 * (`desktopHomeOf` in home-route.tsx).
 */
export function desktopNav(signedIn: boolean, discoverHref: string): {
  before: NavItem[];
  after: NavItem[];
} {
  const discover: NavItem = {
    href: discoverHref,
    label: "Discover",
    icon: i(Compass),
    // "/" is Discover only when it renders Discover; "/discover" and creator profiles always are.
    exact: discoverHref === paths.landing,
    also: [paths.discover, "/creators"],
  };
  if (!signedIn) {
    return {
      before: [{ ...discover, href: paths.discover, exact: false }],
      after: [{ href: paths.howItWorks, label: "How it works", icon: i(LayoutGrid) }],
    };
  }
  return {
    before: [discover],
    after: [
      { href: paths.work(), label: "Work", icon: i(BriefcaseBusiness), also: WORK_PAGES },
      { href: paths.messages(), label: "Messages", icon: i(MessageCircle), badge: "messages" },
      { href: paths.profile, label: "Profile", icon: i(UserRound), also: PROFILE_PAGES },
    ],
  };
}

/**
 * The phone's glass tab bar (round 3 answers, item 19): Home · Discover · Work · Messages ·
 * Alerts · Profile. Icons only; the active tab shows its label. BottomBar draws Profile as the
 * viewer's avatar. No tab is active on /more.
 */
export const mobileNav: NavItem[] = [
  { href: paths.home, label: "Home", icon: i(House, 22), exact: true },
  { href: paths.discover, label: "Discover", icon: i(Compass, 22), also: ["/creators"] },
  { href: paths.work(), label: "Work", icon: i(BriefcaseBusiness, 21), also: WORK_PAGES },
  { href: paths.messages(), label: "Messages", icon: i(MessageCircle, 22), badge: "messages" },
  { href: paths.alerts, label: "Alerts", icon: i(Bell, 22), badge: "alerts" },
  { href: paths.profile, label: "Profile", icon: i(UserRound, 22), also: PROFILE_PAGES },
];

/** The account menu's and Profile hub's destinations after Productivity (Site-wide 5.9.1). */
export const accountNav: NavItem[] = [
  { href: paths.wallet, label: "Wallet", icon: i(Wallet) },
  { href: paths.billing, label: "Billing & receipts", icon: i(CreditCard) },
  { href: paths.products, label: "Products", icon: i(Package) },
  { href: paths.saved, label: "Saved creators", icon: i(Heart) },
  { href: paths.settings(), label: "Settings", icon: i(Settings) },
];

export const productivityIcon = i(ChartLine);
export const notificationsIcon = i(Bell);

/** The static export serves pages with a trailing slash ("/home/"). */
export const normalizePath = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

export function isActive(item: NavItem, pathname: string) {
  const current = normalizePath(pathname);
  const path = item.href.split(/[?#]/)[0];
  if (item.exact) {
    if (current === path) return true;
  } else if (current === path || current.startsWith(`${path}/`)) {
    return true;
  }
  return (item.also ?? []).some((prefix) => current === prefix || current.startsWith(`${prefix}/`));
}

/**
 * Where the logo goes. Signed in it's "/", which routes by screen size and account (Discover or
 * Work on desktop, the feed on phones; see home-route.tsx). Signed out it's the bubble landing.
 */
export const homeFor = () => paths.landing;
