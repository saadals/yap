import type { ReactNode } from "react";

import type { StatusLook } from "@/components/ui/tags";
import { addDays, NOW } from "@/lib/clock";
import { moneyExact, plural, shortDate, timeAgo, timeOf, weekdayDate } from "@/lib/format";
import type { commissionTotals } from "@/lib/selectors";
import { nicheById } from "@/lib/taxonomy";
import type {
  Business,
  CampaignPlatformId,
  CampaignTerms,
  Commission,
  ContentRequest,
  Creator,
  Delivery,
  PaymentStatus,
  Product,
  Role,
  SocialAccount,
} from "@/lib/types";

/** Whole dollars when the amount is whole, cents otherwise ("$286", "$313.50"). */
export const cash = (amount: number) => moneyExact(amount);

export type SheetName =
  | "deliver"
  | "review"
  | "requestChanges"
  | "approve"
  | "decline"
  | "withdraw"
  | "extend"
  | "report"
  | "cancel"
  | "clientFeedback"
  | "reject"
  | "removeCreator"
  | "postLink";

/** The order page's tabs, in their order (Work spec 6.8.4): Activity first and open by default. */
export type TabId = "activity" | "messages" | "brief" | "files";
export const TAB_IDS: TabId[] = ["activity", "messages", "brief", "files"];

/** A plain confirmation after an action (no illustration; round 3 answers, item 15). */
export type Confirmation = {
  title: string;
  body: ReactNode;
  /** The full-width primary; defaults to "Done", which closes. */
  primary?: { label: string; onClick?: () => void };
  link?: { label: string; onClick?: () => void; href?: string };
};

/** A campaign slot's terms, resolved once (the campaign may be missing in odd demo states). */
export type SlotContext = {
  request?: ContentRequest;
  terms?: CampaignTerms;
  /** The platform this creator posts on (picked with the slot). */
  platform: CampaignPlatformId;
  /** "TikTok" */
  platformName: string;
  /** The paid-partnership setting to turn on, in the platform's words. */
  disclosure: string;
  /** "@daftar.app" */
  brandHandle: string;
  /** The creator's own connected account on the campaign's platform. */
  social?: SocialAccount;
};

/** Everything the order page's pieces need, derived once per render. */
export type Workspace = {
  commission: Commission;
  /** The viewer's side of this deal: "business" ordered it, "creator" is making it. */
  side: Role;
  creator?: Creator;
  business?: Business;
  product?: Product;
  totals: ReturnType<typeof commissionTotals>;
  /** "Layla" / "the creator" */
  creatorName: string;
  /** "Daftar" / "the client" */
  businessName: string;
  /** The other side's short name from the viewer's point of view. */
  otherName: string;
  latest?: Delivery;
  /** Set for UGC campaign slots (`commission.source === "campaign"`). */
  slot?: SlotContext;
  /** Ad copy writing: a text delivery, general comments only, nothing about video. */
  adCopy: boolean;
  openSheet: (name: SheetName) => void;
  confirm: (confirmation: Confirmation) => void;
  goToMessages: () => void;
  showTab: (tab: TabId) => void;
  /** Bring the Deliveries card into view (optionally on one version). */
  showDeliveries: (deliveryId?: string) => void;
};

export const revisionsLeft = (commission: Commission) =>
  Math.max(0, commission.revisionsIncluded - commission.revisionsUsed);

/** "1 of 2 used", or "3 used (1 extra)" once past the included ones. */
export function revisionsLine(commission: Commission): string {
  const { revisionsUsed: used, revisionsIncluded: included } = commission;
  return used > included
    ? `${used} used (${plural(used - included, "extra")})`
    : `${used} of ${included} used`;
}

/** When the latest delivery auto-approves (seed may omit it; fall back to delivery + 3 days). */
export function autoApproveDate(commission: Commission, latest?: Delivery): string | undefined {
  if (commission.autoApproveAt) return commission.autoApproveAt;
  return latest ? addDays(latest.deliveredAt, 3) : undefined;
}

/** "2 days left", "1 day left", "Today": the countdown beside the auto-approval date. */
export function daysLeftLabel(iso: string): string {
  const days = Math.ceil((Date.parse(iso) - NOW) / 86_400_000);
  if (days <= 0) return "today";
  return `${plural(days, "day")} left`;
}

/** Share of the review window already gone (0 to 1), for the countdown track. */
export function reviewElapsed(commission: Commission, latest?: Delivery): number | undefined {
  const auto = autoApproveDate(commission, latest);
  if (!auto || !latest) return undefined;
  const start = Date.parse(latest.deliveredAt);
  const end = Date.parse(auto);
  if (end <= start) return 1;
  return Math.max(0, Math.min(1, (NOW - start) / (end - start)));
}

/** Payment state in a few words, from the viewer's side. */
export function paymentWords(status: PaymentStatus, side: Role): string {
  switch (status) {
    case "authorized":
      return "Authorized";
    case "held":
      return "Held";
    case "pending":
      // Approved campaign work: still held until 7 days after the post is verified.
      return side === "business" ? "Approved, still held" : "Pending";
    case "released":
      return side === "business" ? "Paid" : "Released";
    case "refunded":
      return "Refunded";
    case "returned":
      return side === "business" ? "Back in your campaign" : "Back with the campaign";
  }
}

/** Unique, non-empty comment texts across all versions (used to suggest learnings). */
export function suggestedLearnings(commission: Commission): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const delivery of commission.deliveries) {
    for (const comment of delivery.comments) {
      if (comment.deletedAt || comment.author !== "business") continue;
      const text = comment.text.trim();
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
  }
  return out;
}

/** Approximate file size label from bytes. */
export function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** timeAgo for mid-sentence use: "yesterday", "3h ago", "on Nov 7". */
export function ago(iso: string): string {
  const text = timeAgo(iso);
  if (text === "Yesterday") return "yesterday";
  if (/^[A-Z][a-z]{2} \d{1,2}$/.test(text)) return `on ${text}`;
  return text;
}

/** "2h ago" today, otherwise "Wed, Nov 4 · 6:20 PM": the activity timeline's second line. */
export function whenLabel(iso: string): string {
  const text = timeAgo(iso);
  if (/ago$|^just now$/.test(text)) return text;
  return `${weekdayDate(iso)} · ${timeOf(iso)}`;
}

/** When the order was cancelled (its event), or undefined. */
export function cancelledAt(commission: Commission): string | undefined {
  const event = [...commission.events].reverse().find((e) => e.kind === "cancelled" || e.kind === "offer_declined" || e.kind === "creator_replaced" || e.kind === "video_rejected");
  return event?.at;
}

/** The category the order is in: the product's niche, else the brand's. */
export function categoryOf(ws: Pick<Workspace, "product" | "business">): string | undefined {
  const niche = ws.product?.niche ?? ws.business?.industry;
  return niche ? nicheById[niche]?.name : undefined;
}

/* -------------------------------------------------------------------------- */
/* Status chip and stages                                                      */
/* -------------------------------------------------------------------------- */

export type OrderStatus = { look: StatusLook; label: string };

/**
 * The header's status chip (Work spec 6.4.6, Site-wide 5.4.3): the side that has to act sees
 * "needs attention". Versioned where it helps ("Revision · v2", "In review · v1").
 */
export function orderStatus(ws: Pick<Workspace, "commission" | "side" | "slot">): OrderStatus {
  const { commission: c, side, slot } = ws;
  const next = c.deliveries.length + 1;
  const latest = c.deliveries[c.deliveries.length - 1];
  const v = latest?.version ?? 1;
  if (slot) {
    switch (c.status) {
      case "in_progress":
        return side === "creator" ? { look: "moving", label: "Picked · film it" } : { look: "waiting", label: "Filming" };
      case "delivered":
        return side === "business" ? { look: "attention", label: "Ready to review" } : { look: "waiting", label: `In review · v${v}` };
      case "revision":
        return side === "creator" ? { look: "attention", label: `Changes · v${next}` } : { look: "moving", label: `Revision · v${next}` };
      case "completed":
        if (c.post?.status === "checking") return { look: "waiting", label: "Checking post" };
        if (c.post?.status === "removed") return { look: "negative", label: "Post taken down" };
        if (c.post?.status === "live")
          return c.payment.status === "released"
            ? { look: "done", label: "Paid" }
            : { look: "done", label: "Live · pending pay" };
        return side === "creator" ? { look: "attention", label: "Post due" } : { look: "moving", label: "Approved · post due" };
      case "cancelled":
        if (c.cancelCode === "video_rejected") return { look: "negative", label: "Not approved" };
        if (c.cancelCode === "campaign_closed") return { look: "negative", label: "Campaign closed" };
        if (c.cancelCode === "post_removed") return { look: "negative", label: "Post stayed down" };
        return { look: "negative", label: "Removed" };
      case "disputed":
        return { look: "negative", label: "With Yapp support" };
      default:
        break;
    }
  }
  switch (c.status) {
    case "offered":
      return side === "creator" ? { look: "attention", label: "New offer" } : { look: "waiting", label: "Offer sent" };
    case "in_progress":
      return { look: "moving", label: "In progress" };
    case "delivered":
      return side === "business" ? { look: "attention", label: "Ready to review" } : { look: "waiting", label: `In review · v${v}` };
    case "revision":
      return side === "creator" ? { look: "attention", label: `Revision · v${next}` } : { look: "moving", label: `Revision · v${next}` };
    case "completed":
      return { look: "done", label: "Completed" };
    case "declined":
      return { look: "negative", label: "Declined" };
    case "cancelled":
      return { look: "negative", label: "Cancelled" };
    case "disputed":
      return { look: "negative", label: "With Yapp support" };
  }
}

export const CUSTOM_STAGES = ["Hired", "In progress", "Delivered", "Approved", "Paid"];
export const SLOT_STAGES = ["Picked", "Upload", "Review", "Post", "Paid"];

/**
 * Where the order is on its five bars (Work spec 6.8.2, 6.9). Undefined when it ended without
 * finishing (cancelled, declined): the status chip and the next step say it.
 */
export function orderStages(ws: Pick<Workspace, "commission" | "slot">): { stages: string[]; current: number } | undefined {
  const { commission: c, slot } = ws;
  const latest = c.deliveries[c.deliveries.length - 1];
  const inReview = latest?.status === "in_review";
  if (c.status === "cancelled" || c.status === "declined") return undefined;
  if (slot) {
    const current =
      c.status === "in_progress" || c.status === "revision"
        ? 1
        : c.status === "delivered"
          ? 2
          : c.status === "disputed"
            ? inReview
              ? 2
              : 1
            : c.post?.status === "live"
              ? c.payment.status === "released"
                ? 5
                : 4
              : 3;
    return { stages: SLOT_STAGES, current };
  }
  const current =
    c.status === "offered"
      ? 0
      : c.status === "in_progress" || c.status === "revision"
        ? 1
        : c.status === "delivered"
          ? 2
          : c.status === "disputed"
            ? inReview
              ? 2
              : 1
            : 5;
  return { stages: CUSTOM_STAGES, current };
}

/** How one version reads on its tab, from the viewer's side. */
export function versionLabel(delivery: Delivery, side: Role): string {
  switch (delivery.status) {
    case "in_review":
      return side === "business" ? "Ready to review" : "In review";
    case "changes_requested":
      return "Changes requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Not approved";
  }
}

/** "smooth", or "auto" when the viewer asked for reduced motion. */
export const scrollMotion = (): ScrollBehavior =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** "Nov 4", for file and version lines. */
export const day = (iso: string) => shortDate(iso);
