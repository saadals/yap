import { CheckCircle2, Eye, Repeat2, XCircle } from "lucide-react";

import type { BadgeTone } from "@/components/ui/badge";
import { addDays } from "@/lib/clock";
import { moneyExact, timeAgo } from "@/lib/format";
import type { commissionTotals } from "@/lib/selectors";
import type {
  Business,
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
  | "celebrate"
  | "decline"
  | "withdraw"
  | "extend"
  | "report"
  | "cancel"
  | "clientFeedback"
  | "reject"
  | "removeCreator";

export type TabId = "messages" | "brief" | "activity" | "files";

/** A campaign slot's terms, resolved once (the campaign may be missing in odd demo states). */
export type SlotContext = {
  request?: ContentRequest;
  terms?: CampaignTerms;
  /** "TikTok" */
  platformName: string;
  /** The paid-partnership setting to turn on, in the platform's words. */
  disclosure: string;
  /** "@daftar.app" */
  brandHandle: string;
  /** The creator's own connected account on the campaign's platform. */
  social?: SocialAccount;
};

/** Everything the workspace pieces need, derived once per render. */
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
  openSheet: (name: SheetName) => void;
  goToMessages: () => void;
  showTab: (tab: TabId) => void;
};

export const versionStatus: Record<
  Delivery["status"],
  { label: string; tone: BadgeTone; icon: React.ReactNode }
> = {
  in_review: { label: "In review", tone: "neutral", icon: <Eye size={14} aria-hidden /> },
  changes_requested: {
    label: "Changes requested",
    tone: "warning",
    icon: <Repeat2 size={14} aria-hidden />,
  },
  approved: { label: "Approved", tone: "success", icon: <CheckCircle2 size={14} aria-hidden /> },
  rejected: { label: "Not approved", tone: "danger", icon: <XCircle size={14} aria-hidden /> },
};

/** Payment state in a few words, from the viewer's side. */
export function paymentWords(status: PaymentStatus, side: Role): string {
  switch (status) {
    case "authorized":
      return "Authorized";
    case "held":
      return "Held safely";
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

/** When the latest delivery auto-approves (seed may omit it; fall back to delivery + 3 days). */
export function autoApproveDate(commission: Commission, latest?: Delivery): string | undefined {
  if (commission.autoApproveAt) return commission.autoApproveAt;
  return latest ? addDays(latest.deliveredAt, 3) : undefined;
}

/** Unique, non-empty comment texts across all versions (used to suggest learnings). */
export function suggestedLearnings(commission: Commission): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const delivery of commission.deliveries) {
    for (const comment of delivery.comments) {
      const text = comment.text.trim();
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
  }
  return out;
}

export const revisionsLeft = (commission: Commission) =>
  Math.max(0, commission.revisionsIncluded - commission.revisionsUsed);

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
