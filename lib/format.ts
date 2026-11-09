import { DAY, HOUR, MINUTE, NOW, TIME_ZONE } from "./clock";
import { SERVICE_FEE_RATE } from "./taxonomy";

/** Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits become Latin ones. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$1,240". Pass `cents` for receipts ("$1,240.00"). */
export function money(amount: number, cents = false): string {
  return cents ? usdCents.format(amount) : usd.format(Math.round(amount));
}

/** "$200–350" */
export function moneyRange(min: number, max: number): string {
  if (min === max) return money(min);
  return `${money(min)}–${Math.round(max).toLocaleString("en-US")}`;
}

/** Commission arithmetic. Creators keep 100% of price + add-ons; the business pays the fee. */
export function priceBreakdown(
  price: number,
  addons: { price: number }[] = [],
  feeRate = SERVICE_FEE_RATE,
) {
  const addonsTotal = addons.reduce((sum, item) => sum + item.price, 0);
  const subtotal = price + addonsTotal;
  const fee = Math.round(subtotal * feeRate * 100) / 100;
  return { price, addonsTotal, subtotal, fee, total: subtotal + fee, creatorEarns: subtotal };
}

/* -------------------------------------------------------------------------- */
/* Numbers                                                                     */
/* -------------------------------------------------------------------------- */

export function num(value: number): string {
  return value.toLocaleString("en-US");
}

/** 184000 → "184K", 1250000 → "1.3M" */
export function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${num(count)} ${count === 1 ? one : many}`;
}

/* -------------------------------------------------------------------------- */
/* Time (relative to the fixed demo clock, displayed in Riyadh time)           */
/* -------------------------------------------------------------------------- */

const dateShort = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});
const dateWeekday = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const dateLong = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});
const monthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});
const clockTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "7 Nov" */
export const shortDate = (iso: string) => dateShort.format(new Date(iso));
/** "Thu, 7 Nov" */
export const weekdayDate = (iso: string) => dateWeekday.format(new Date(iso));
/** "7 November 2026" */
export const longDate = (iso: string) => dateLong.format(new Date(iso));
/** "March 2025" */
export const monthYearOf = (iso: string) => monthYear.format(new Date(iso));
/** "14:30" */
export const timeOf = (iso: string) => clockTime.format(new Date(iso));

/** Whole calendar days between NOW and `iso` in Riyadh time (positive = future). */
export function daysFromNow(iso: string): number {
  const offset = 3 * HOUR;
  const day = (ms: number) => Math.floor((ms + offset) / DAY);
  return day(Date.parse(iso)) - day(NOW);
}

/** "just now", "12 min ago", "3h ago", "Yesterday", "4 days ago", "7 Nov" */
export function timeAgo(iso: string): string {
  const diff = NOW - Date.parse(iso);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  const days = -daysFromNow(iso);
  if (days === 0) return `${Math.floor(diff / HOUR)}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(iso);
}

/** Message-list stamp: today → "14:30", yesterday → "Yesterday", this week → "Mon", else "7 Nov". */
export function stamp(iso: string): string {
  const days = -daysFromNow(iso);
  if (days <= 0) return timeOf(iso);
  if (days === 1) return "Yesterday";
  if (days < 7)
    return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short" }).format(
      new Date(iso),
    );
  return shortDate(iso);
}

/** Deadline wording with urgency. */
export function dueLabel(iso: string): { text: string; urgency: "late" | "soon" | "ok" } {
  const days = daysFromNow(iso);
  if (days < 0)
    return { text: `${plural(-days, "day")} late`, urgency: "late" };
  if (days === 0) return { text: "Due today", urgency: "soon" };
  if (days === 1) return { text: "Due tomorrow", urgency: "soon" };
  if (days <= 3) return { text: `Due in ${days} days`, urgency: "soon" };
  return { text: `Due ${weekdayDate(iso)}`, urgency: "ok" };
}

/** "in 3 days" / "tomorrow" / "today" / "3 days ago" */
export function relativeDay(iso: string): string {
  const days = daysFromNow(iso);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

/** 42 → "0:42", 95 → "1:35" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 42 → "42s", 90 → "1.5 min", 120 → "2 min" */
export function lengthLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = seconds / 60;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
