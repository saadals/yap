import { businessById, creatorById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
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

export const lastMessage = (thread: Thread): Message | undefined =>
  thread.messages[thread.messages.length - 1];

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

export type ThreadFilter = "all" | "unread";

export function matchesFilter(thread: Thread, filter: ThreadFilter, side: Role): boolean {
  return filter === "unread" ? thread.unread.includes(side) : true;
}

export function matchesQuery(s: DemoState, thread: Thread, side: Role, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const other = counterpart(s, thread, side);
  if (other.name.toLowerCase().includes(q)) return true;
  if (other.kind === "creator" && other.creator?.handle.toLowerCase().includes(q.replace(/^@/, "")))
    return true;
  if (thread.subject.toLowerCase().includes(q)) return true;
  return thread.messages.some(
    (message) =>
      message.text.toLowerCase().includes(q) ||
      message.attachment?.name.toLowerCase().includes(q),
  );
}
