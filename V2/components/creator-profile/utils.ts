import { weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { pastCollaborators } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import type { Creator, PackageTier } from "@/lib/types";

/** "within 1 hour" / "within 3 hours" / "within 2 days" */
export function responseLabel(hours: number): string {
  if (hours <= 1) return "within 1 hour";
  if (hours < 24) return `within ${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "within a day" : `within ${days} days`;
}

/** "1h" / "3h" / "2d" for the track record line. */
export function responseShort(hours: number): string {
  return hours < 24 ? `${Math.max(1, Math.round(hours))}h` : `${Math.round(hours / 24)}d`;
}

export function availabilityLabel(creator: Creator): string {
  if (creator.available) return "Available now";
  return creator.availableFrom ? `Booked · free from ${weekdayDate(creator.availableFrom)}` : "Booked right now";
}

export const tierName: Record<PackageTier, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

/** Packages cheapest first (Basic, Standard, Premium). */
export const packagesInOrder = (creator: Creator) => [...creator.packages].sort((a, b) => a.price - b.price);

/** The package most people pick: Standard when there is one. */
export const popularPackage = (creator: Creator) =>
  creator.packages.length > 1 ? creator.packages.find((p) => p.tier === "standard") : undefined;

export function extraDaysLabel(days?: number): string | null {
  if (!days) return null;
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} faster`;
  return `+${days} day${days === 1 ? "" : "s"}`;
}

/** "Order again" link when this account has finished work with the creator (never your own profile). */
export function repeatHref(s: DemoState, creator: Creator): string | null {
  const entry = pastCollaborators(s).find((e) => e.creator.id === creator.id);
  return entry ? paths.orderCreator(creator.handle, { again: entry.last.id }) : null;
}

export function normalizeHandle(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value).replace(/^@/, "").toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}
