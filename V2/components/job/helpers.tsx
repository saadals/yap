import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clapperboard,
  Eye,
  Gift,
  LifeBuoy,
  Loader2,
  Megaphone,
  Repeat2,
  XCircle,
} from "lucide-react";

import type { BadgeTone } from "@/components/ui/badge";
import type { PillVariant } from "@/components/ui/pill-button";
import { autoApproveAt } from "@/lib/attention";
import { moneyExact, timeAgo } from "@/lib/format";
import { brandHandleFor, commissionTotals, creatorById, requestById, slotPlatform } from "@/lib/selectors";
import type { CommentRefusal, DemoState } from "@/lib/store";
import { campaignPlatformById, usageById } from "@/lib/taxonomy";
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

/** "Usage: paid ads for 12 months, included in the price. Raw footage included." (ad copy: usage only) */
export function includedLine(job: Pick<Job, "commission" | "adCopy">): string {
  const usage = `Usage: ${usageById[job.commission.brief.usage].phrase}, included in the price.`;
  return job.adCopy ? usage : `${usage} Raw footage included.`;
}

/** Whole dollars when the amount is whole, cents otherwise ("$286", "$313.50"). */
export const cash = (amount: number) => moneyExact(amount);

/** "Layla's", "Wayfolks'" */
export const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

export type SheetName =
  | "deliver"
  | "requestChanges"
  | "approve"
  | "decline"
  | "withdraw"
  | "extend"
  | "dispute"
  | "cancel"
  | "reject"
  | "removeCreator";

/** Ids of the forms in the stage panel; the phone bar submits them with `form=`. */
export const FORM = {
  review: "job-review-form",
  learnings: "job-learnings-form",
  feedback: "job-feedback-form",
  post: "job-post-form",
} as const;

/** A campaign slot's terms, resolved once (the campaign may be missing in odd demo states). */
export type SlotContext = {
  request?: ContentRequest;
  terms?: CampaignTerms;
  /** The one platform this creator posts on (chosen when they picked the slot). */
  platform: CampaignPlatformId;
  /** "TikTok" */
  platformName: string;
  /** The paid-partnership setting to turn on, in the platform's words. */
  disclosure: string;
  /** "@daftar.app": the brand's handle on that platform. */
  brandHandle: string;
  /** The creator's own connected account on that platform. */
  social?: SocialAccount;
};

export function slotContext(s: DemoState, commission: Commission): SlotContext {
  const request = commission.requestId ? requestById(s, commission.requestId) : undefined;
  const terms = request?.campaign;
  const platformId = slotPlatform(commission, request);
  const platform = campaignPlatformById[platformId];
  const creator = creatorById(s, commission.creatorId);
  return {
    request,
    terms,
    platform: platformId,
    platformName: platform?.name ?? "the campaign's platform",
    disclosure: platform?.disclosure ?? "Paid partnership label",
    brandHandle: terms ? brandHandleFor(terms, platformId) : "the brand account",
    social: creator?.socials?.find((a) => a.platform === platformId),
  };
}

/** Everything the job's pieces need, derived once per render of the page. */
export type Job = {
  commission: Commission;
  /** The viewer's side: "business" ordered it, "creator" is making it. */
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
  /** The version shown in the stage panel (the latest unless one was picked). */
  selected?: Delivery;
  /** Set for UGC campaign slots. */
  slot?: SlotContext;
  /** Ad copy writing: text deliveries, general comments only, no player, no posting. */
  adCopy: boolean;
  /** "version" or "review copy" */
  noun: string;
  /**
   * Comments and replies that were unread for this side when the job opened (plus any that arrive
   * while it's open): kept for the visit, so the "New" marks survive marking everything read.
   */
  fresh: ReadonlySet<string>;
  /** Versions looked at on this visit (a version chip loses its dot once opened). */
  viewed: ReadonlySet<string>;
  /** A request to open one comment (from `?comment=`, a timeline line or a notification). */
  focus?: CommentFocus;
  openSheet: (name: SheetName) => void;
  /** Scroll to the composer and focus it. */
  focusComposer: () => void;
  /** Show a version in the stage panel (from the timeline or the version switcher). */
  pickVersion: (deliveryId: string | null) => void;
  /** Show a version's comments, optionally opening one comment. */
  showComments: (deliveryId: string, commentId?: string) => void;
};

/** Open the comments of one version and highlight one comment; a new `key` repeats the request. */
export type CommentFocus = { deliveryId: string; commentId?: string; key: number };

/** The single next step for the viewer: the header (desktop), the sticky strip and the phone bar show it. */
export type NextAction = {
  label: string;
  /** A shorter label for the phone bar only ("Approve · $300"); the full label becomes its aria-label. */
  short?: string;
  variant: PillVariant;
  icon?: React.ReactNode;
  arrow?: boolean;
  run?: () => void;
  href?: string;
  /** Submits a form in the stage panel. The form shows its own button on desktop; the phone bar submits it. */
  form?: string;
  /** An outline button before the primary (header, strip and phone bar), so one green holds. */
  secondary?: { label: string; short?: string; run?: () => void; href?: string };
  /** A waiting state: one line beside the (quiet) button on phones. */
  waiting?: string;
};

export const versionStatus: Record<Delivery["status"], { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
  in_review: { label: "In review", tone: "neutral", icon: <Eye size={14} aria-hidden /> },
  changes_requested: { label: "Changes requested", tone: "neutral", icon: <Repeat2 size={14} aria-hidden /> },
  approved: { label: "Approved", tone: "success", icon: <CheckCircle2 size={14} aria-hidden /> },
  rejected: { label: "Not approved", tone: "danger", icon: <XCircle size={14} aria-hidden /> },
};

const i = 14;

/**
 * The status chip, worded for the viewer's side. The side that has to act sees "needs attention"
 * (warning); the other side sees "waiting" (neutral). Campaign slots have their own words.
 */
export function jobStatus(c: Commission, side: Role): { label: string; tone: BadgeTone; icon: React.ReactNode } {
  const creator = side === "creator";
  if (c.source === "campaign") {
    switch (c.status) {
      case "in_progress":
        return creator
          ? { label: "Review copy due", tone: "warning", icon: <Clapperboard size={i} aria-hidden /> }
          : { label: "Filming", tone: "active", icon: <Clapperboard size={i} aria-hidden /> };
      case "delivered":
        return creator
          ? { label: "In review", tone: "neutral", icon: <Eye size={i} aria-hidden /> }
          : { label: "Review copy ready", tone: "warning", icon: <Eye size={i} aria-hidden /> };
      case "revision":
        return creator
          ? { label: "Changes requested", tone: "warning", icon: <Repeat2 size={i} aria-hidden /> }
          : { label: "Making changes", tone: "active", icon: <Repeat2 size={i} aria-hidden /> };
      case "completed":
        if (c.payment.status === "released") return { label: "Posted and paid", tone: "success", icon: <BadgeCheck size={i} aria-hidden /> };
        if (c.post?.status === "live") return { label: "Posted", tone: "success", icon: <BadgeCheck size={i} aria-hidden /> };
        if (c.post?.status === "checking") return { label: "Checking post", tone: "neutral", icon: <Loader2 size={i} aria-hidden /> };
        if (c.post?.status === "removed")
          return { label: "Post taken down", tone: creator ? "warning" : "danger", icon: <AlertTriangle size={i} aria-hidden /> };
        return creator
          ? { label: "Approved, post it", tone: "warning", icon: <Megaphone size={i} aria-hidden /> }
          : { label: "Approved, post due", tone: "active", icon: <Megaphone size={i} aria-hidden /> };
      case "cancelled":
        if (c.cancelCode === "video_rejected") return { label: "Not approved", tone: "danger", icon: <XCircle size={i} aria-hidden /> };
        if (c.cancelCode === "campaign_closed") return { label: "Campaign closed", tone: "danger", icon: <Ban size={i} aria-hidden /> };
        if (c.cancelCode === "post_removed") return { label: "Post stayed down", tone: "danger", icon: <AlertTriangle size={i} aria-hidden /> };
        return { label: "Removed", tone: "danger", icon: <Ban size={i} aria-hidden /> };
      default:
        break;
    }
  }
  switch (c.status) {
    case "offered":
      return creator
        ? { label: "New offer", tone: "warning", icon: <Gift size={i} aria-hidden /> }
        : { label: "Offer sent", tone: "neutral", icon: <Gift size={i} aria-hidden /> };
    case "in_progress":
      return { label: creator ? "To deliver" : "In production", tone: "active", icon: <CircleDashed size={i} aria-hidden /> };
    case "delivered":
      return creator
        ? { label: "In review", tone: "neutral", icon: <Eye size={i} aria-hidden /> }
        : { label: "Ready for review", tone: "warning", icon: <Eye size={i} aria-hidden /> };
    case "revision":
      return creator
        ? { label: "Changes requested", tone: "warning", icon: <Repeat2 size={i} aria-hidden /> }
        : { label: "Making changes", tone: "active", icon: <Repeat2 size={i} aria-hidden /> };
    case "completed":
      return { label: creator ? "Paid" : "Approved and paid", tone: "success", icon: <CheckCircle2 size={i} aria-hidden /> };
    case "declined":
      return { label: "Declined", tone: "danger", icon: <XCircle size={i} aria-hidden /> };
    case "cancelled":
      return { label: "Cancelled", tone: "danger", icon: <Ban size={i} aria-hidden /> };
    case "disputed":
      return { label: "In resolution", tone: "danger", icon: <LifeBuoy size={i} aria-hidden /> };
  }
}

/** Payment state in a few words, from the viewer's side. */
export function paymentWords(status: PaymentStatus, side: Role): string {
  switch (status) {
    case "authorized":
      return "Authorized";
    case "held":
      return "Held safely";
    case "pending":
      return side === "business" ? "Approved, still held" : "Pending";
    case "released":
      return side === "business" ? "Released" : "Paid to you";
    case "refunded":
      return "Refunded";
    case "returned":
      return side === "business" ? "Back in your campaign" : "Back with the campaign";
  }
}

/** When the latest delivery approves itself (seed may omit it; falls back to delivery + 3 days). */
export const autoApproveDate = (c: Commission) => (c.status === "delivered" ? autoApproveAt(c) : undefined);

/** The brand's own comments across all versions, unique and not deleted (suggested learnings). */
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

export const revisionsLeft = (c: Commission) => Math.max(0, c.revisionsIncluded - c.revisionsUsed);

/** Ids of comments and replies this side hasn't seen yet, across every version. */
export function unreadIds(deliveries: Delivery[], side: Role): string[] {
  const out: string[] = [];
  for (const d of deliveries) {
    for (const m of d.comments) {
      if (m.unread && m.author !== side && !m.deletedAt) out.push(m.id);
      for (const r of m.replies) if (r.unread && r.author !== side && !r.deletedAt) out.push(r.id);
    }
  }
  return out;
}

/** The store's reason for refusing a comment change, in plain words for a toast. */
export function commentError(reason: CommentRefusal): string {
  switch (reason) {
    case "closed":
      return "Comments on this job are closed. They stay readable.";
    case "not_party":
      return "Only the brand and the creator on this job can comment.";
    case "not_found":
      return "That comment isn't there any more.";
    case "not_author":
      return "You can only change your own comments.";
    case "not_latest":
      return "Comments can only be changed on the latest version.";
    case "too_short":
      return "Write a comment first.";
    case "general_only":
      return "Comments on ad copy are general, without a time.";
    case "not_allowed":
      return "Only the brand can re-open a comment.";
  }
}

/** "Video", "Subtitles"…: the kind of a delivered file, from its name. */
export function deliveryFileKind(name: string): NonNullable<Delivery["files"][number]["kind"]> {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["srt", "vtt"].includes(ext)) return "subtitles";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "image";
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return "document";
  return "video";
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

/** Scroll an element into view, honouring reduced motion. */
export function reveal(el: Element | null | undefined, block: ScrollLogicalPosition = "start") {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
}
