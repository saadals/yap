"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { useMediaQuery } from "@/lib/hooks";
import { threadById, threadsFor } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";
import type { Role } from "@/lib/types";

import { Conversation, ConversationSkeleton } from "./conversation";
import type { ThreadFilter } from "./thread-meta";
import { ThreadList, ThreadListSkeleton } from "./thread-list";

/**
 * Two-pane inbox shared by both roles. The open conversation lives in the URL (`?thread=<id>`):
 * on mobile the list and the conversation are separate views; on desktop they sit side by side
 * and the first unread (or most recent) conversation opens by default.
 *
 * Uses `useSearchParams`, so render it inside <Suspense>.
 */
export function Inbox({ role }: { role: Role }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ThreadFilter>("all");

  const threads = threadsFor(s, role);
  const paramId = params.get("thread") ?? undefined;
  const fallbackId = (threads.find((t) => t.unread.includes(role)) ?? threads[0])?.id;

  // Desktop with nothing selected: pin the default conversation in the URL first, so opening it
  // (which marks it read) can't shift the default to a different thread mid-render.
  useEffect(() => {
    if (!hydrated || !desktop || paramId || !fallbackId) return;
    router.replace(`${pathname}?thread=${fallbackId}`, { scroll: false });
  }, [hydrated, desktop, paramId, fallbackId, pathname, router]);

  const found = paramId ? threadById(s, paramId) : undefined;
  const mine =
    found &&
    (role === "business" ? found.businessId === ME.businessId : found.creatorId === ME.creatorId);
  const thread = mine ? found : undefined;
  const showConversation = Boolean(paramId);
  const hrefFor = (id: string) => `${pathname}?thread=${id}`;

  const onPick = () => {
    if (!window.matchMedia("(min-width: 1024px)").matches) window.scrollTo({ top: 0 });
  };

  return (
    <>
      <PageHeader title="Messages" className={showConversation ? "max-lg:sr-only" : ""} />

      <div className="grid grid-cols-1 gap-2 lg:h-[calc(100dvh-196px)] lg:min-h-[600px] lg:grid-cols-12">
        <Block
          tone="paper"
          pad="none"
          className={`flex-col overflow-hidden lg:col-span-4 lg:flex ${showConversation ? "hidden" : "flex"}`}
        >
          {hydrated ? (
            <ThreadList
              s={s}
              role={role}
              threads={threads}
              selectedId={paramId}
              query={query}
              onQuery={setQuery}
              filter={filter}
              onFilter={setFilter}
              hrefFor={hrefFor}
              onPick={onPick}
            />
          ) : (
            <ThreadListSkeleton />
          )}
        </Block>

        <Block
          tone="paper"
          pad="md"
          className={`min-h-0 flex-col lg:col-span-8 lg:flex ${showConversation ? "flex" : "hidden"}`}
        >
          {!hydrated ? (
            <ConversationSkeleton />
          ) : thread ? (
            <Conversation
              s={s}
              role={role}
              thread={thread}
              backHref={pathname}
              maxHeight={desktop ? "none" : "max(300px, calc(100dvh - 360px))"}
            />
          ) : paramId ? (
            <EmptyState
              title="Conversation not found"
              body="It may have been removed, or the link is from another browser's demo data."
              shape="gem"
              tint="coral"
              face="wow"
              className="my-auto"
              action={
                <PillButton href={pathname} variant="contrast" size="sm">
                  Back to messages
                </PillButton>
              }
            />
          ) : threads.length === 0 ? (
            <EmptyState
              title="Your conversations will appear here"
              body={
                role === "business"
                  ? "Start one from a creator's profile, or wait for pitches on your requests."
                  : "Pitch on an opportunity and the client can reply here."
              }
              shape="pill"
              tint="sun"
              face="calm"
              className="my-auto"
            />
          ) : (
            <ConversationSkeleton />
          )}
        </Block>
      </div>
    </>
  );
}

/** Suspense fallback for pages that render <Inbox>. */
export function InboxFallback() {
  return (
    <>
      <PageHeader title="Messages" />
      <div className="grid grid-cols-1 gap-2 lg:h-[calc(100dvh-196px)] lg:min-h-[600px] lg:grid-cols-12">
        <Block tone="paper" pad="none" className="lg:col-span-4">
          <ThreadListSkeleton />
        </Block>
        <Block tone="paper" pad="md" className="hidden flex-col lg:col-span-8 lg:flex">
          <ConversationSkeleton />
        </Block>
      </div>
    </>
  );
}
