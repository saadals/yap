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
  MessageSquareText,
  Repeat2,
  Send,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { notificationsFor } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { NotificationKind } from "@/lib/types";

const icons: Record<NotificationKind, React.ReactNode> = {
  pitch: <Send size={17} aria-hidden className="y-flip" />,
  comment: <MessageSquareText size={17} aria-hidden />,
  delivery: <Film size={17} aria-hidden />,
  message: <MessageCircle size={17} aria-hidden />,
  offer: <Gift size={17} aria-hidden />,
  payment: <Banknote size={17} aria-hidden />,
  review: <Star size={17} aria-hidden />,
  request: <FilePlus2 size={17} aria-hidden />,
  revision: <Repeat2 size={17} aria-hidden />,
  campaign: <Megaphone size={17} aria-hidden />,
  system: <Bell size={17} aria-hidden />,
};

/**
 * The alerts list as rows (icon, text, time, unread dot) with "Mark all as read": the Inbox's
 * Alerts tab, the one place for alerts on every screen size (the header has no bell). `card` puts
 * the rows in one white card (a page); without it they sit straight in the surrounding container.
 */
export function NotificationList({ onNavigate, card = false }: { onNavigate?: () => void; card?: boolean }) {
  const s = useDemo();
  const router = useRouter();
  const items = notificationsFor(s);
  const unread = items.filter((n) => n.unread).length;

  if (items.length === 0) {
    const empty = (
      <EmptyState
        title="Nothing yet"
        body="Orders, deliveries, comments and payments will show up here."
        icon={<Bell size={22} />}
        headingLevel={3}
      />
    );
    return card ? <Block tone="paper">{empty}</Block> : empty;
  }

  const rows = (
    <ul className="flex flex-col" aria-label="Alerts">
      {items.map((note, index) => (
        <li key={note.id} className={index > 0 ? "border-t border-(--y-line)" : ""}>
          <button
            type="button"
            onClick={() => {
              actions.markNotificationRead(note.id);
              onNavigate?.();
              router.push(note.href);
            }}
            className={`flex w-full items-start gap-3 text-start transition-colors duration-(--y-dur-1) hover:bg-(--y-mist) ${
              card ? "min-h-16 px-4 py-3.5 md:px-5" : "-mx-2 min-h-14 w-[calc(100%+16px)] rounded-(--y-r-sm) px-2 py-3"
            }`}
          >
            <span
              aria-hidden
              className={`grid size-9 flex-none place-items-center rounded-full ${
                note.unread ? "bg-(--y-ink) text-(--y-paper)" : "bg-(--y-mist)"
              }`}
            >
              {icons[note.kind]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <span className={`y-small ${note.unread ? "font-semibold" : ""}`}>{note.text}</span>
              <span className="y-micro y-fg-2">
                {note.unread ? <span className="sr-only">Unread, </span> : null}
                {timeAgo(note.at)}
              </span>
            </span>
            {note.unread ? <span aria-hidden className="mt-2 size-2 flex-none rounded-full bg-(--y-ink)" /> : null}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-2">
      {unread ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => actions.markAllNotificationsRead()}
            className="y-pill"
            data-variant="ghost"
            data-size="sm"
          >
            <CheckCheck size={16} aria-hidden />
            Mark all as read
          </button>
        </div>
      ) : null}
      {card ? (
        <Block tone="paper" pad="none" className="overflow-hidden">
          {rows}
        </Block>
      ) : (
        rows
      )}
    </div>
  );
}
