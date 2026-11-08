import {
  Bell,
  BriefcaseBusiness,
  CreditCard,
  Heart,
  House,
  Inbox,
  LayoutGrid,
  MessageCircle,
  Package,
  Search,
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
  badge?: "messages" | "notifications";
};

const i = (Icon: typeof House) => <Icon size={20} aria-hidden />;

/**
 * One navigation for every signed-in account (one account type: everyone can order and make).
 * Mobile bottom bar per the PM's Figure 01: Home · Search · Work · Messages · Profile.
 */
export const primaryNav: Record<"app" | "public", NavItem[]> = {
  app: [
    { href: paths.home, label: "Home", icon: i(House), exact: true },
    { href: paths.explore(), label: "Explore", icon: i(Search), also: ["/creators"] },
    { href: paths.work(), label: "Work", icon: i(BriefcaseBusiness), also: ["/orders", "/pitches"] },
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
  const path = item.href.split("?")[0];
  if (item.exact) return pathname === path;
  return [path, ...(item.also ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const homeFor = (signedIn: boolean) => (signedIn ? paths.home : paths.landing);
