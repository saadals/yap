import {
  Bell,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Heart,
  House,
  Inbox,
  LayoutGrid,
  MessageCircle,
  Package,
  Search,
  Send,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";

import type { SessionRole } from "@/lib/prefs";

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

export const primaryNav: Record<"business" | "creator" | "public", NavItem[]> = {
  business: [
    { href: "/business", label: "Home", icon: i(House), exact: true },
    { href: "/creators", label: "Find creators", icon: i(Search) },
    { href: "/business/requests", label: "Requests", icon: i(FileText) },
    { href: "/business/commissions", label: "Commissions", icon: i(BriefcaseBusiness) },
    { href: "/business/messages", label: "Messages", icon: i(MessageCircle), badge: "messages" },
  ],
  creator: [
    { href: "/creator", label: "Home", icon: i(House), exact: true },
    { href: "/creator/opportunities", label: "Opportunities", icon: i(Search), also: ["/creator/pitches"] },
    { href: "/creator/commissions", label: "Commissions", icon: i(BriefcaseBusiness) },
    { href: "/creator/messages", label: "Messages", icon: i(MessageCircle), badge: "messages" },
    { href: "/creator/profile", label: "Profile", icon: i(UserRound) },
  ],
  public: [
    { href: "/creators", label: "Find creators", icon: i(Search) },
    { href: "/how-it-works", label: "How it works", icon: i(LayoutGrid) },
    { href: "/for-creators", label: "For creators", icon: i(UserRound) },
  ],
};

/** Secondary destinations shown in the account menu. */
export const accountNav: Record<"business" | "creator", NavItem[]> = {
  business: [
    { href: "/business/products", label: "Products", icon: i(Package) },
    { href: "/business/creators", label: "Saved creators", icon: i(Heart) },
    { href: "/business/billing", label: "Billing & receipts", icon: i(CreditCard) },
    { href: "/business/settings", label: "Settings", icon: i(Settings) },
  ],
  creator: [
    { href: "/creator/pitches", label: "My pitches", icon: i(Send) },
    { href: "/creator/earnings", label: "Earnings & payouts", icon: i(Wallet) },
    { href: "/creator/settings", label: "Settings", icon: i(Settings) },
  ],
};

export const notificationsIcon = i(Bell);
export const inboxIcon = i(Inbox);

export function isActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return [item.href, ...(item.also ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const homeFor = (role: SessionRole) =>
  role === "business" ? "/business" : role === "creator" ? "/creator" : "/";
