import {
  BriefcaseBusiness,
  Compass,
  FolderKanban,
  House,
  Inbox,
  LayoutGrid,
  Library,
  Search,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

import type { Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Exact match only (home routes). */
  exact?: boolean;
  /** Extra path prefixes that also mark this item active. */
  also?: string[];
  /** "inbox": unread conversations plus unread alerts (the desktop count bubble, the phone dot). */
  badge?: "inbox";
};

const i = (Icon: typeof House) => <Icon size={20} aria-hidden strokeWidth={1.9} />;

/**
 * Desktop header navigation, one per mode. Shared pages (an order, a job) light up the item of the
 * mode they're shown in: a job is under Orders when you ordered it and under Jobs when you make it.
 * Inbox holds Messages and Alerts, as on phones. In Studio, Profile also lights on your own public
 * profile (the only creator profile shown in Studio).
 */
export const desktopNav: Record<Mode, NavItem[]> = {
  order: [
    { href: paths.home, label: "Home", icon: i(House), exact: true },
    { href: paths.discover(), label: "Discover", icon: i(Compass), also: ["/creators"] },
    { href: paths.orders(), label: "Orders", icon: i(FolderKanban), also: ["/jobs"] },
    { href: paths.library(), label: "Library", icon: i(Library), also: ["/products"] },
    { href: paths.messages(), label: "Inbox", icon: i(Inbox), badge: "inbox" },
  ],
  studio: [
    { href: paths.studio, label: "Home", icon: i(House), exact: true },
    { href: paths.findWork(), label: "Find work", icon: i(Search), also: ["/orders"] },
    { href: paths.studioJobs(), label: "Jobs", icon: i(BriefcaseBusiness), also: ["/jobs"] },
    { href: paths.earnings, label: "Earnings", icon: i(Wallet) },
    { href: paths.studioProfile(), label: "Profile", icon: i(UserRound), also: ["/creators"] },
    { href: paths.messages(), label: "Inbox", icon: i(Inbox), badge: "inbox" },
  ],
};

/** The phone's tab bar, one per mode. "Me" is drawn as the viewer's avatar. */
export const phoneNav: Record<Mode, NavItem[]> = {
  order: [
    { href: paths.home, label: "Home", icon: i(House), exact: true },
    { href: paths.discover(), label: "Discover", icon: i(Compass), also: ["/creators"] },
    { href: paths.orders(), label: "Orders", icon: i(FolderKanban), also: ["/jobs", "/library", "/products"] },
    { href: paths.messages(), label: "Inbox", icon: i(Inbox), badge: "inbox" },
    { href: paths.account, label: "Me", icon: i(UserRound), also: ["/settings", "/billing"] },
  ],
  studio: [
    { href: paths.studio, label: "Home", icon: i(House), exact: true },
    { href: paths.findWork(), label: "Find work", icon: i(Search), also: ["/orders"] },
    { href: paths.studioJobs(), label: "Jobs", icon: i(BriefcaseBusiness), also: ["/jobs"] },
    { href: paths.messages(), label: "Inbox", icon: i(Inbox), badge: "inbox" },
    { href: paths.account, label: "Me", icon: i(UserRound), also: ["/settings", "/studio/earnings", "/studio/profile"] },
  ],
};

/** Signed-out header links. */
export const publicNav: NavItem[] = [
  { href: paths.discover(), label: "Find creators", icon: i(Search), also: ["/creators"] },
  { href: paths.services, label: "Services", icon: i(Sparkles), also: ["/services", "/for"] },
  { href: paths.howItWorks, label: "How it works", icon: i(LayoutGrid) },
  { href: paths.forCreators, label: "For creators", icon: i(UserRound) },
];

export function isActive(item: NavItem, pathname: string) {
  // The static export serves pages with a trailing slash ("/home/").
  const current = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const path = item.href.split("?")[0];
  if (item.exact) return current === path;
  return [path, ...(item.also ?? [])].some(
    (prefix) => current === prefix || current.startsWith(`${prefix}/`),
  );
}
