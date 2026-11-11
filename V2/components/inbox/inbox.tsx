"use client";

import "@/app/styles/inbox.css";

import { MessagesSquare, SearchX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { NotificationList } from "@/components/shell/notifications-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Tabs } from "@/components/ui/tabs";
import { useMediaQuery } from "@/lib/hooks";
import { useMode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { me, myThreads, sideOf, threadById, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { Conversation, ConversationSkeleton } from "./conversation";
import type { ThreadFilter } from "./thread-meta";
import { ThreadList, ThreadListSkeleton } from "./thread-list";

type InboxTab = "messages" | "alerts";

/**
 * /messages, the Inbox: Messages and Alerts (`?tab=alerts`) for the whole account, both modes
 * (conversations are about people, not modes; each one opens from your side of it). Desktop shows
 * the list and the open conversation side by side, and opens the first unread one by default.
 * Phones show the list, then the conversation full screen with Back. The open conversation lives
 * in the URL (`?thread=`).
 *
 * Uses `useSearchParams`, so render it inside <Suspense>.
 */
export function Inbox() {
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const mode = useMode(me.account(s), pathname);
  const [filter, setFilter] = useState<ThreadFilter>("all");

  const tab: InboxTab = params.get("tab") === "alerts" ? "alerts" : "messages";
  const items = myThreads(s);
  const paramId = params.get("thread") ?? undefined;
  const fallbackId = (items.find((item) => item.thread.unread.includes(item.side)) ?? items[0])?.thread.id;

  // Desktop with nothing selected: pin the default conversation in the URL first, so opening it
  // (which marks it read) can't move the default to another thread mid-render.
  useEffect(() => {
    if (!hydrated || !desktop || tab !== "messages" || paramId || !fallbackId) return;
    router.replace(paths.messages(fallbackId), { scroll: false });
  }, [hydrated, desktop, tab, paramId, fallbackId, router]);

  const found = paramId ? threadById(s, paramId) : undefined;
  const side = found ? sideOf(s, found) : undefined;
  const thread = side ? found : undefined;
  const open = tab === "messages" && Boolean(paramId);
  // Side filters and "You ordered / You're making" labels only when there are conversations on both
  // sides: one side only would put the same label on every row.
  const showSide = new Set(items.map((item) => item.side)).size > 1;
  const unreadThreads = hydrated ? unreadThreadCount(s) : 0;
  const unreadAlerts = hydrated ? unreadNotificationCount(s) : 0;

  return (
    <AppShell detail={open}>
      <Page>
        <div className={open ? "max-lg:hidden" : ""}>
          <PageHeader title="Inbox" className="!pb-3" />
          <Tabs<InboxTab>
            label="Inbox"
            value={tab}
            className="mb-4"
            items={[
              { id: "messages", label: "Messages", count: unreadThreads || undefined, href: paths.messages() },
              { id: "alerts", label: "Alerts", count: unreadAlerts || undefined, href: paths.alerts },
            ]}
          />
        </div>

        {tab === "alerts" ? (
          <div className="max-w-[760px]">{hydrated ? <NotificationList card /> : <ThreadListSkeleton />}</div>
        ) : (
          <div className="y-inbox" data-open={open ? "true" : undefined}>
            <div className="y-inbox-list">
              {hydrated ? (
                <ThreadList
                  s={s}
                  items={items}
                  showSide={showSide}
                  selectedId={paramId}
                  filter={filter}
                  onFilter={setFilter}
                  mode={mode}
                />
              ) : (
                <ThreadListSkeleton />
              )}
            </div>
            <div className="y-inbox-pane">
              {!hydrated ? (
                <ConversationSkeleton />
              ) : thread && side ? (
                <Conversation s={s} side={side} showSide={showSide} thread={thread} />
              ) : paramId ? (
                <EmptyState
                  title="Conversation not found"
                  body="It may belong to another account, or the link is from another browser's demo data."
                  icon={<SearchX size={22} />}
                  className="my-auto"
                  action={
                    <PillButton href={paths.messages()} variant="contrast" size="sm">
                      Back to messages
                    </PillButton>
                  }
                />
              ) : (
                <div className="y-fg-2 flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <MessagesSquare size={28} aria-hidden />
                  <p className="y-small max-w-[32ch]">
                    {items.length
                      ? "Pick a conversation to read it here."
                      : "Messages about your orders and jobs will appear here. Feedback on a delivered video lives in its comments."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Page>
    </AppShell>
  );
}

/** Suspense fallback for /messages. */
export function InboxFallback() {
  return (
    <AppShell>
      <Page>
        <PageHeader title="Inbox" className="!pb-3" />
        <div className="y-inbox">
          <div className="y-inbox-list">
            <ThreadListSkeleton />
          </div>
          <div className="y-inbox-pane max-lg:!hidden">
            <ConversationSkeleton />
          </div>
        </div>
      </Page>
    </AppShell>
  );
}
