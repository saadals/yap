import {
  Bell,
  Compass,
  CreditCard,
  Heart,
  House,
  Inbox,
  LayoutGrid,
  MessageCircle,
  Package,
  Search,
  Settings,
  SquareKanban,
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
  badge?: "messages" | "notifications" | "inbox";
};

const i = (Icon: typeof House) => <Icon size={20} aria-hidden />;

/**
 * One navigation for every signed-in account (one account type: everyone can order and make).
 * This is the desktop header; phones use `mobileNav`.
 */
export const primaryNav: Record<"app" | "public", NavItem[]> = {
  app: [
    { href: paths.home, label: "Home", icon: i(House), exact: true },
    { href: paths.explore(), label: "Discover", icon: i(Compass), also: ["/creators"] },
    { href: paths.work(), label: "Work", icon: i(SquareKanban), also: ["/orders", "/pitches"] },
    { href: paths.messages(), label: "Messages", icon: i(MessageCircle), badge: "messages" },
    {
      href: paths.profile,
      label: "Profile",
      icon: i(UserRound),
      also: ["/wallet", "/billing", "/products", "/saved", "/settings"],
    },
  ],
  public: [
    { href: paths.creators, label: "Find creators", icon: i(Search) },
    { href: paths.howItWorks, label: "How it works", icon: i(LayoutGrid) },
    { href: paths.forCreators, label: "For creators", icon: i(UserRound) },
  ],
};

/**
 * The phone's glass tab bar: Home · Work · Discover · Inbox · Profile. Inbox holds messages and
 * alerts in one tab, so the bar stays at five items. BottomBar draws Profile as the viewer's avatar.
 */
export const mobileNav: NavItem[] = [
  { href: paths.home, label: "Home", icon: i(House), exact: true },
  { href: paths.work(), label: "Work", icon: i(SquareKanban), also: ["/orders", "/pitches"] },
  { href: paths.explore(), label: "Discover", icon: i(Compass), also: ["/creators"] },
  { href: paths.messages(), label: "Inbox", icon: i(Inbox), badge: "inbox" },
  {
    href: paths.profile,
    label: "Profile",
    icon: i(UserRound),
    also: ["/wallet", "/billing", "/products", "/saved", "/settings"],
  },
];

/** Secondary destinations shown in the account menu and on the Profile hub. */
export const accountNav: NavItem[] = [
  { href: paths.wallet, label: "Wallet", icon: i(Wallet) },
  { href: paths.billing, label: "Billing & receipts", icon: i(CreditCard) },
  { href: paths.products, label: "Products", icon: i(Package) },
  { href: paths.saved, label: "Saved creators", icon: i(Heart) },
  { href: paths.settings(), label: "Settings", icon: i(Settings) },
];

export const notificationsIcon = i(Bell);
export const inboxIcon = i(Inbox);

export function isActive(item: NavItem, pathname: string) {
  // The static export serves pages with a trailing slash ("/home/").
  const current = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const path = item.href.split("?")[0];
  if (item.exact) return current === path;
  return [path, ...(item.also ?? [])].some(
    (prefix) => current === prefix || current.startsWith(`${prefix}/`),
  );
}

export const homeFor = (signedIn: boolean) => (signedIn ? paths.home : paths.landing);
