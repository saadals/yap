"use client";

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Lockup } from "@/components/ui/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useReducedMotion } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { isPreviewMode } from "@/lib/preview";
import { useDemo, useHydrated } from "@/lib/store";

import { CreateSheet } from "./create-sheet";
import type { FeedFilter, FeedItem, ReelTone } from "./feed-items";
import { feedFilters, feedItemById, feedItems, isFeedFilter, reelTone } from "./feed-items";
import { CampaignReel, OrderReel } from "./order-reel";
import { ReelDetails } from "./reel-details";
import type { ReelProps } from "./reel-frame";
import { VideoReel } from "./video-reel";

/** The last slot: "You're all caught up". */
const END = "end";
/** Reels fully rendered either side of the active one (the rest keep their height only). */
const WINDOW = 2;
/** Where Back returns to: this tab's active reel and filter. */
const STORAGE_KEY = "yapp-feed-v1";
/** The one-time "Swipe left for details" hint (cleared by Reset, like the other `yapp-` keys). */
const HINT_KEY = "yapp-feed-hint-v1";

type Saved = { account: string; filter: FeedFilter; reel: string | null; id: string | null };

// The read-only preview (/app-preview, framed on Discover) never reads or writes the visitor's
// storage: it starts at the top every time and always shows the hint.
function readSaved(): Saved | null {
  if (isPreviewMode()) return null;
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
  if (isPreviewMode()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode or storage blocked: Back just starts at the top */
  }
}

function hintSeen(): boolean {
  if (isPreviewMode()) return false;
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

function markHintSeen() {
  if (isPreviewMode()) return;
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* storage blocked: the hint just shows again next time */
  }
}

/**
 * Home: the reels feed. Swipe (or scroll) up for the next reel; swipe left, tap the pill, press →
 * or Enter for its details layer. Creator videos get Order; custom orders get Pitch; campaigns get
 * Pick now. `?reel=<id>` starts on one order (use `homeReelHref` after publishing); `?details=<id>`
 * has that reel's details open. Must sit inside <Suspense> (it reads the search params).
 */
export function ReelFeed() {
  const hydrated = useHydrated();
  const s = useDemo();
  const params = useSearchParams();
  const reel = params.get("reel");
  const details = params.get("details");
  if (!hydrated) return <FeedSkeleton />;
  // A different account (or a new ?reel) gets a fresh feed. Opening details must not remount it.
  return <Feed key={`${s.activeAccountId}:${reel ?? ""}`} reel={reel} detailsId={details} />;
}

function Feed({ reel, detailsId }: { reel: string | null; detailsId: string | null }) {
  const s = useDemo();
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
  const ids = items.map((item) => item.id);
  const details = detailsId ? feedItemById(s, detailsId) : undefined;
  const detailsOpen = Boolean(details);
  const current = items[activeIndex];
  const tone: ReelTone = detailsOpen || !current ? "page" : reelTone(current);

  // Latest values for the observer and key handlers (set before the browser can call them).
  const latest = useRef({ account, filter, reel, activeIndex, total, ids, reducedMotion, detailsOpen });
  useLayoutEffect(() => {
    latest.current = { account, filter, reel, activeIndex, total, ids, reducedMotion, detailsOpen };
  });

  // What floats over the reels (logo, tabs, "+", the tab bar outside the feed) follows the reel.
  // A layout effect, so the first frame already shows the right logo file over a dark video.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (tone === "page") delete root.dataset.reelTone;
    else root.dataset.reelTone = tone;
    return () => {
      delete root.dataset.reelTone;
    };
  }, [tone]);

  const [hint, setHint] = useState(() => !hintSeen());
  useEffect(() => {
    if (!hint) return;
    markHintSeen();
    const timer = window.setTimeout(() => setHint(false), 2800);
    return () => window.clearTimeout(timer);
  }, [hint]);

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

  // Details live in the URL (`?details=<id>`) so the phone's Back gesture closes them. Next keeps
  // useSearchParams in step with pushState without navigating, so the feed stays mounted.
  const openedHere = useRef(false);
  const open = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("details", id);
    window.history.pushState(null, "", url.search);
    openedHere.current = true;
  }, []);
  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
      return;
    }
    // Arrived with details already open (a reload or a shared link): nothing to go back to.
    const url = new URL(window.location.href);
    url.searchParams.delete("details");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  const restoreFocus = useCallback(() => {
    scrollerRef.current?.focus({ preventScroll: true });
  }, []);

  // Keyboard: ↑/↓ move a reel, → (← in RTL) or Enter opens it, Esc closes details. Not while
  // typing or in a dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (latest.current.detailsOpen) {
        if (event.key === "Escape") close();
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog'], [role='radiogroup'], [role='slider'], [role='menu'], [role='tablist']",
        )
      )
        return;
      const { activeIndex: at, total: count, ids: reels } = latest.current;
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
        const id = reels[at];
        if (!id) return;
        event.preventDefault();
        open(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, open, close]);

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

      <div
        ref={attachScroller}
        role="feed"
        aria-label="Reels"
        aria-busy={false}
        tabIndex={0}
        inert={detailsOpen}
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

      <span aria-hidden className="y-reel-fade" data-edge="top" />
      <span aria-hidden className="y-reel-fade" data-edge="bottom" />
      {detailsOpen ? null : <FeedTabs value={filter} onChange={changeFilter} />}
      {hint && total > 0 && !detailsOpen ? (
        <p aria-hidden className="y-reel-hint">
          Swipe left for details
        </p>
      ) : null}
      {details ? <ReelDetails item={details} onClose={close} restoreFocus={restoreFocus} /> : null}
      <FloatingTop />

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

/** The reel area: the whole screen on phones, a 9:16 column under the header from 1024px. */
function FeedFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:px-(--y-gutter) lg:py-3">
      <div className="y-feed-col">{children}</div>
    </div>
  );
}

/** No top bar on phones: the logo and "+" float over the reel. Hidden from 1024px. */
function FloatingTop() {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="y-reel-top">
      <Link href={paths.home} className="y-reel-logo" aria-label="Yapping home">
        <Lockup size={28} />
      </Link>
      <button
        type="button"
        className="y-reel-plus"
        aria-label="Create: new order or find work"
        aria-haspopup="dialog"
        onClick={() => setCreateOpen(true)}
      >
        <Plus size={18} strokeWidth={2.6} aria-hidden />
      </button>
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

/** Mix · Yapps · Orders: plain text stacked at the top end. */
function FeedTabs({ value, onChange }: { value: FeedFilter; onChange: (next: FeedFilter) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + feedFilters.length) % feedFilters.length;
    onChange(feedFilters[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label="Show in your feed" aria-orientation="vertical" className="y-reel-tabs">
      {feedFilters.map((filter, index) => {
        const selected = filter.value === value;
        return (
          <button
            key={filter.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(filter.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <FeedFrame>
      <div aria-hidden className="y-skel y-feed-fill h-full w-full !rounded-none lg:!rounded-(--y-r-block)" />
      <p className="sr-only" role="status">
        Loading your feed
      </p>
    </FeedFrame>
  );
}

function FeedEnd({ onTop }: { onTop: () => void }) {
  return (
    <div data-tone="paper" className="y-block y-feed-fill flex h-full flex-col items-center justify-center overflow-y-auto">
      <EmptyState
        title="You're all caught up"
        body="That's every reel for now. Discover has the full lists of orders and creators."
        shape="ball"
        tint="mint"
        face="smile"
        action={
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton href={paths.explore("orders")} variant="contrast">
                Discover orders
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
    cta: "Discover",
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
    cta: "Discover orders",
  },
};

function FeedEmpty({ filter }: { filter: FeedFilter }) {
  const copy = emptyCopy[filter];
  return (
    <div data-tone="paper" className="y-block y-feed-fill flex h-full flex-col items-center justify-center overflow-y-auto">
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
