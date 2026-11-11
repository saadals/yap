import { slotStatus } from "@/components/domain/status-badge";
import { paths } from "@/lib/paths";
import { businessById, commissionById, creatorById, isCampaign, requestById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { commissionStatus, formatById, pitchStatus, requestStatus } from "@/lib/taxonomy";
import type { Business, Creator, Message, Role, Thread } from "@/lib/types";

export type Counterpart =
  | { kind: "creator"; name: string; creator?: Creator }
  | { kind: "business"; name: string; business?: Business };

/** A conversation and the side the signed-in account is on in it. */
export type ThreadItem = { thread: Thread; side: Role };

/** "You ordered" / "You're making": which side of the deal a conversation is on. */
export const sideLabel = (side: Role) => (side === "business" ? "You ordered" : "You're making");

/** The person or company on the other side of a thread, from `side`'s point of view. */
export function counterpart(s: DemoState, thread: Thread, side: Role): Counterpart {
  if (side === "business") {
    const creator = creatorById(s, thread.creatorId);
    return { kind: "creator", name: creator?.name ?? "Creator", creator };
  }
  const business = businessById(s, thread.businessId);
  return { kind: "business", name: business?.name ?? "Client", business };
}

export const lastMessage = (thread: Thread): Message | undefined => thread.messages[thread.messages.length - 1];

/** One-line preview of a message for the thread list. */
export function previewText(message: Message | undefined, side: Role): string {
  if (!message) return "No messages yet";
  const body =
    message.text.trim() ||
    (message.attachment
      ? message.attachment.kind === "video"
        ? `Sent a video: ${message.attachment.name}`
        : `Sent ${message.attachment.name}`
      : "");
  if (message.from === side) return `You: ${body}`;
  return body;
}

/** Inbox filters: everything, unread, or one side of the account (people who order and make). */
export type ThreadFilter = "all" | "unread" | "order" | "studio";

export function matchesFilter(thread: Thread, filter: ThreadFilter, side: Role): boolean {
  if (filter === "unread") return thread.unread.includes(side);
  if (filter === "order") return side === "business";
  if (filter === "studio") return side === "creator";
  return true;
}

/** What a conversation is about: the job or the order it belongs to, with its status and a link. */
export type ThreadContext = {
  href: string;
  /** "App demo", or "UGC campaign". */
  kind: string;
  /** The order's title: the job's or the custom order's, the campaign's for a slot. Rows lead with it. */
  title: string;
  status: string;
  /** "Open job" / "Open order". */
  linkLabel: string;
};

export function threadContext(s: DemoState, side: Role, thread: Thread): ThreadContext | null {
  const commission = thread.commissionId ? commissionById(s, thread.commissionId) : undefined;
  if (commission) {
    const campaign = commission.source === "campaign" && commission.requestId ? requestById(s, commission.requestId) : undefined;
    return {
      href: paths.job(commission.id),
      kind: commission.source === "campaign" ? "UGC campaign" : (formatById[commission.brief.format]?.name ?? "Video"),
      title: campaign?.title ?? commission.title,
      status:
        commission.source === "campaign"
          ? slotStatus(commission, side).label
          : commission.status === "offered" && side === "creator"
            ? "New offer"
            : commissionStatus[commission.status].label,
      linkLabel: "Open job",
    };
  }
  const request = thread.requestId ? requestById(s, thread.requestId) : undefined;
  if (!request) return null;
  const pitch = s.pitches.find(
    (p) => p.requestId === request.id && p.creatorId === thread.creatorId && p.status !== "withdrawn",
  );
  const requestLabel = isCampaign(request)
    ? request.status === "open"
      ? "Taking creators"
      : request.status === "hired"
        ? "Full"
        : requestStatus[request.status].label
    : requestStatus[request.status].label;
  return {
    href: paths.order(request.id),
    kind: isCampaign(request) ? "UGC campaign" : (formatById[request.brief.format]?.name ?? "Brief"),
    title: request.title,
    status: pitch ? `Pitch ${pitchStatus[pitch.status].label.toLowerCase()}` : requestLabel,
    linkLabel: "Open order",
  };
}

/**
 * What a thread row and the conversation header say a conversation is about, title first: the
 * order's title, then its kind ("App demo", "UGC campaign"), left out when the title already starts
 * with it ("App demo: invoice on WhatsApp…"). Threads without an order fall back to their subject.
 */
export function threadAbout(context: ThreadContext | null, thread: Thread): { title: string; kind?: string } {
  const title = context?.title ?? thread.subject;
  const kind = context?.kind;
  if (!kind || title.toLowerCase().startsWith(kind.toLowerCase())) return { title };
  return { title, kind };
}
