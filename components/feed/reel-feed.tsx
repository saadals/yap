"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useReducedMotion } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { useDemo, useHydrated } from "@/lib/store";

import type { FeedFilter, FeedItem } from "./feed-items";
import { feedFilters, feedItems, isFeedFilter, reelHref } from "./feed-items";
import { CampaignReel, OrderReel } from "./order-reel";
import type { ReelProps } from "./reel-frame";
import { VideoReel } from "./video-reel";

/** The last slot: "You're all caught up". */
const END = "end";
/** Reels fully rendered either side of the active one (the rest keep their height only). */
const WINDOW = 2;
/** Where Back returns to: this tab's active reel and filter. */
const STORAGE_KEY = "yapp-feed-v1";

type Saved = { account: string; filter: FeedFilter; reel: string | null; id: string | null };

function readSaved(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (!value || typeof value.account !== "string" || !isFeedFilter(value.filter)) return null;
    return {
      account: value.account,
      filter: value.filter,
      reel: typeof value.reel === "string" ? value.reel : null,
      id: typeof value.id === "string" ? value.id : null,
    };
  } catch {
    return null;
  }
}

function writeSaved(value: Saved) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode or storage blocked: Back just starts at the top */
  }
}

/**
 * Home: a full-height reels feed. Swipe (or scroll) up for the next reel; swipe left, tap the pill,
 * press → or Enter to act on it. Creator videos get Order; orders get Pitch or Accept.
 * `?reel=<id>` starts on one order (use `homeReelHref` after publishing). Must sit inside
 * <Suspense> (it reads the search params).
 */
export function ReelFeed() {
  const hydrated = useHydrated();
  const s = useDemo();
  const reel = useSearchParams().get("reel");
  if (!hydrated) return <FeedSkeleton />;
  // A different account (or a new ?reel) gets a fresh feed.
  return <Feed key={`${s.activeAccountId}:${reel ?? ""}`} reel={reel} />;
}

function Feed({ reel }: { reel: string | null }) {
  const s = useDemo();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const account = s.activeAccountId;

  // Coming back to the same feed (same account and ?reel): resume on the reel you left.
  const [initial] = useState(() => {
    const saved = readSaved();
    const resume = saved && saved.account === account && saved.reel === reel ? saved : null;
    return { filter: resume?.filter ?? ("for-you" as FeedFilter), id: resume?.id ?? reel ?? null };
  });
  const [filter, setFilter] = useState<FeedFilter>(initial.filter);
  const [active, setActive] = useState<{ id: string | null; index: number; since: number | null }>({
    id: initial.id,
    index: 0,
    since: null,
  });

  const items = feedItems(s, { filter, reel });
  const total = items.length;
  const found = active.id ? items.findIndex((item) => item.id === active.id) : -1;
  const activeIndex =
    active.id === END ? total : found >= 0 ? found : Math.min(active.index, total);
  const hrefs = items.map(reelHref);

  // Latest values for the observer and key handlers (set before the browser can call them).
  const latest = useRef({ account, filter, reel, activeIndex, total, hrefs, reducedMotion });
  useLayoutEffect(() => {
    latest.current = { account, filter, reel, activeIndex, total, hrefs, reducedMotion };
  });

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** Each slot registers with one IntersectionObserver; the slot ≥60% in view is the active reel. */
  const observeSlot = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
            const target = entry.target as HTMLElement;
            const id = target.dataset.reelId;
            const index = Number(target.dataset.reelIndex);
            if (!id) continue;
            const since = performance.now();
            setActive((prev) => (prev.id === id && prev.since !== null ? prev : { id, index, since }));
            const { account: who, filter: shown, reel: from } = latest.current;
            writeSaved({ account: who, filter: shown, reel: from, id });
          }
        },
        { threshold: [0.6] },
      );
    }
    const observer = observerRef.current;
    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  /** Restore the reel you left (runs once, when the scroller mounts with its slots). */
  const restoreId = initial.id;
  const attachScroller = useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      if (!node || !restoreId) return;
      const target = node.querySelector<HTMLElement>(`[data-reel-id="${CSS.escape(restoreId)}"]`);
      if (target) node.scrollTo({ top: target.offsetTop, behavior: "instant" });
    },
    [restoreId],
  );

  const go = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector<HTMLElement>(`[data-reel-index="${index}"]`);
    if (!scroller || !target) return;
    scroller.scrollTo({ top: target.offsetTop, behavior: latest.current.reducedMotion ? "instant" : "smooth" });
  }, []);

  const open = useCallback((href: string) => router.push(href), [router]);

  // Keyboard: ↑/↓ move a reel, → (← in RTL) or Enter opens it. Not while typing or in a dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog'], [role='radiogroup'], [role='slider'], [role='menu']",
        )
      )
        return;
      const { activeIndex: at, total: count, hrefs: links } = latest.current;
      const rtl = scrollerRef.current ? getComputedStyle(scrollerRef.current).direction === "rtl" : false;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        go(Math.min(at + 1, count));
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        go(Math.max(at - 1, 0));
      } else if (
        event.key === (rtl ? "ArrowLeft" : "ArrowRight") ||
        (event.key === "Enter" && (target === document.body || target === scrollerRef.current))
      ) {
        const href = links[at];
        if (!href) return;
        event.preventDefault();
        router.push(href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router]);

  const changeFilter = (next: FeedFilter) => {
    setFilter(next);
    setActive({ id: null, index: 0, since: null });
    scrollerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    writeSaved({ account, filter: next, reel, id: null });
  };

  const atEnd = activeIndex >= total;
  const announcement = total === 0 ? "" : atEnd ? "You're all caught up" : `Reel ${activeIndex + 1} of ${total}`;

  return (
    <FeedFrame>
      <h1 className="sr-only">Home</h1>
      <div className="y-reel-overlay absolute start-3 top-3 z-20">
        <SegmentedToggle options={feedFilters} value={filter} onChange={changeFilter} label="Show in your feed" />
      </div>

      <div
        ref={attachScroller}
        role="feed"
        aria-label="Reels"
        aria-busy={false}
        tabIndex={0}
        className="y-feed"
      >
        {total === 0 ? (
          <div className="y-feed-slot">
            <FeedEmpty filter={filter} />
          </div>
        ) : (
          <>
            {items.map((item, index) => (
              <div
                key={`${filter}:${item.id}`}
                ref={observeSlot}
                data-reel-id={item.id}
                data-reel-index={index}
                className="y-feed-slot"
              >
                {Math.abs(index - activeIndex) <= WINDOW ? (
                  <Reel
                    item={item}
                    active={index === activeIndex}
                    since={item.id === active.id ? active.since : null}
                    reducedMotion={reducedMotion}
                    onOpen={open}
                    position={index + 1}
                    setSize={total}
                  />
                ) : (
                  <div aria-hidden className="y-feed-placeholder" />
                )}
              </div>
            ))}
            <div
              key={`${filter}:${END}`}
              ref={observeSlot}
              data-reel-id={END}
              data-reel-index={total}
              className="y-feed-slot"
            >
              {total - activeIndex <= WINDOW ? <FeedEnd onTop={() => go(0)} /> : null}
            </div>
          </>
        )}
      </div>

      {total > 0 ? (
        <div className="absolute start-[calc(100%+16px)] top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <RoundIconButton label="Previous reel" disabled={activeIndex === 0} onClick={() => go(activeIndex - 1)}>
            <ChevronUp size={22} aria-hidden />
          </RoundIconButton>
          <RoundIconButton label="Next reel" disabled={atEnd} onClick={() => go(activeIndex + 1)}>
            <ChevronDown size={22} aria-hidden />
          </RoundIconButton>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </FeedFrame>
  );
}

function Reel(props: ReelProps<FeedItem>) {
  const { item } = props;
  if (item.kind === "video") return <VideoReel {...props} item={item} />;
  if (item.kind === "campaign") return <CampaignReel {...props} item={item} />;
  return <OrderReel {...props} item={item} />;
}

/** The reel area: below the header, above the bottom bar (mobile); a 9:16 column (desktop). */
function FeedFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-(--y-gutter) pt-2 lg:py-3">
      <div className="y-feed-col">{children}</div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <FeedFrame>
      <div aria-hidden className="y-skel h-full w-full !rounded-(--y-r-block)" />
      <p className="sr-only" role="status">
        Loading your feed
      </p>
    </FeedFrame>
  );
}

function FeedEnd({ onTop }: { onTop: () => void }) {
  return (
    <div data-tone="paper" className="y-block flex h-full flex-col items-center justify-center overflow-y-auto">
      <EmptyState
        title="You're all caught up"
        body="That's every reel for now. Explore has the full lists of orders and creators."
        shape="ball"
        tint="mint"
        face="smile"
        action={
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton href={paths.explore("orders")} variant="contrast">
                Explore orders
              </PillButton>
              <PillButton href={paths.explore("creators")} variant="outline">
                Find creators
              </PillButton>
            </div>
            <PillButton variant="ghost" size="sm" onClick={onTop}>
              Back to the top
            </PillButton>
          </div>
        }
      />
    </div>
  );
}

const emptyCopy: Record<FeedFilter, { title: string; body: string; href: string; cta: string }> = {
  "for-you": {
    title: "Nothing here yet",
    body: "New orders and creators' videos show up here as soon as they're posted.",
    href: paths.explore(),
    cta: "Explore",
  },
  orders: {
    title: "No orders right now",
    body: "New orders show up here as soon as someone posts one. Browse creators in the meantime.",
    href: paths.explore("creators"),
    cta: "Find creators",
  },
  videos: {
    title: "No videos yet",
    body: "Creators' videos show up here. Browse open orders in the meantime.",
    href: paths.explore("orders"),
    cta: "Explore orders",
  },
};

function FeedEmpty({ filter }: { filter: FeedFilter }) {
  const copy = emptyCopy[filter];
  return (
    <div data-tone="paper" className="y-block flex h-full flex-col items-center justify-center overflow-y-auto">
      <EmptyState
        title={copy.title}
        body={copy.body}
        action={
          <PillButton href={copy.href} variant="contrast">
            {copy.cta}
          </PillButton>
        }
      />
    </div>
  );
}
