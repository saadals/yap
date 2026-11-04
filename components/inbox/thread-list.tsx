"use client";

import { BriefcaseBusiness, FileText, MessageCircle, Search, X } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { FilterChip } from "@/components/ui/chip";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { stamp } from "@/lib/format";
import type { DemoState } from "@/lib/store";
import type { Role, Thread } from "@/lib/types";

import {
  type ThreadFilter,
  counterpart,
  lastMessage,
  matchesFilter,
  matchesQuery,
  previewText,
} from "./thread-meta";

const filterLabels: { id: ThreadFilter; label: string; icon?: React.ReactNode }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "commissions", label: "Commissions", icon: <BriefcaseBusiness size={16} aria-hidden /> },
  { id: "prehire", label: "Pre-hire", icon: <FileText size={16} aria-hidden /> },
];

export function ThreadList({
  s,
  role,
  threads,
  selectedId,
  query,
  onQuery,
  filter,
  onFilter,
  hrefFor,
  onPick,
}: {
  s: DemoState;
  role: Role;
  threads: Thread[];
  selectedId?: string;
  query: string;
  onQuery: (value: string) => void;
  filter: ThreadFilter;
  onFilter: (value: ThreadFilter) => void;
  hrefFor: (threadId: string) => string;
  onPick: () => void;
}) {
  const unread = threads.filter((t) => t.unread.includes(role)).length;
  const shown = threads.filter(
    (thread) => matchesFilter(thread, filter, role) && matchesQuery(s, thread, role, query),
  );
  const filtering = filter !== "all" || query.trim() !== "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 p-3 pb-2 md:p-4 md:pb-3">
        <label className="relative block">
          <span className="sr-only">Search messages</span>
          <Search
            size={18}
            aria-hidden
            className="y-fg-2 pointer-events-none absolute start-4 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={role === "business" ? "Search creators, subjects, messages" : "Search clients, subjects, messages"}
            className="y-input !min-h-12 !ps-11 !pe-11 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="y-fg-2 absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full hover:bg-(--b-bg)"
            >
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </label>
        <div className="y-scroll-x -mx-3 flex gap-1.5 px-3 md:-mx-4 md:px-4" role="group" aria-label="Filter conversations">
          {filterLabels.map((item) => (
            <FilterChip
              key={item.id}
              pressed={filter === item.id}
              onClick={() => onFilter(item.id)}
              icon={item.icon}
              count={item.id === "unread" ? unread : undefined}
              className="flex-none"
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {filtering ? `${shown.length} conversation${shown.length === 1 ? "" : "s"} shown` : ""}
      </p>

      {threads.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body={
            role === "business"
              ? "Message a creator from their profile or a pitch. Every commission also gets its own thread here."
              : "When a business messages you or hires you, the conversation shows up here."
          }
          shape="bean"
          tint="violet"
          face="smile"
          headingLevel={3}
          action={
            role === "business" ? (
              <PillButton href="/creators" variant="contrast" size="sm">
                Find creators
              </PillButton>
            ) : (
              <PillButton href="/creator/opportunities" variant="contrast" size="sm">
                Browse opportunities
              </PillButton>
            )
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title={filter === "unread" && !query ? "You're all caught up" : "Nothing matches"}
          body={
            filter === "unread" && !query
              ? "Every conversation has been read. New replies will show up here."
              : "Try another name or word, or clear the filters to see every conversation."
          }
          shape="ball"
          tint="sea"
          face={filter === "unread" && !query ? "smile" : "focus"}
          headingLevel={3}
          action={
            <PillButton
              variant="soft"
              size="sm"
              onClick={() => {
                onQuery("");
                onFilter("all");
              }}
            >
              Show all conversations
            </PillButton>
          }
        />
      ) : (
        <ul
          className="y-scroll-y flex min-h-0 flex-1 flex-col gap-1 px-2 pb-2 md:px-3 md:pb-3"
          aria-label="Conversations"
        >
          {shown.map((thread) => (
            <ThreadRow
              key={thread.id}
              s={s}
              role={role}
              thread={thread}
              selected={thread.id === selectedId}
              href={hrefFor(thread.id)}
              onPick={onPick}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ThreadRow({
  s,
  role,
  thread,
  selected,
  href,
  onPick,
}: {
  s: DemoState;
  role: Role;
  thread: Thread;
  selected: boolean;
  href: string;
  onPick: () => void;
}) {
  const other = counterpart(s, thread, role);
  const last = lastMessage(thread);
  const isUnread = thread.unread.includes(role);
  const system = last?.from === "system";

  return (
    <li>
      <Link
        href={href}
        scroll={false}
        onClick={onPick}
        aria-current={selected ? "true" : undefined}
        data-tone={selected ? "night" : undefined}
        className={`flex min-h-[76px] items-start gap-3 rounded-(--y-r-tile) p-3 transition-colors ${
          selected ? "bg-(--b-bg) text-(--b-fg)" : "hover:bg-(--b-chip)"
        }`}
      >
        <span className="relative mt-0.5 flex-none">
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
            <span className={`y-small truncate ${isUnread ? "font-bold" : "font-semibold"}`}>
              {other.name}
            </span>
            <span
              className={`y-micro y-num flex-none ${isUnread ? "font-bold" : "y-fg-3"}`}
            >
              {last ? stamp(last.at) : ""}
            </span>
          </span>
          <span className={`y-micro truncate ${isUnread ? "font-semibold" : "y-fg-2"}`}>
            {thread.commissionId ? (
              <BriefcaseBusiness size={12} aria-hidden className="me-1 inline -mt-0.5" />
            ) : (
              <FileText size={12} aria-hidden className="me-1 inline -mt-0.5" />
            )}
            {thread.subject}
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`y-small min-w-0 flex-1 truncate ${
                isUnread ? "font-medium" : "y-fg-2"
              } ${system ? "italic" : ""}`}
            >
              {previewText(last, role)}
            </span>
            {isUnread ? (
              <span className="flex flex-none items-center">
                <span aria-hidden className="size-2.5 rounded-full bg-(--b-fg)" />
                <span className="sr-only">Unread</span>
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ThreadListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3 md:p-4" aria-hidden>
      <Skeleton className="h-12 w-full !rounded-full" />
      <div className="flex gap-1.5">
        <Skeleton className="h-10 w-14 !rounded-full" />
        <Skeleton className="h-10 w-24 !rounded-full" />
        <Skeleton className="h-10 w-28 !rounded-full" />
      </div>
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="flex items-center gap-3 p-1">
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
