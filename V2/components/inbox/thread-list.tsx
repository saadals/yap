"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { stamp } from "@/lib/format";
import type { Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import type { DemoState } from "@/lib/store";
import type { Role, Thread } from "@/lib/types";

import {
  type ThreadFilter,
  type ThreadItem,
  counterpart,
  lastMessage,
  matchesFilter,
  previewText,
  sideLabel,
  threadContext,
} from "./thread-meta";

/**
 * The conversation list: filter chips (All · Unread, plus Ordering · Studio for accounts that do
 * both), then one row per conversation: who, the last message, when, an unread dot, and a quiet
 * line saying what it's about.
 */
export function ThreadList({
  s,
  items,
  showSide,
  selectedId,
  filter,
  onFilter,
  mode,
}: {
  s: DemoState;
  items: ThreadItem[];
  /** Offer the side filters and label rows with your side (accounts that order and make). */
  showSide: boolean;
  selectedId?: string;
  filter: ThreadFilter;
  onFilter: (value: ThreadFilter) => void;
  /** The mode this tab is in, for the empty state's next step. */
  mode: Mode;
}) {
  const unread = items.filter(({ thread, side }) => thread.unread.includes(side)).length;
  const shown = items.filter(({ thread, side }) => matchesFilter(thread, filter, side));
  const filters: { id: ThreadFilter; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread", count: unread || undefined },
    ...(showSide
      ? [
          { id: "order" as const, label: "Ordering" },
          { id: "studio" as const, label: "Studio" },
        ]
      : []),
  ];

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your conversations will appear here"
        body={
          mode === "studio"
            ? "Pitch on a brief or take a campaign slot. Every job gets its own conversation."
            : "Message a creator from their profile, or place an order. Every job gets its own conversation."
        }
        shape="bean"
        tint="violet"
        face="smile"
        headingLevel={3}
        action={
          <PillButton href={mode === "studio" ? paths.findWork() : paths.discover()} variant="contrast" size="sm">
            {mode === "studio" ? "Find work" : "Find creators"}
          </PillButton>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="y-scroll-x flex flex-none gap-1.5 px-3 py-3 md:px-4" role="group" aria-label="Filter conversations">
        {filters.map((item) => (
          <FilterChip
            key={item.id}
            pressed={filter === item.id}
            onClick={() => onFilter(item.id)}
            count={item.count}
            className="y-inbox-chip flex-none"
          >
            {item.label}
          </FilterChip>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {filter !== "all" ? `${shown.length} conversation${shown.length === 1 ? "" : "s"} shown` : ""}
      </p>

      {shown.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "You're all caught up" : "Nothing here yet"}
          body={
            filter === "unread"
              ? "Every conversation has been read. New replies will show up here."
              : filter === "studio"
                ? "Conversations about videos you make will show up here."
                : "Conversations about videos you order will show up here."
          }
          shape="ball"
          tint="sea"
          face={filter === "unread" ? "smile" : "focus"}
          headingLevel={3}
          action={
            <PillButton variant="soft" size="sm" onClick={() => onFilter("all")}>
              Show all conversations
            </PillButton>
          }
        />
      ) : (
        <ul className="y-scroll-y min-h-0 flex-1" aria-label="Conversations">
          {shown.map(({ thread, side }) => (
            <ThreadRow
              key={thread.id}
              s={s}
              side={side}
              showSide={showSide}
              thread={thread}
              selected={thread.id === selectedId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ThreadRow({
  s,
  side,
  showSide,
  thread,
  selected,
}: {
  s: DemoState;
  side: Role;
  showSide: boolean;
  thread: Thread;
  selected: boolean;
}) {
  const other = counterpart(s, thread, side);
  const last = lastMessage(thread);
  const isUnread = thread.unread.includes(side);
  const context = threadContext(s, side, thread);
  const about = [showSide ? sideLabel(side) : null, context?.kind ?? thread.subject].filter(Boolean).join(" · ");

  return (
    <li className="y-inbox-rowwrap">
      <Link
        href={paths.messages(thread.id)}
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className="y-inbox-row"
      >
        <span className="relative flex-none">
          {other.kind === "creator" ? (
            <FaceAvatar id={thread.creatorId} name="" size={44} />
          ) : other.business ? (
            <BusinessLogo business={other.business} size={44} />
          ) : (
            <span className="y-tile grid size-11 place-items-center !rounded-full" aria-hidden>
              <MessageCircle size={18} />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate ${isUnread ? "font-semibold" : "font-medium"}`}>{other.name}</span>
            <span className={`y-micro y-num flex-none ${isUnread ? "font-semibold" : "y-fg-2"}`}>
              {last ? stamp(last.at) : ""}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className={`y-small min-w-0 flex-1 truncate ${isUnread ? "font-medium" : "y-fg-2"}`}>
              {previewText(last, side)}
            </span>
            {isUnread ? (
              <span className="flex flex-none items-center">
                <span aria-hidden className="size-2 rounded-full bg-(--y-ink)" />
                <span className="sr-only">Unread</span>
              </span>
            ) : null}
          </span>
          <span className="y-micro y-fg-2 truncate">{about}</span>
        </span>
      </Link>
    </li>
  );
}

export function ThreadListSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-hidden>
      <div className="flex gap-1.5">
        <Skeleton className="h-9 w-14 !rounded-full" />
        <Skeleton className="h-9 w-24 !rounded-full" />
      </div>
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-11 !rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
