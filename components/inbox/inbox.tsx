"use client";

import { MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { useMediaQuery } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { me, myThreads, sideOf, threadById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { Conversation, ConversationSkeleton } from "./conversation";
import type { ThreadFilter } from "./thread-meta";
import { ThreadList, ThreadListSkeleton } from "./thread-list";

/**
 * One two-pane inbox for both sides of the account: work it ordered and work it's making. Each
 * conversation opens from the side the account is on in it. The open conversation lives in the
 * URL (`?thread=<id>`): on mobile the list and the conversation are separate views; on desktop
 * they sit side by side and the first unread (or most recent) conversation opens by default.
 * Conversations only: notifications are the Alerts page (`/alerts`) on phones and the bell on
 * desktop (round 3 answers, item 19).
 *
 * Uses `useSearchParams`, so render it inside <Suspense>.
 */
export function Inbox() {
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ThreadFilter>("all");

  const items = myThreads(s);
  const paramId = params.get("thread") ?? undefined;
  const fallbackId = (
    items.find((item) => item.thread.unread.includes(item.side)) ?? items[0]
  )?.thread.id;

  // Desktop with nothing selected: pin the default conversation in the URL first, so opening it
  // (which marks it read) can't shift the default to a different thread mid-render.
  useEffect(() => {
    if (!hydrated || !desktop || paramId || !fallbackId) return;
    router.replace(paths.messages(fallbackId), { scroll: false });
  }, [hydrated, desktop, paramId, fallbackId, router]);

  const found = paramId ? threadById(s, paramId) : undefined;
  const side = found ? sideOf(s, found) : undefined;
  const thread = side ? found : undefined;
  const showConversation = Boolean(paramId);
  // Labels say which side you're on, for accounts that can be on both.
  const showSide = Boolean(me.creator(s));

  const onPick = () => {
    if (!window.matchMedia("(min-width: 1024px)").matches)
      window.scrollTo({ top: 0 });
  };

  return (
    <>
      <PageHeader
        title="Messages"
        className={showConversation ? "max-lg:sr-only" : ""}
      />

      <div className="grid grid-cols-1 gap-2 lg:h-[calc(100dvh-196px)] lg:min-h-[600px] lg:grid-cols-12">
        <Block
          tone="paper"
          pad="none"
          className={`flex-col overflow-hidden lg:col-span-4 lg:flex ${showConversation ? "hidden" : "flex"}`}
        >
          {hydrated ? (
            <ThreadList
              s={s}
              items={items}
              showSide={showSide}
              selectedId={paramId}
              query={query}
              onQuery={setQuery}
              filter={filter}
              onFilter={setFilter}
              hrefFor={paths.messages}
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
          ) : thread && side ? (
            <Conversation
              s={s}
              side={side}
              showSide={showSide}
              thread={thread}
              backHref={paths.messages()}
              maxHeight={desktop ? "none" : "max(300px, calc(100dvh - 360px))"}
            />
          ) : paramId ? (
            <EmptyState
              title="Conversation not found"
              body="It may belong to another account, or the link is from another browser's demo data."
              className="my-auto"
              action={
                <PillButton
                  href={paths.messages()}
                  variant="contrast"
                  size="sm"
                >
                  Back to messages
                </PillButton>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Your conversations will appear here"
              body="Message a creator from their profile, or take on an order. Every commission gets its own thread."
              icon={<MessageCircle size={22} aria-hidden />}
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
        <Block
          tone="paper"
          pad="md"
          className="hidden flex-col lg:col-span-8 lg:flex"
        >
          <ConversationSkeleton />
        </Block>
      </div>
    </>
  );
}
