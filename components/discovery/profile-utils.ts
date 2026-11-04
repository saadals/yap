import { weekdayDate } from "@/lib/format";
import type { Creator, PackageTier } from "@/lib/types";

/** "within 1 hour" / "within 3 hours" / "within 2 days" */
export function responseLabel(hours: number): string {
  if (hours <= 1) return "within 1 hour";
  if (hours < 24) return `within ${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "within a day" : `within ${days} days`;
}

/** "1h" / "3h" / "2d" for chunky stats. */
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

/** The package a commission starts from by default (Standard, else the cheapest). */
export function defaultPackage(creator: Creator) {
  return (
    creator.packages.find((p) => p.tier === "standard") ??
    [...creator.packages].sort((a, b) => a.price - b.price)[0]
  );
}

export const cheapestPackage = (creator: Creator) =>
  [...creator.packages].sort((a, b) => a.price - b.price)[0];

export function extraDaysLabel(days?: number): string | null {
  if (!days) return null;
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} faster`;
  return `+${days} day${days === 1 ? "" : "s"}`;
}
