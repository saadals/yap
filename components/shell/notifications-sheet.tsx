"use client";

import {
  Banknote,
  Bell,
  CheckCheck,
  FilePlus2,
  Film,
  Gift,
  Megaphone,
  MessageCircle,
  Repeat2,
  Send,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { timeAgo } from "@/lib/format";
import { notificationsFor } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { NotificationKind } from "@/lib/types";

const icons: Record<NotificationKind, React.ReactNode> = {
  pitch: <Send size={18} aria-hidden className="y-flip" />,
  delivery: <Film size={18} aria-hidden />,
  message: <MessageCircle size={18} aria-hidden />,
  offer: <Gift size={18} aria-hidden />,
  payment: <Banknote size={18} aria-hidden />,
  review: <Star size={18} aria-hidden />,
  request: <FilePlus2 size={18} aria-hidden />,
  revision: <Repeat2 size={18} aria-hidden />,
  campaign: <Megaphone size={18} aria-hidden />,
  system: <Bell size={18} aria-hidden />,
};

export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useDemo();
  const router = useRouter();
  const items = notificationsFor(s);
  const unread = items.filter((n) => n.unread).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Notifications"
      description={unread ? `${unread} unread` : "You're all caught up"}
      width="sm"
    >
      {unread ? (
        <button
          type="button"
          onClick={() => actions.markAllNotificationsRead()}
          className="y-pill mb-3"
          data-variant="soft"
          data-size="sm"
        >
          <CheckCheck size={16} aria-hidden />
          Mark all as read
        </button>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          body="Orders, deliveries and payments will show up here."
          shape="ball"
          tint="sea"
          headingLevel={3}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => {
                  actions.markNotificationRead(note.id);
                  onClose();
                  router.push(note.href);
                }}
                className="y-tile y-hoverable flex w-full items-start gap-3 p-3 text-start"
              >
                <span
                  aria-hidden
                  className={`grid size-10 flex-none place-items-center rounded-full ${
                    note.unread ? "bg-(--y-ink) text-(--y-paper)" : "bg-(--b-bg)"
                  }`}
                >
                  {icons[note.kind]}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`y-small ${note.unread ? "font-semibold" : ""}`}>{note.text}</span>
                  <span className="y-micro y-fg-3">
                    {note.unread ? "Unread · " : ""}
                    {timeAgo(note.at)}
                  </span>
                </span>
                {note.unread ? (
                  <span aria-hidden className="mt-2 size-2.5 flex-none rounded-full bg-(--y-neon) shadow-[0_0_0_2px_var(--y-ink)]" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
