"use client";

import {
  Bell,
  Clapperboard,
  FileText,
  Gift,
  type LucideIcon,
  MessageCircle,
  Repeat2,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { timeAgo } from "@/lib/format";
import { notificationsFor } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { NotificationKind } from "@/lib/types";

export const notificationIcons: Record<NotificationKind, LucideIcon> = {
  pitch: Send,
  delivery: Clapperboard,
  message: MessageCircle,
  offer: Gift,
  payment: ShieldCheck,
  review: Star,
  request: FileText,
  revision: Repeat2,
  system: Bell,
};

/** Latest business notifications as a feed. Opening one marks it read. */
export function ActivityFeed({ className = "", limit = 6 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const all = notificationsFor(s, "business");
  const items = all.slice(0, limit);
  const unread = all.filter((n) => n.unread).length;

  return (
    <Block as="section" aria-labelledby="activity-title" tone="paper" pad="md" className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="activity-title" className="y-display y-title">
          Activity
        </h2>
        {unread ? (
          <PillButton variant="ghost" size="sm" onClick={() => actions.markAllNotificationsRead("business")}>
            Mark {unread} as read
          </PillButton>
        ) : (
          <span className="y-micro y-fg-2">All caught up</span>
        )}
      </div>
      {items.length ? (
        <ol className="flex flex-col">
          {items.map((item, index) => {
            const Icon = notificationIcons[item.kind];
            return (
              <li key={item.id} className={index ? "border-t border-(--b-line)" : ""}>
                <Link
                  href={item.href}
                  onClick={() => {
                    if (item.unread) actions.markNotificationRead(item.id);
                  }}
                  className="-mx-2 flex items-start gap-3 rounded-(--y-r-tile) px-2 py-3 transition-colors hover:bg-(--b-chip)"
                >
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-(--b-chip)" aria-hidden>
                    <Icon size={18} className={item.kind === "pitch" ? "y-flip" : ""} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`y-small block ${item.unread ? "font-semibold" : ""}`}>{item.text}</span>
                    <span className="y-micro y-fg-2 mt-0.5 block">{timeAgo(item.at)}</span>
                  </span>
                  {item.unread ? (
                    <span className="mt-2 size-2.5 flex-none rounded-full bg-(--b-fg)">
                      <span className="sr-only">Unread</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="y-small y-fg-2">
          Nothing yet. Pitches, deliveries and messages show up here as they happen.
        </p>
      )}
    </Block>
  );
}
