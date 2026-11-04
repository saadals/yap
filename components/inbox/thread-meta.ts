import { businessById, creatorById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import type { Business, Creator, Message, Role, Thread } from "@/lib/types";

export type Counterpart =
  | { kind: "creator"; name: string; creator?: Creator }
  | { kind: "business"; name: string; business?: Business };

/** The person or company on the other side of a thread, from `role`'s point of view. */
export function counterpart(s: DemoState, thread: Thread, role: Role): Counterpart {
  if (role === "business") {
    const creator = creatorById(s, thread.creatorId);
    return { kind: "creator", name: creator?.name ?? "Creator", creator };
  }
  const business = businessById(s, thread.businessId);
  return { kind: "business", name: business?.name ?? "Client", business };
}

export const lastMessage = (thread: Thread): Message | undefined =>
  thread.messages[thread.messages.length - 1];

/** One-line preview of a message for the thread list. */
export function previewText(message: Message | undefined, role: Role): string {
  if (!message) return "No messages yet";
  const body =
    message.text.trim() ||
    (message.attachment
      ? message.attachment.kind === "video"
        ? `Sent a video: ${message.attachment.name}`
        : `Sent ${message.attachment.name}`
      : "");
  if (message.from === role) return `You: ${body}`;
  return body;
}

export type ThreadFilter = "all" | "unread";

export function matchesFilter(thread: Thread, filter: ThreadFilter, role: Role): boolean {
  return filter === "unread" ? thread.unread.includes(role) : true;
}

export function matchesQuery(s: DemoState, thread: Thread, role: Role, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const other = counterpart(s, thread, role);
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
