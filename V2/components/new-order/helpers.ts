/** Small copy and package helpers shared by the ordering flows (new order and direct order). */

import { weekdayDate } from "@/lib/format";
import type { Creator, PackageTier } from "@/lib/types";

/** "within 1 hour", "within 3 hours", "within a day". */
export function responseLabel(hours: number): string {
  if (hours <= 1) return "within 1 hour";
  if (hours < 24) return `within ${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "within a day" : `within ${days} days`;
}

export const tierName: Record<PackageTier, string> = { basic: "Basic", standard: "Standard", premium: "Premium" };

/** The package an order starts from by default: Standard, else the cheapest. */
export function defaultPackage(creator: Creator) {
  return creator.packages.find((p) => p.tier === "standard") ?? [...creator.packages].sort((a, b) => a.price - b.price)[0];
}

export function availabilityLabel(creator: Creator): string {
  if (creator.available) return "Available now";
  return creator.availableFrom ? `Booked until ${weekdayDate(creator.availableFrom)}` : "Booked right now";
}

/** "+2 days" / "2 days faster" for add-ons that change delivery time. */
export function extraDaysLabel(days?: number): string | null {
  if (!days) return null;
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} faster`;
  return `+${days} day${days === 1 ? "" : "s"}`;
}
