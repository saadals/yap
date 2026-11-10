import { DAY, HOUR, MINUTE, NOW, TIME_ZONE, TZ_OFFSET } from "./clock";
import { PITCH_MIN, PRICE_MAX_PER_YAPP, PRICE_MIN_PER_YAPP, SERVICE_FEE_RATE } from "./taxonomy";

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

/** "$286" for whole dollars, "$291.50" otherwise: for totals that must agree to the cent. */
export function moneyExact(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? money(rounded) : money(rounded, true);
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

/** Allowed price for work covering `videos` Yapps: $30–5,000 each (a pitch never under $30). */
export function priceLimits(videos = 1) {
  const count = Math.max(1, Math.round(videos));
  return { min: Math.max(PITCH_MIN, PRICE_MIN_PER_YAPP * count), max: PRICE_MAX_PER_YAPP * count };
}

/** Why a price isn't allowed (plain, for an inline message), or null when it is. */
export function priceLimitError(price: number, videos = 1): string | null {
  const { min, max } = priceLimits(videos);
  if (Number.isInteger(price) && price >= min && price <= max) return null;
  return videos > 1
    ? `Whole dollars, ${money(PRICE_MIN_PER_YAPP)}–${num(PRICE_MAX_PER_YAPP)} a video: ${money(min)}–${num(max)} for ${videos}.`
    : `Whole dollars, ${money(min)}–${num(max)}.`;
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
/* Time (relative to the fixed demo clock, displayed in Eastern time)          */
/* -------------------------------------------------------------------------- */

const dateShort = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});
const dateWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const dateLong = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});
const monthYear = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});
const clockTime = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const weekdayOnly = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" });

/** "Nov 7" */
export const shortDate = (iso: string) => dateShort.format(new Date(iso));
/** "Thu, Nov 7" */
export const weekdayDate = (iso: string) => dateWeekday.format(new Date(iso));
/** "November 7, 2026" */
export const longDate = (iso: string) => dateLong.format(new Date(iso));
/** "March 2025" */
export const monthYearOf = (iso: string) => monthYear.format(new Date(iso));
/** "2:30 PM" */
export const timeOf = (iso: string) => clockTime.format(new Date(iso));

/** Whole calendar days between NOW and `iso` in display time (positive = future). */
export function daysFromNow(iso: string): number {
  const day = (ms: number) => Math.floor((ms + TZ_OFFSET) / DAY);
  return day(Date.parse(iso)) - day(NOW);
}

/** "just now", "12 min ago", "3h ago", "Yesterday", "4 days ago", "Nov 7" */
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

/** timeAgo for the middle of a sentence ("Posted yesterday", "Sent 3h ago"). */
export function timeAgoInline(iso: string): string {
  const text = timeAgo(iso);
  return text === "Yesterday" ? "yesterday" : text;
}

/** Message-list stamp: today → "2:30 PM", yesterday → "Yesterday", this week → "Mon", else "Nov 7". */
export function stamp(iso: string): string {
  const days = -daysFromNow(iso);
  if (days <= 0) return timeOf(iso);
  if (days === 1) return "Yesterday";
  if (days < 7) return weekdayOnly.format(new Date(iso));
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

/**
 * Text in curly quotes for display. Text that is already one quotation keeps it, with its own
 * quotes made curly ("'Sixty seconds…'" → “Sixty seconds…”); text that opens with a quote of its own
 * ("'Who's closing tonight?' is how…") is shown as written, so quotes never double up.
 */
export function quoted(text: string): string {
  const t = text.trim();
  const whole = t.match(/^(['"‘“])([\s\S]*)(['"’”])([.?…]?)$/);
  // Whole only if no quote of the same kind closes or opens inside ("'A' and 'B'" isn't one quote).
  const inner = whole && (/['‘]/.test(whole[1]) ? /['‘’]\s|\s['‘’]/ : /["“”]\s|\s["“”]/);
  // Straight double quotes inside become curly single ones, so “…‘like this’…” nests cleanly.
  const nest = (body: string) => body.replace(/"([^"]*)"/g, "‘$1’");
  if (whole && inner && !inner.test(whole[2])) return `“${nest(whole[2])}${whole[4]}”`;
  return /^['"‘“]/.test(t) ? t : `“${nest(t)}”`;
}
